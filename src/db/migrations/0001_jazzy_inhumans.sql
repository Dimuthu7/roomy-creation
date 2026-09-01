CREATE TABLE "testimonials" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"fb_review_id" text,
	"author_name" text NOT NULL,
	"review_text" text NOT NULL,
	"review_url" text,
	"recommended" boolean,
	"rating" integer,
	"reviewed_at" timestamp DEFAULT now() NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"position" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "testimonials_fb_review_id_unique" UNIQUE("fb_review_id")
);
