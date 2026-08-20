CREATE TABLE `connection` (
	`id` varchar(255) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`expiresAt` timestamp,
	`accountLabel` varchar(255),
	`meta` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connection_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_post` (
	`id` varchar(255) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`name` varchar(512) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'Draft',
	`scheduledAt` timestamp,
	`sourcePostId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_post_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_variant` (
	`id` varchar(255) NOT NULL,
	`socialPostId` varchar(255) NOT NULL,
	`platformId` varchar(32) NOT NULL,
	`text` text NOT NULL,
	`permalink` varchar(1024),
	`remoteId` varchar(255),
	`failure` text,
	`metrics` json,
	`metricsCheckedAt` timestamp,
	CONSTRAINT `social_variant_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `post` ADD `hubspotPostId` varchar(64);--> statement-breakpoint
ALTER TABLE `post` ADD `hubspotUrl` varchar(1024);--> statement-breakpoint
CREATE INDEX `connection_user_provider_idx` ON `connection` (`userId`,`provider`);--> statement-breakpoint
CREATE INDEX `social_user_updated_idx` ON `social_post` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `social_due_idx` ON `social_post` (`status`,`scheduledAt`);--> statement-breakpoint
CREATE INDEX `variant_post_idx` ON `social_variant` (`socialPostId`);