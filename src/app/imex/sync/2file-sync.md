# 2 File Sync

## TODO

- maybe find better name for today in the different contexts => e.g. `main` or `top` (do in a separate step)

## Flow

- Regular sync flow, just for today file
- BUT Before import check if archive also changed
  - if archived changed according to archiveREV then download archive as well and import both together (but do not import today on its own in that case)
- BUT Before upload check if archive was updated as well and if so upload

### Archive checks flow

#### Download

- After today is downloaded compare remote and local `today.lastArchiveUpdate` to see if archive update might be necessary.
- Check if _remote_ `today.lastArchiveUpdate` matches _remote_ `archive.lastArchiveUpdate` and if not retry once from the beginning (another machines sync might be incomplete???) and after that display an error dialog with the option to proceed anyway.
- If all is good import both data together (check for validity via `isValidAppData`).

#### Upload

- check for valid app data and a congruent state before uploading anything
- for uploads of the archive, just overwrite when today checks passed to keep things simple

## file content:

- for today as is (without taskArchive)
- archive is just archive + `lastAchiveUpdate` to check for integrity

## update models and import stuff

- Keep `AppBaseData` mostly as is (for now we just need to split the remote part)
  - Only add `lastArchiveUpdate` to be able to check for archive updates
- replace `importCompleteSyncData` with `importTodaySyncData` and `importSyncDataWithArchive`

```typescript

```
