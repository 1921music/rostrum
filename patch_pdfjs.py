"""Apply Rostrum's page-first integration to the vendored PDF.js 4.10.38."""
from pathlib import Path


FLAT_PAGE_LOOKUP = """
  async rostrumReadFlatPage(index, kids = this.rostrumFlatKids) {
    const ref = kids?.[index];
    const root = this._catDict.getRaw("Pages");
    if (!(ref instanceof Ref) || !(root instanceof Ref)) return null;
    const page = await this.xref.fetchAsync(ref);
    if (!(page instanceof Dict) || !isName(page.getRaw("Type"), "Page")) return null;
    const parent = page.getRaw("Parent");
    if (!(parent instanceof Ref) || parent.num !== root.num || parent.gen !== root.gen) return null;
    this.pageKidsCountCache.put(ref, 1);
    this.pageIndexCache.put(ref, index);
    return [page, ref];
  }

  async rostrumPrimePage(index) {
    const top = this.toplevelPagesDict;
    const kids = await top.getAsync("Kids");
    const count = await top.getAsync("Count");
    // A flat page tree has one leaf per entry, with no intermediate nodes.
    // Keep PDF.js's normal checks and traversal when the shape is uncertain.
    if (!Number.isInteger(count) || !Array.isArray(kids) || kids.length !== count ||
        !kids.every(ref => ref instanceof Ref) || new Set(kids.map(ref => ref.toString())).size !== count) return false;
    if (!await this.rostrumReadFlatPage(index < count ? index : 0, kids)) return false;
    this.rostrumFlatKids = kids;
    return true;
  }

  async getPageDict(e){
    if (this.rostrumFlatKids) {
      const page = await this.rostrumReadFlatPage(e);
      if (page) return page;
    }
"""


def apply(name, marker, replacements):
    path = Path(__file__).with_name('lib') / name
    source = path.read_text(encoding='utf-8')
    if marker in source:
        return
    if '"4.10.38"' not in source:
        raise ValueError(f'Unexpected PDF.js version in {name}')
    for before, after in replacements:
        if source.count(before) != 1:
            raise ValueError(f'Unexpected PDF.js code in {name}: {before}')
        source = source.replace(before, after)
    path.write_text(source, encoding='utf-8', newline='\n')


if __name__ == '__main__':
    apply('pdf.min.mjs', 'rostrumInitialPage:', [
        ('docBaseUrl:p,enableXfa:T,', 'docBaseUrl:p,rostrumInitialPage:t.rostrumInitialPage,enableXfa:T,'),
        ('get numPages(){return this._pdfInfo.numPages}',
         'get numPages(){return this._pdfInfo.numPages}\n'
         'get rostrumPageFirst(){return !!this._pdfInfo.rostrumPageFirst}\n'
         'finishRostrumPageFirst(){return this._transport.messageHandler.sendWithPromise("RostrumDeferredChecks",null)}\n'),
    ])
    apply('pdf.worker.min.mjs', 'async rostrumPrimePage(', [
        ('async getPageDict(e){', FLAT_PAGE_LOOKUP),
        ('await i.ensureDoc("checkFirstPage",[e]);await i.ensureDoc("checkLastPage",[e]);',
         '\nconst rostrumPageFirst = !e && Number.isInteger(rostrumInitialPage) && rostrumInitialPage >= 0 && '
         'await i.ensureCatalog("rostrumPrimePage",[rostrumInitialPage]);\n'
         'if (!rostrumPageFirst) { await i.ensureDoc("checkFirstPage",[e]); await i.ensureDoc("checkLastPage",[e]); }\n'),
        ('{docId:g,apiVersion:o}=e,c="4.10.38"', '{docId:g,apiVersion:o,rostrumInitialPage}=e,c="4.10.38"'),
        ('return{numPages:a,fingerprints:s,htmlForXfa:', 'return{numPages:a,rostrumPageFirst,fingerprints:s,htmlForXfa:'),
        ('l.on("GetPage",(function(e){',
         '\nl.on("RostrumDeferredChecks",async()=>{await i.ensureDoc("checkFirstPage",[false]);'
         'await i.ensureDoc("checkLastPage",[false]);});\nl.on("GetPage",(function(e){'),
    ])
