import { openSnapshotDatabase } from './bookshelf-storage-snapshot.js';

let sequence = 0;
const pending = new Map();
self.addEventListener('message', ({ data }) => {
  if (!data.hostReply) return;
  const request = pending.get(data.hostReply); if (!request) return;
  pending.delete(data.hostReply);
  if (data.error) request.reject(Object.assign(new Error(data.error), { name: data.errorName }));
  else request.resolve(data.value);
});
function request(method, args = []) {
  return new Promise((resolve, reject) => {
    const hostRequest = ++sequence; pending.set(hostRequest, { resolve, reject });
    self.postMessage({ hostRequest, method, args });
  });
}
export async function openBridgedLibraryStorage() {
  const database = await openSnapshotDatabase({ read: () => request('readDatabase'), write: bytes => request('writeDatabase', [bytes]), release: () => request('close') });
  return { database, files: {
    read: path => request('read', [path]), write: (path, bytes) => request('write', [path, bytes]), remove: path => request('remove', [path]),
  } };
}
