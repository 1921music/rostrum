# Library format

SQLite contains twelve shared tables: `documents`, `entries`, `annotations`,
`tags`, `document_tags`, `entry_tags`, `bookshelves`, `bookshelf_documents`,
`playlists`, `playlist_items`, `changes`, and `library_info`.

`changes` preserves record revisions, parents and tombstones for merging and
explicit conflict resolution. `library_info` holds storage/record versions,
the publication identity, its ancestors and the current replacement generation.
There is no migration journal or device-state table.

- SQLite `PRAGMA application_id` identifies Rostrum; `user_version` is schema 7.
- Record format: 4. Score storage format: 3. Backup format: 2.
- Unknown schemas/formats are rejected. This development reset does not migrate
  previous databases. The default compatibility DB is `rostrum-bookshelf-v4`.

The selected folder itself is the library root, containing `library.sqlite`,
`scores/` and an English `README.md`. It has no version-named wrapper directory.
Published manual replacements also use `_sync/generations/`; user-provided
requests live under `restore/<unique-name>/`. See [library-sync.md](library-sync.md).

Device IDs, file presence/offline flags, local fallback paths, cloud inventory,
acknowledged provider versions and the last synchronized SQLite are stored in
browser IndexedDB, separately for each storage location. Folder handles are
compared by filesystem identity. Selection, cloud destination and automatic
sync preferences also stay in browser IndexedDB. Reader view preferences and
library category/search stay in existing browser-local preferences.

Document IDs are SHA-256 hashes of exact file bytes. Shared `storage_path` names
are `scores/<8 hash digits>_<original filename>`; a colliding hash prefix grows
by one digit until unique. Local folders, cloud files and backups use the same
names. Editing a display title does not rename the stored file or its ID.
PDF outline song IDs hash the document ID and original outline tree position;
manual songs retain independent random IDs. Song edits preserve their IDs.
Shelf/tag memberships derive IDs from endpoints; playlist occurrences are separate.

When an actual future schema change is needed, implement its concrete SQL
transaction in `bookshelf-schema.js`, updating `user_version` only on success.
Implement file/record conversion for that specific change then. Preserve content
IDs, references and history; no speculative migration framework is installed.

ZIP backups include shared SQLite, portable records/history and score files.
ZIP import validates portable records rather than executing the included SQLite.
Cloud sync and directory replacement validate an isolated, read-only SQLite image.
