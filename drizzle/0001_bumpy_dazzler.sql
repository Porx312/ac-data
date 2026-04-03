CREATE TABLE "ac_server_control" (
	"server_name" text PRIMARY KEY NOT NULL,
	"power_state" text DEFAULT 'stopped' NOT NULL,
	"display_name" text,
	"password" text,
	"track" text,
	"config_track" text,
	"max_clients" integer,
	"entries" jsonb,
	"updated_at" timestamp with time zone DEFAULT now()
);
