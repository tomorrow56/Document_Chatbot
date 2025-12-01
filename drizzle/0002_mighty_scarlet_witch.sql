CREATE TABLE `workspaces` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `workspaceId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `workspaceId` varchar(64) NOT NULL;