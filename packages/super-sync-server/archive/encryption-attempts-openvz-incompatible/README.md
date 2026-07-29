# Archived encryption experiments — do not run

> **Status:** Historical, unsupported, and incompatible with the current
> deployment.

This directory preserves abandoned LUKS tooling as implementation history. Its
Compose override, scripts, migration notes, and operational procedures are not a
supported deployment path and must not be run against production data. They have
not been validated against the current SuperSync topology, PostgreSQL version,
backup process, or recovery requirements.

The LUKS approach requires host `dm-crypt` capabilities that are unavailable in
the production OpenVZ environment. A PostgreSQL TDE experiment was also rejected
after it proved unsuitable for that environment; its implementation remains only
in git history.

Current status, security boundaries, and criteria for considering a replacement
are documented in:

- [`../../docs/encryption-at-rest.md`](../../docs/encryption-at-rest.md)
- [`../../../../docs/supersync-encryption-at-rest-decision.md`](../../../../docs/supersync-encryption-at-rest-decision.md)

Any future storage-encryption project needs a fresh design and an exercised
migration, rollback, boot, key-rotation, backup, and restore procedure on the
actual deployment environment. These archived files may be used as historical
research only; they are not a shortcut to that review.

Backup-file encryption is a separate control from encryption of the live
database. Follow the maintained
[`../../docs/backup-and-recovery.md`](../../docs/backup-and-recovery.md) guide for
current backup and recovery behavior.
