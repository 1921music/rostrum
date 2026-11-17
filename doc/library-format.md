# Library format

The library has 13 tables: ten shared entity tables, `changes`, `local_state`,
and `library_info`. There are no migration history or file-move journal tables.

## Information kept for future changes

- SQLite `PRAGMA user_version` identifies the DB schema (currently 6).
- `library_info` identifies record representation (4) and score storage format (2).
- Sync batches and backups identify their formats (both 2). Individual changes
  retain their record version so old history remains distinguishable later.
- Score IDs and references are independent of display names. `storage_path` is
  the stable file key. Naming, validation and path resolution are centralized in
  `bookshelf-format.js`.
- Unknown formats are rejected before application data is changed or published.

The `rostrum-library-v3` directory/default IndexedDB name `rostrum-bookshelf-v3`
start a fresh library for the content-addressed identity design. Existing data is not migrated in this development reset. Future changes must retain this namespace and migrate data when needed.

## When a change is actually needed

`bookshelf-schema.js` creates the current schema. Add a concrete old-to-new SQL
transaction there when a real schema change is made, updating `user_version`
only when it succeeds. No old-format conversion is included in this reset.

Implement record or file conversion for the specific change when it is known.
Keep score IDs/references and raw change history intact. If a future file move
needs restart tracking, add only the tracking needed for that move at that time.
There is no generic migration runner, registry or speculative conversion now.

Backups import portable JSON, not the SQLite recovery image. A local-only DB
schema change does not invalidate a backup with compatible record/storage formats.

Checks: `mise exec -- npm run test:library-schema` and the browser tests in
`tests/library-format.spec.js`, `tests/bookshelf.spec.js`, `tests/library-delta.spec.js`.

## Identities

Document IDs are SHA-256 hashes of the exact file bytes. Physical score keys are
`scores/<hash>`; names and formats belong to document metadata. PDF outline song
IDs hash the document identity and original outline tree position. Root entries
use a fixed root identity; manual entries retain random IDs. Song edits never
change their identities. Shelf/tag memberships derive IDs from their endpoints;
playlist occurrences retain independent IDs.

Local score filenames use `<hash prefix>_<original filename>`, starting with eight
hash digits and extending the prefix when another document shares it. The exact
local path is stored in the existing device-only file state. The immutable
`scores/<full hash>` key remains unchanged in shared records, cloud storage and
portable backups. Schema 6 guards clients that understand this local mapping;
opening schema 5 only updates the client guard and does not rewrite score files.
New imports and downloads use readable names; existing hash-only files remain
readable and are renamed when saved again.
