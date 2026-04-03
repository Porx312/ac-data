/* Migración ac_server_control: PK compuesta (instance_id, server_name). */

ALTER TABLE "ac_server_control" ADD COLUMN IF NOT EXISTS "instance_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
UPDATE "ac_server_control" SET "instance_id" = COALESCE(NULLIF(TRIM("instance_id"), ''), 'default') WHERE true;--> statement-breakpoint
ALTER TABLE "ac_server_control" DROP CONSTRAINT IF EXISTS "ac_server_control_pkey";--> statement-breakpoint
ALTER TABLE "ac_server_control" ADD CONSTRAINT "ac_server_control_instance_id_server_name_pk" PRIMARY KEY ("instance_id","server_name");
