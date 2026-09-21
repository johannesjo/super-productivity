-- Additive, internal capture storage. No endpoint accepts submissions yet.
-- Receipts intentionally have no FK to operations, which imports and pruning remove.
CREATE TABLE "agent_capture_accounts" (
    "user_id" INTEGER NOT NULL,
    "published_counter" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "agent_capture_accounts_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "agent_capture_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "agent_captures" (
    "user_id" INTEGER NOT NULL,
    "capture_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "published_op_id" TEXT,
    "published_server_seq" INTEGER,
    CONSTRAINT "agent_captures_receipt_pair" CHECK (("published_op_id" IS NULL) = ("published_server_seq" IS NULL)),
    CONSTRAINT "agent_captures_pkey" PRIMARY KEY ("user_id", "capture_id"),
    CONSTRAINT "agent_captures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
