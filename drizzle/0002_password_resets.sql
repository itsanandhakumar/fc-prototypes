CREATE TABLE `password_reset_token` (
	`id` varchar(255) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_token_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `reset_token_hash_idx` ON `password_reset_token` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `reset_user_created_idx` ON `password_reset_token` (`userId`,`createdAt`);