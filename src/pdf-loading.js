// +skip
export { PdfRangeSource, normalizePdfLoading, pdfLoadingFor, pdfCloudServices, pdfLoadingUnits };
// -skip

const pdfCloudServices = ['pCloud', 'Drive', 'Dropbox', 'OneDrive'];
const pdfLoadingUnits = [64, 128, 256, 512, 1024, 2048, 4096];

function normalizePdfLoading(value = {}) {
  const policy = (value, fallback) => ({
    mode: ['whole', 'page'].includes(value?.mode) ? value.mode : fallback.mode,
    chunkKiB: pdfLoadingUnits.includes(value?.chunkKiB) ? value.chunkKiB : fallback.chunkKiB,
  });
  const local = policy(value?.local, {mode:'whole', chunkKiB:256});
  const cloud = policy(value?.cloud, {mode:'page', chunkKiB:256});
  const services = {};
  for (const name of pdfCloudServices) {
    const override = value?.services?.[name];
    if (['whole', 'page'].includes(override?.mode)) services[name] = policy(override, cloud);
  }
  return {local, cloud, services, resumePage:value?.resumePage !== false};
}

function pdfLoadingFor(source = null) {
  const settings = window._viewState_?.pdfLoading || normalizePdfLoading();
  return source ? settings.services[source] || settings.cloud : settings.local;
}

class PdfRangeSource {
  constructor(size, chunkSize, read, abort, initialData = new Uint8Array()) {
    Object.assign(this, {size, chunkSize, read, abort, initialData});
  }

  static local(file, chunkKiB) {
    return new PdfRangeSource(file.size, chunkKiB * 1024, (begin, end) => file.slice(begin,end).arrayBuffer());
  }

  static async remote(request, size, chunkKiB, pinned = false) {
    if (!Number.isSafeInteger(size) || size <= 0) return null;
    const chunkSize = chunkKiB * 1024;
    const ctrl = new AbortController();
    const responseFor = (begin, end) => request(`bytes=${begin}-${end - 1}`, ctrl.signal);
    const matches = (response, begin, end) => response.status === 206 &&
      response.headers.get('Content-Range') === `bytes ${begin}-${end - 1}/${size}`;
    const firstEnd = Math.min(size, chunkSize);
    try {
      const first = await responseFor(0, firstEnd);
      // Some providers return the complete file for a Range request.
      if (first.status === 200) return first.arrayBuffer();
      const etag = first.headers.get('ETag');
      if (!matches(first,0,firstEnd) || (!pinned && (!etag || etag.startsWith('W/')))) {
        ctrl.abort();
        return null;
      }
      const initial = await first.arrayBuffer();
      if (initial.byteLength !== firstEnd) return null;
      return new PdfRangeSource(size,chunkSize,async (begin,end) => {
        const response = await responseFor(begin,end);
        if (!matches(response,begin,end) || (etag && response.headers.get('ETag') !== etag)) {
          ctrl.abort();
          throw new Error('The cloud PDF changed or stopped serving byte ranges. Reopen it to retry.');
        }
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength !== end - begin) throw new Error('The cloud PDF range is incomplete.');
        return bytes;
      },() => ctrl.abort(),new Uint8Array(initial));
    } catch (error) {
      ctrl.abort();
      return null;
    }
  }
}
