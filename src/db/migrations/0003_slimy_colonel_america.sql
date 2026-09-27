CREATE TABLE "clause_library" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"emphasis" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"key" text PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address_lines" text[],
	"city" text,
	"district" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_clauses" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"kind" text NOT NULL,
	"position" integer NOT NULL,
	"body" text NOT NULL,
	"emphasis" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"kind" text NOT NULL,
	"number" text NOT NULL,
	"blob_url" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"sent_to" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_units" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"ref_seq" integer NOT NULL,
	"customer_id" text NOT NULL,
	"sales_person" text,
	"quotation_date" date NOT NULL,
	"estimation_date" date,
	"stage" text DEFAULT 'quotation' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"free_delivery" boolean DEFAULT false NOT NULL,
	"delivery_charge_cents" bigint,
	"discount_label" text DEFAULT 'Cash Discount' NOT NULL,
	"discount_cents" bigint DEFAULT 0 NOT NULL,
	"advance_cents" bigint,
	"portal_token" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_ref_unique" UNIQUE("ref"),
	CONSTRAINT "jobs_ref_seq_unique" UNIQUE("ref_seq"),
	CONSTRAINT "jobs_portal_token_unique" UNIQUE("portal_token")
);
--> statement-breakpoint
CREATE TABLE "option_specs" (
	"id" text PRIMARY KEY NOT NULL,
	"option_id" text NOT NULL,
	"position" integer NOT NULL,
	"label" text,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_snippets" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text,
	"value" text NOT NULL,
	"use_count" integer DEFAULT 1 NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_options" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"position" integer NOT NULL,
	"label" text,
	"price_cents" bigint NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"selected" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_clauses" ADD CONSTRAINT "job_clauses_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_documents" ADD CONSTRAINT "job_documents_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_units" ADD CONSTRAINT "job_units_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_specs" ADD CONSTRAINT "option_specs_option_id_unit_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."unit_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_options" ADD CONSTRAINT "unit_options_unit_id_job_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."job_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_clauses_job_idx" ON "job_clauses" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_documents_job_idx" ON "job_documents" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_units_job_idx" ON "job_units" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "jobs_customer_idx" ON "jobs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "option_specs_option_idx" ON "option_specs" USING btree ("option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spec_snippets_text" ON "spec_snippets" USING btree ("label","value");--> statement-breakpoint
CREATE INDEX "unit_options_unit_idx" ON "unit_options" USING btree ("unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_options_one_selected" ON "unit_options" USING btree ("unit_id") WHERE "unit_options"."selected";