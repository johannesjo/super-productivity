-- Additive recovery-resolution columns. A point-in-time restore rolls the queue
-- row, the receipt and the publisher counter back together, so a restored
-- pending row cannot prove it was never delivered. An operator who established
-- that answer from evidence outside this database records it here; the row then
-- becomes terminal WITHOUT an invented operation identity, which the restore
-- erased. Existing rows stay pending: absent resolution is not a resolution.
ALTER TABLE "agent_captures"
    ADD COLUMN "resolution" TEXT,
    ADD COLUMN "resolved_at" TIMESTAMP(3);

-- Both or neither, a receipt and a resolution are mutually exclusive terminal
-- states, and the vocabulary is closed. Prisma cannot express CHECK
-- constraints, so db-push setups omit these; the service validates the same
-- rules, which is what protects a deployment either way.
ALTER TABLE "agent_captures"
    ADD CONSTRAINT "agent_captures_resolution_pair" CHECK (("resolution" IS NULL) = ("resolved_at" IS NULL)),
    ADD CONSTRAINT "agent_captures_resolution_terminal" CHECK ("resolution" IS NULL OR "published_op_id" IS NULL),
    ADD CONSTRAINT "agent_captures_resolution_values" CHECK ("resolution" IS NULL OR "resolution" IN ('delivered_out_of_band', 'discarded_by_user'));
