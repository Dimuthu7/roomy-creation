CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"spent_at" date NOT NULL,
	"remark" text,
	"details" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "expenses_spent_at_idx" ON "expenses" USING btree ("spent_at");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "shops_name_lower" ON "shops" USING btree (lower("name"));