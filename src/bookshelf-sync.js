// +skip
export { exchangeLibraryPackages };
// -skip

// Transport contract: immutable packages, list()->[{id}], read(id)->Blob,
// write(id, Blob). Never overwrite a shared "latest.zip": simultaneous uploads
// must survive even without provider-specific conditional-write APIs.
async function exchangeLibraryPackages(store, transport) {
  if (!transport?.id || !['list', 'read', 'write'].every(method => typeof transport[method] === 'function')) throw new Error('Invalid library sync transport');
  const key = 'sync-packages:' + transport.id;
  const seen = new Set(await store.call('localState', { key }) || []);
  let imported = 0;
  const remote = await transport.list();
  for (const item of remote) {
    if (typeof item.id !== 'string' || !item.id) throw new Error('Invalid remote package identity');
    if (seen.has(item.id)) continue;
    const file = await transport.read(item.id);
    if (!(file instanceof Blob)) throw new Error('Sync transport must return a library package');
    await store.importBackup(file);
    seen.add(item.id); imported++;
    await store.call('localState', { key, value: [...seen] });
  }
  const publishedKey = 'sync-published:' + transport.id;
  const revisions = await store.call('changeIds');
  const published = await store.call('localState', { key: publishedKey });
  // The same provider/path may now belong to another account, or the previous
  // package may have been removed. Only skip when our snapshot is still there.
  if (published?.slice(1).join() === revisions.join() && remote.some(item => item.id === published[0])) {
    return { importedPackages: imported, uploadedPackage: null, conflicts: (await store.call('conflicts')).length };
  }
  const id = crypto.randomUUID();
  await transport.write(id, await store.exportBackup());
  seen.add(id);
  await store.call('localState', { key, value: [...seen] });
  await store.call('localState', { key: publishedKey, value: [id, ...revisions] });
  return { importedPackages: imported, uploadedPackage: id, conflicts: (await store.call('conflicts')).length };
}
