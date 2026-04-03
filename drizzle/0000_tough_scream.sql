CREATE TABLE "drivers" (
	"steam_id" text PRIMARY KEY NOT NULL,
	"name" text,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lap_records" (
	"id" integer PRIMARY KEY NOT NULL,
	"steam_id" text NOT NULL,
	"car_model" text NOT NULL,
	"track" text NOT NULL,
	"track_config" text,
	"server_name" text,
	"lap_time" integer NOT NULL,
	"valid_lap" integer NOT NULL,
	"timestamp" bigint,
	"date" text
);
--> statement-breakpoint
CREATE TABLE "server_battles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"battle_id" text NOT NULL,
	"server_name" text NOT NULL,
	"webhook_url" text,
	"webhook_secret" text,
	"player1_steam_id" text NOT NULL,
	"player2_steam_id" text NOT NULL,
	"status" text DEFAULT 'active',
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "server_battles_battle_id_unique" UNIQUE("battle_id")
);
--> statement-breakpoint
CREATE TABLE "server_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_id" text,
	"server_name" text NOT NULL,
	"webhook_url" text,
	"webhook_secret" text,
	"event_type" text,
	"event_status" text DEFAULT 'started',
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "server_events_event_id_unique" UNIQUE("event_id")
);
