CREATE TABLE "operations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"client_id" text NOT NULL,
	"server_seq" integer NOT NULL,
	"action_type" text NOT NULL,
	"op_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"entity_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_bytes" bigint DEFAULT 0 NOT NULL,
	"vector_clock" jsonb NOT NULL,
	"schema_version" integer NOT NULL,
	"client_timestamp" bigint NOT NULL,
	"received_at" bigint NOT NULL,
	"is_payload_encrypted" boolean DEFAULT false NOT NULL,
	"sync_import_reason" text,
	"repair_base_server_seq" integer,
	CONSTRAINT "operations_server_seq_positive" CHECK ("operations"."server_seq" > 0),
	CONSTRAINT "operations_payload_bytes_nonnegative" CHECK ("operations"."payload_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY NOT NULL,
	"credential_id" "bytea" NOT NULL,
	"public_key" "bytea" NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"last_used_at" timestamp (3),
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_passkey_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"verification_token" text NOT NULL,
	"verification_token_expires_at" bigint NOT NULL,
	"credential_id" "bytea" NOT NULL,
	"public_key" "bytea" NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_devices" (
	"client_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"device_name" text,
	"user_agent" text,
	"last_seen_at" bigint NOT NULL,
	"last_acked_seq" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "sync_devices_user_id_client_id_pk" PRIMARY KEY("user_id","client_id"),
	CONSTRAINT "sync_devices_last_acked_seq_nonnegative" CHECK ("sync_devices"."last_acked_seq" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_sync_state" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	"last_snapshot_seq" integer,
	"snapshot_data" "bytea",
	"snapshot_at" bigint,
	"snapshot_schema_version" integer DEFAULT 1,
	"latest_full_state_seq" integer,
	"latest_full_state_vector_clock" jsonb,
	CONSTRAINT "user_sync_state_last_seq_nonnegative" CHECK ("user_sync_state"."last_seq" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"is_verified" integer DEFAULT 0 NOT NULL,
	"verification_token" text,
	"verification_token_expires_at" bigint,
	"verification_resend_count" integer DEFAULT 0 NOT NULL,
	"reset_password_token" text,
	"reset_password_token_expires_at" bigint,
	"passkey_recovery_token" text,
	"passkey_recovery_token_expires_at" bigint,
	"login_token" text,
	"login_token_expires_at" bigint,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" bigint,
	"token_version" integer DEFAULT 0 NOT NULL,
	"terms_accepted_at" bigint,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"storage_quota_bytes" bigint DEFAULT 104857600 NOT NULL,
	"storage_used_bytes" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "users_is_verified_check" CHECK ("users"."is_verified" in (0, 1)),
	CONSTRAINT "users_storage_quota_nonnegative" CHECK ("users"."storage_quota_bytes" >= 0),
	CONSTRAINT "users_storage_used_nonnegative" CHECK ("users"."storage_used_bytes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pending_passkey_registrations" ADD CONSTRAINT "pending_passkey_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sync_devices" ADD CONSTRAINT "sync_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_sync_state" ADD CONSTRAINT "user_sync_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "operations_user_id_server_seq_key" ON "operations" USING btree ("user_id","server_seq");--> statement-breakpoint
CREATE INDEX "operations_user_id_entity_type_entity_id_server_seq_idx" ON "operations" USING btree ("user_id","entity_type","entity_id","server_seq");--> statement-breakpoint
CREATE INDEX "operations_user_id_client_id_idx" ON "operations" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "operations_user_id_received_at_idx" ON "operations" USING btree ("user_id","received_at");--> statement-breakpoint
CREATE INDEX "operations_user_id_full_state_server_seq_idx" ON "operations" USING btree ("user_id","server_seq") WHERE "operations"."op_type" in ('SYNC_IMPORT', 'BACKUP_IMPORT', 'REPAIR');--> statement-breakpoint
CREATE INDEX "operations_user_id_server_seq_encrypted_idx" ON "operations" USING btree ("user_id","server_seq") WHERE "operations"."is_payload_encrypted" = true;--> statement-breakpoint
CREATE INDEX "operations_entity_ids_gin" ON "operations" USING gin ("entity_ids");--> statement-breakpoint
CREATE UNIQUE INDEX "passkeys_credential_id_key" ON "passkeys" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "passkeys_user_id_idx" ON "passkeys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_passkey_registrations_verification_token_key" ON "pending_passkey_registrations" USING btree ("verification_token");--> statement-breakpoint
CREATE INDEX "pending_passkey_registrations_user_id_idx" ON "pending_passkey_registrations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_verification_token_idx" ON "users" USING btree ("verification_token");--> statement-breakpoint
CREATE INDEX "users_reset_password_token_idx" ON "users" USING btree ("reset_password_token");--> statement-breakpoint
CREATE INDEX "users_passkey_recovery_token_idx" ON "users" USING btree ("passkey_recovery_token");--> statement-breakpoint
CREATE INDEX "users_login_token_idx" ON "users" USING btree ("login_token");