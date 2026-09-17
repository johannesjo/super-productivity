-- Durable causal evidence for the boundary `latest_state_replacement_seq` names.
--
-- That column tracks SYNC_IMPORT/BACKUP_IMPORT only; an accepted causal REPAIR
-- deliberately does not move it (#9703). The retention sweep's boundary is the
-- newest CAUSAL full-state op, which DOES count a causal REPAIR, so a REPAIR
-- above the newest import authorizes deleting that import's row while the
-- pointer keeps naming it. Quota recovery reaches the same state by deleting up
-- to and including the oldest of two restore points.
--
-- Uploads are unaffected: they compare the pointer as a number and never join
-- the row. Readers that need the boundary's AUTHOR and CLOCK (the agent-capture
-- publication gate) cannot reconstruct them once the row is gone, and refusing
-- is permanent for that account. Recording both alongside the seq, in the same
-- transaction that advances it, keeps the evidence out of a prunable row.
--
-- `client_id` mirrors the operations row's column, which stores the UPLOADER's
-- client id rather than op.clientId -- the two can differ, and the classifier
-- must see the same value it would have read from the row.
--
-- Nullable, no default: ADD COLUMN without a default is a catalog-only change on
-- PostgreSQL (no table rewrite, no backfill). Existing rows stay NULL until the
-- account's next import, or until the lazy resolver backfills them from a still
-- retained import row; a NULL boundary must keep refusing rather than be read as
-- "no import".
ALTER TABLE "user_sync_state"
  ADD COLUMN "latest_state_replacement_client_id" TEXT,
  ADD COLUMN "latest_state_replacement_vector_clock" JSONB;
