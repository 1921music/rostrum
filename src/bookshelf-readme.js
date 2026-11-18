// +skip
export { LIBRARY_README };
// -skip
const LIBRARY_README = `# Rostrum Library

- library.sqlite: Shared library records, edit history and format versions.
- library-<version-id>.sqlite: Temporary pCloud sync versions. Keep them when copying.
- scores/: Managed score files (hash prefix and original filename).
- _sync/: Restore generations and their recovery snapshots. Keep this directory.
- restore/<unique-name>/: Optional manual replacement requests.
- README.md: This guide. Device settings and sync caches stay in browser storage.

Normal copy: Copy all library SQLite versions, scores/ and _sync/ into the library folder.
Other devices may merge their edits later; this does not force a replacement.

Replace the library: Create restore/<unique-name>/ and copy library.sqlite and
all its scores/ there. Use a NEW name every time, even after deleting a request.
An already processed request with identical SQLite is ignored. Reusing its name
with different SQLite is rejected; use a new name for another replacement.
At the next sync, Rostrum validates the files and publishes a new generation.
Other devices then discard edits from the previous generation when they sync.
Incomplete requests wait without replacing the library. Competing requests are
reported for review; submit only one replacement at a time.
After Rostrum confirms the replacement was published to the cloud, you may
manually delete that request directory. Other devices need not have synced yet.
Rostrum never deletes your restore request directories automatically.
`;
