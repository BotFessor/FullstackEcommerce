CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"description" text,
	"image_url" varchar(255),
	"price" double precision DEFAULT 0 NOT NULL
);
