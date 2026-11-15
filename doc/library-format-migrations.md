# Library format and migration contract

The versioned baseline starts at SQLite schema **2**, record format **2**, score
layout **1**, sync protocol **2** and backup envelope **2**. Constants, path
creation/validation/resolution, envelope adapters and record decoders live in
`src/bookshelf-format.js`. The SQLite `user_version` is the sole schema version;
`library_info` stores the independent record and storage format versions.
`application_id` identifies a Rostrum database, not its schema revision.

## Initial generation boundary

Pre-versioned data is deliberately not migrated. It is never automatically deleted.
Selected-directory and OPFS data now live below `rostrum-library-v2/`. The OPFS
SQLite pool is inside that directory. The default IndexedDB database is
`rostrum-bookshelf-v2`; its internal key/value store still uses IndexedDB version 1,
independently of the SQLite image's schema version. Explicit custom database names
are retained, but a pre-versioned SQLite image inside one is rejected.

Cloud data uses `rostrum-library-v2/` below the chosen sync folder. This permanent
namespace isolates the old client, which never checked a format manifest. **Do not
change this namespace for future schema/layout upgrades**: future libraries must
be migrated in place, not silently replaced with an empty namespace.

Device preferences, cloud selection and authentication remain separate from the
library. An old unversioned backup is rejected rather than partially imported.

## Database schema changes

`createLibrarySchemaV2()` is immutable bootstrap DDL. All new installations create
that baseline and run the same upgrade chain as existing libraries. The current
shared entity list is separate from this DDL, so adding a future table does not
accidentally alter the baseline and cause a duplicate ALTER on fresh installs.

For schema 3, raise `LIBRARY_SCHEMA_VERSION` and register a synchronous step:

```js
schemaMigrations.set(2, db => {
  db.exec('CREATE INDEX example_index ON entries(document_id, parent_id)');
});
```

The runner checks the entire chain, executes one step per SQLite transaction,
validates foreign keys, changes `user_version`, records completion in
`library_migrations`, and awaits persistence. Failed DDL rolls back. After a
snapshot persistence failure, reopen the database to restart from its durable
version. Keep all old steps. Unknown newer schema/data formats are rejected
before DDL. A schema step may not change the record or storage version itself.

## Shared record format changes

An index-only schema change needs no shared record change. Changing shared
columns or metadata semantics may require raising `LIBRARY_RECORD_VERSION` and
registering pure `recordUpgrades` decoders for each intervening version. These
decoders are used both for incoming data and old local revisions.

Each immutable change stores its original `record_version`. The record migration
engine rebuilds current materialized rows from their referenced revisions, checks
IDs and foreign keys, and advances `library_info.record_format_version` atomically.
It does **not** rewrite raw `payload_json`, change IDs, parent revision IDs or
annotation/song references. Adapter failure rolls the whole record step back.
Do not add synthetic user-edit revisions just to migrate representation.

Backup and sync envelope upgrades have explicit `backupUpgrades` / `syncUpgrades`
registries. When bumping those envelope versions, supply all steps from version 2.
Adapters must preserve immutable change bodies and original per-change versions.
Backup import continues to parse portable JSON, never execute the included SQLite.

## File layout changes

`documents.storage_path` is an **immutable logical file key**, not an instruction
to concatenate a filesystem path. Use `scoreStoragePath()` for physical paths.
Records and old revisions keep the same logical key when filenames change.

Register every readable layout in `storageLayouts`. A layout resolves logical
keys to physical paths under the owned `scores/` tree; cloud-capable layouts also
provide `list()` returning logical keys. An irreversible basename scheme needs
a durable logical-key inventory, not a guessed reverse mapping. Do not duplicate
layout rules in import, download, backup, cloud listing or deletion code.

Raise `LIBRARY_STORAGE_VERSION` and register the transition in `storageMigrations`.
The registered callback validates/prepares a transition; the common engine owns
copying, verification, switching and cleanup. It runs while the backend writer
lock is held and before normal worker operations are admitted:

1. Persist a plan in `library_migrations` and `library_file_moves`.
2. Copy each present file to its new path, verify size and SHA-256, and persist
   its checkpoint. Never overwrite a different destination.
3. Persist the new storage version and cleanup phase in one DB transaction.
4. Re-verify destinations before removing sources; persist cleanup checkpoints.

On reopen, resume unfinished copying or cleanup, including after a source was
removed but its checkpoint was not persisted. Cloud-only files need no local
copy. A missing file previously marked local blocks migration instead of silently
discarding it. Paths, hashes and sizes in a resumed journal must still match the
document and registered layouts. Overlapping destination/source plans are refused;
use an intermediate layout for cyclic renames. Keep old layouts and steps until
all their incomplete migrations can be resumed.

The journal and format metadata are local administration tables, excluded from
shared change batches and portable records. They remain in the SQLite recovery
image. Normal backup/sync/open operations run only after migration succeeds.

## Cloud compatibility and future cloud migrations

The cloud namespace contains `library-format.json` with protocol, record and
storage versions. Check it on connect, before listing/reading, before publication
and immediately before publishing a pending upload. Do not overwrite unsupported
versions, an in-progress migration, or a nonempty namespace missing its manifest.
Concurrent creation of the initial manifest may be retried safely.

There is deliberately no fabricated migration to an undefined future cloud
layout. A future cloud layout release must implement and test its cloud migration
coordinator as well as its layout handler: fence other writers, durably mark and
checkpoint maintenance, copy/verify cloud objects, switch the manifest only when
all referenced files are available, and retain recovery copies until safe cleanup.
Provider-specific leases/conditional writes or an explicit maintenance window
are needed; a local SQLite transaction cannot atomically rename cloud objects.
Never assume incrementing a version constant alone performs that conversion.
Older manifest-aware clients stop on the new format/maintenance marker; the
pre-versioned client remains isolated in the parent namespace.

## Required validation for future changes

```sh
mise exec -- npm run test:library-migrations
mise exec -- python -X utf8 build.py --rostrum --extension
mise exec -- npx playwright test tests/library-format.spec.js tests/bookshelf.spec.js tests/library-delta.spec.js
```

The SQLite tests exercise synthetic future schema/record/layout steps, rollback,
copy/checkpoint/cleanup interruption, failed durability, unchanged history, and
tampered checkpoints. Browser tests cover isolated legacy data, unsupported cloud
and backup formats, reload, packaged/file-URL builds and normal sync. Add actual
fixtures for every new step, including the oldest supported library and interrupted
states. Browser tests mock all cloud APIs and fail on unexpected external access.
