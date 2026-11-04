CREATE TABLE "kanban_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"column" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"due_on" date,
	"archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kanban_cards_column_check" CHECK ("kanban_cards"."column" in ('todo','doing','review','done')),
	CONSTRAINT "kanban_cards_priority_check" CHECK ("kanban_cards"."priority" in ('low','normal','high')),
	CONSTRAINT "kanban_cards_title_check" CHECK (char_length(trim("kanban_cards"."title")) between 1 and 160),
	CONSTRAINT "kanban_cards_description_check" CHECK (char_length("kanban_cards"."description") <= 4000),
	CONSTRAINT "kanban_cards_version_check" CHECK ("kanban_cards"."version" > 0)
);
--> statement-breakpoint
CREATE INDEX "kanban_cards_board_idx" ON "kanban_cards" USING btree ("archived","column","created_at");