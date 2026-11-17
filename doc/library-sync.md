# SQLite library sync

The model owns operations; the view renders state and asks for explicit choices.
`bookshelf-sync.js` orchestrates synchronization. `LibraryCloudTransport` exposes
`loadSyncState`, `reservePublication`, `publishSnapshot` and `cleanup`; FileSrc
subclasses implement provider requests. Ordinary Open/Save writes are unchanged.

Each SQLite is self-contained: shared records plus complete revision ancestry.
The worker validates format, history and references before merging. Existing
record-level conflicts remain visible until explicitly resolved. Files are
verified and uploaded before a SQLite publication that references them. Normal
sync receives metadata, downloading scores on demand or when kept offline.
Full sync downloads every active score. Device cache/state never enters SQLite.

Publication captures fixed bytes and a unique identity. Later local edits stay
pending. A rejected conditional write reloads and merges before retrying. A
successful upload is checked again for concurrent branches. No-op sync does not
publish. Cleanup failure is deferred and does not invalidate a successful sync.
All provider calls in automated tests are mocked.

## Provider differences

- Dropbox: upload-session final commit uses `update` with the captured `rev`, or
  strict `add` for initial creation. A conflict returns to reload/merge.
- OneDrive Personal: deferred upload session, then explicit commit with
  `If-Match` on the captured eTag (and fail-on-conflict for initial creation).
  This targets Personal accounts, matching the existing consumers OAuth endpoint.
- Google Drive: every publication creates a new same-name `library.sqlite`.
  Pagination preserves all candidates. A pre-generated file ID makes uncertain
  creation checkable. Ancestry is inside SQLite, not provider-only metadata.
  Covered snapshots can be removed; unobserved concurrent snapshots survive.
- pCloud: read the current SQLite and previously unacknowledged revisions; check
  again after writing. Browser auth reads past versions using `copyfile` with
  the global `revisionid` parameter, reads the temporary copy through `getzip`,
  then deletes it. Covered revisions are remembered in device IndexedDB.
  Recovery through server history depends on pCloud's finite revision retention.

API references: [OneDrive commit](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession),
[Drive create](https://developers.google.com/workspace/drive/api/guides/manage-uploads),
[pCloud revision parameter](https://docs.pcloud.com/methods/intro/global_parameters.html),
[pCloud revisions](https://docs.pcloud.com/methods/revisions/listrevisions.html).

## External copy and replacement

A normal copy of the library directory is readable without provider metadata;
other devices may later merge their edits. There is one local SQLite regardless
of how many independent Google Drive snapshots exist temporarily.

A replacement request is `restore/<new-name>/library.sqlite` plus its complete
active `scores/`. Names are never reused. Local and cloud requests are discovered
at sync. Missing/corrupt files leave the current library active. Only after
validation and score publication does the app publish an immutable recovery
SQLite followed by its generation marker in `_sync/generations/`.

Markers contain replacement ancestry. Ordinary sync never overwrites them.
A late old-generation upload is ignored; offline devices adopt the new generation
and discard their old edits when they next sync. Markers/recovery images remain
in the ordinary library directory, so the user may delete the request once its
publication is confirmed, without waiting for every device. Requests are never
automatically deleted. Different pending requests require keeping only one;
competing published generations offer explicit choices in Library settings.
The chosen generation becomes a new child of all observed competing generations.

## Manual release checks (dedicated test accounts only)

- Exercise login and upload/download on each provider in browser and extension.
- Race two devices with independent edits; interrupt after upload before response.
- Confirm Dropbox stale rev and OneDrive final-commit stale eTag rejection.
- Confirm Drive duplicate-name discovery, ambiguous-create recovery and cleanup.
- Confirm pCloud temporary past-revision copy with browser auth and EU/US hosts;
  confirm its revision history survives overwriting `library.sqlite`.
- Copy a local directory to cloud without the app, and open it on a clean device.
- Publish a replacement, remove its request, then sync an offline device with
  old edits. Verify the new generation and score hashes, including after restart.

Automated mocks do not substitute for these provider/account checks.
