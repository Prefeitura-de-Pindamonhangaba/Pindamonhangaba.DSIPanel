CREATE TABLE "transparency_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"listed" boolean DEFAULT true NOT NULL,
	"refreshed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "transparency_contracts_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "glpi_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"listed" boolean DEFAULT true NOT NULL,
	"refreshed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "glpi_tickets_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_contract_bindings" (
	"ticket_id" integer PRIMARY KEY NOT NULL,
	"contract_source_id" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_syncs" (
	"source" text PRIMARY KEY NOT NULL,
	"attempted_at" timestamp with time zone NOT NULL,
	"succeeded_at" timestamp with time zone,
	"status" text NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_audit_events" ADD COLUMN "entity_type" text;--> statement-breakpoint
ALTER TABLE "auth_audit_events" ADD COLUMN "entity_id" text;--> statement-breakpoint
ALTER TABLE "ticket_contract_bindings" ADD CONSTRAINT "ticket_contract_bindings_ticket_id_glpi_tickets_source_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."glpi_tickets"("source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_contract_bindings" ADD CONSTRAINT "ticket_contract_bindings_contract_source_id_transparency_contracts_source_id_fk" FOREIGN KEY ("contract_source_id") REFERENCES "public"."transparency_contracts"("source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_contract_bindings" ADD CONSTRAINT "ticket_contract_bindings_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;