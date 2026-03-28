CREATE TABLE "security_logs " (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" varchar(50),
	"level" varchar(50),
	"method" varchar(50),
	"endpoint" varchar(200),
	"attack_type" varchar(255),
	"payload_hash" varchar(255),
	"msg" varchar(255),
	"reason" varchar(255),
	"userAgent" varchar(255)
);
