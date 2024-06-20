# concept for 2 file sync in super productivity

2 files:
1 for archive
1 for everything else including metadata
(can be later expanded, if needed)

main file stores metadata and content

metadata includes:

- etag of main file
- checksum for archive (and maybe for main file too)
- (timestamp of last update to archive)
- (timestamp of last update to main file)
- (timestamp of last completed sync)
- model versions are included by the data itself

We also need to save any incomplete syncs, so that we can warn the user if closing the app

## sync flow

### how to determine if local archive was updated?

- calculate checksum of local archive or (faster) just save a timestamp every time the archive is updated und use that as a checksum
- for local change check the timestamp should be enough
- for comparing with remote the checksum might be better

### out

#### only main file was updated

1. update metadata and upload main file

#### archive was updated

1. upload archive file (and get new etag ?)
2. update metadata (in main file) and upload main file

### in

#### only main file was updated

1. app checks remote state of main file
   - first via etag
   - then again via all metadata
2. download main file (and check metadata)
3. check if metadata checksum for archive matches local archive checksum
4. all done

#### archive was updated

1. app checks remote state of main file

- first via etag
- than again via all metadata

2. download main file (and check metadata)
3. check if metadata checksum for archive matches local archive checksum
4. if not, download archive file
5. re-check checksum
6. all done

### edge cases

#### checksum miss-match for archive after download of main file

- try to download new archive file
- (reattempt once if checksum check still fails (remote update might not be completed yet???))
- (if checksum check still fails, check once for new main file (via etag))
- if any of the downloads fail show error message that sync couldnt be completed and ask if the user wants to try again
- if checksum check still fails after successful download, show error message and ask if local data should be used instead and if remote data should be overwritten
-

### more edge case considerations

- what if the main file is updated and the archive is updated at the same time?
  - since we always check for matching checksums, we always should have a complete state

## further considerations

- to make the sync more robust we could try to handle archive data more independent of the main file data e.g. by removing tags and projects as needed or by creating new ones if needed when restoring or showing archive data
