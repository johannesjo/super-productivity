-- The restore hold must distinguish a restore-era pending capture from one
-- submitted after the snapshot. No production path submits captures yet, so the
-- table is empty everywhere and NOT NULL with a default backfills nothing real;
-- adding it once rows exist would mean inventing timestamps nobody knows.
ALTER TABLE "agent_captures"
    ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
