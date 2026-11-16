# Library format

The library has 13 tables: ten shared entity tables, `changes`, `local_state`,
and `library_info`. There are no migration history or file-move journal tables.

## Information kept for future changes

- SQLite `PRAGMA user_version` identifies the DB schema (currently 3).
- `library_info` identifies record representation (2) and score storage format (1).
- Sync batches and backups identify their formats (both 2). Individual changes
  retain their record version so old history remains distinguishable later.
- Score IDs and references are independent of display names. `storage_path` is
  the stable file key. Naming, validation and path resolution are centralized in
  `bookshelf-format.js`.
- Unknown formats are rejected before application data is changed or published.

The `rostrum-library-v2` directory/default IndexedDB name `rostrum-bookshelf-v2`
remain unchanged. They isolate the earlier unversioned app; do not create another
empty namespace just to avoid converting existing data in a future release.

## When a change is actually needed

`bookshelf-schema.js` creates the current schema. Add a concrete old-to-new SQL
transaction there when a real schema change is made, updating `user_version`
only when it succeeds. The current 2→3 change simply drops the two unused
migration administration tables. It does not transform score data or files.

Implement record or file conversion for the specific change when it is known.
Keep score IDs/references and raw change history intact. If a future file move
needs restart tracking, add only the tracking needed for that move at that time.
There is no generic migration runner, registry or speculative conversion now.

Backups import portable JSON, not the SQLite recovery image. A local-only DB
schema change does not invalidate a backup with compatible record/storage formats.

Checks: `mise exec -- npm run test:library-schema` and the browser tests in
`tests/library-format.spec.js`, `tests/bookshelf.spec.js`, `tests/library-delta.spec.js`.
