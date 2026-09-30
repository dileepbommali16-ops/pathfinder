CREATE TABLE `placement_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`year` int NOT NULL,
	`branch` varchar(80) NOT NULL,
	`gender` varchar(24) NOT NULL,
	`skillCategory` varchar(100) NOT NULL,
	`placed` int NOT NULL,
	`cgpa` int NOT NULL,
	`codingScore` int NOT NULL,
	`communicationScore` int NOT NULL,
	`internships` int NOT NULL,
	CONSTRAINT `placement_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `placement_records_sourceId_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `prediction_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cgpa` int NOT NULL,
	`backlogs` int NOT NULL,
	`internships` int NOT NULL,
	`communication` int NOT NULL,
	`coding` int NOT NULL,
	`chance` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prediction_history_id` PRIMARY KEY(`id`)
);
