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
- pCloud: publish each SQLite to a unique `library-<version-id>.sqlite` and merge
  independent versions using the ancestry stored inside SQLite. Remove covered
  versions by file ID. When one version remains, copy it to `library.sqlite`
  with `copyfile(noover=1)`. Delete the source after verifying the copy.
  A same-name conflict leaves both versions for the next merge.
  Direct login can retry a rejected copy with a short-lived pCloud session.

API references: [OneDrive commit](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession),
[Drive create](https://developers.google.com/workspace/drive/api/guides/manage-uploads),
[pCloud copy](https://docs.pcloud.com/methods/file/copyfile.html),
[pCloud delete](https://docs.pcloud.com/methods/file/deletefile.html).

## External copy and replacement

A normal copy of the library directory is readable without provider metadata;
other devices may later merge their edits. Include all pCloud SQLite files if
copying during sync. On opening a copied directory, Rostrum merges the versions
and saves the local `library.sqlite` before removing the extra SQLite files.

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

## Automated conflict tests

Run `mise exec -- npx playwright test tests/library-provider-conflicts.spec.js`.
The suite uses separate browser contexts (independent IndexedDB stores) and real
SQLite workers, sync orchestration, transport and FileSrc HTTP adapters. Only
authentication and the remote HTTP server are replaced. Unexpected external
requests fail the test; no real cloud account or credentials are used.
Service workers are blocked so requests cannot bypass interception.

`tests/provider-cloud-server.js` keeps files, revisions and upload sessions in
memory. One-shot barriers stop requests at precise points instead of relying on
timing or sleeps. Conditional comparison and publication are atomic in the fake;
Drive permits independent same-name files. The pCloud mock returns 7010 for
`listrevisions` and models the verified `copyfile(noover=1)` behavior, including
result 2004 for an existing destination.

The same scenarios run against all four providers:

- First-creation races, both publication orders and three independently edited
  devices; changes arriving during download, upload and acknowledgment.
- Conflicting edits, edit/delete conflicts and identical deletions, explicit
  resolution and reload; duplicate score imports, independent score imports,
  collection memberships, repeated playlist items and annotations.
- Rejected requests, lost upload responses, failed score uploads, corrupted
  downloads and recovery after reloading the application.
- Incomplete/corrupt or competing replacement requests, delayed old-generation
  writes and explicit resolution of competing published generations.
- Identical leftover/recreated restore requests, changed content under a used
  name (cloud and local, including reload), names belonging to ancestor
  generations, and a new name intentionally restoring the same bytes again.
  Same-name local/cloud requests must agree before anything is replaced.
- Failure before recovery-image or activation-marker publication, including
  orphaned recovery images and a lost response after marker publication;
  retries and another device recovering after the request directory is removed.

Additional cases exercise Drive pagination, ambiguous creation and cleanup races;
Dropbox/OneDrive conditional-write retry limits; and pCloud copy collisions,
cleanup retries and opening a copied folder during and after convergence.
A separate assertion checks that acknowledged
revision IDs are already present in the cloud before another device can repair
them. Each SQLite publication is independently opened to check foreign keys,
absence of device-state tables and the hashes of referenced score files. Replicas
are compared using records, full change history and generation, not SQLite bytes.

The smaller `library-provider-snapshots.spec.js`, `library-snapshots.spec.js` and
`library-uploads.spec.js` suites cover request details, format/restore validation,
filename collisions and bounded chunk uploads. These mocks check our protocol
against the modeled API contract; they do not verify live provider behavior,
OAuth or quotas.

## Manual release checks (dedicated test accounts only)

- Exercise login and upload/download on each provider in browser and extension.
- Race two devices with independent edits; interrupt after upload before response.
- Confirm Dropbox stale rev and OneDrive final-commit stale eTag rejection.
- Confirm Drive duplicate-name discovery, ambiguous-create recovery and cleanup.
- Confirm pCloud versioned upload and no-overwrite copy with browser auth
  on EU/US hosts. Verify both snapshots survive a copy collision.
- Copy a local directory to cloud without the app, and open it on a clean device.
- Publish a replacement, remove its request, then sync an offline device with
  old edits. Verify the new generation and score hashes, including after restart.

Automated mocks do not substitute for these provider/account checks.
