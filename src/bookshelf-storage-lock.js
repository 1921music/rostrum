export async function holdLibraryLock(name) {
  if (!navigator.locks) throw new Error('This storage backend requires browser locking support.');
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await new Promise((resolve, reject) => {
    navigator.locks.request(name, { ifAvailable: true }, async lock => {
      if (!lock) { reject(new Error('This library is already open in another tab.')); return; }
      resolve(); await held;
    }).catch(reject);
  });
  return release;
}
