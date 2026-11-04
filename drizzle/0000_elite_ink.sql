CREATE TABLE `availability` (
	`date` text NOT NULL,
	`member` text NOT NULL,
	`answer` text NOT NULL,
	PRIMARY KEY(`date`, `member`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`plan` text NOT NULL,
	`member` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`plan` text NOT NULL,
	`member` text NOT NULL,
	`owner` text NOT NULL,
	`type` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`category` text NOT NULL,
	`location` text NOT NULL,
	`city` text NOT NULL,
	`budget` integer NOT NULL,
	`description` text NOT NULL,
	`creator` text NOT NULL,
	`owner` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rsvps` (
	`plan` text NOT NULL,
	`member` text NOT NULL,
	`answer` text NOT NULL,
	PRIMARY KEY(`plan`, `member`)
);
