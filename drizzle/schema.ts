import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const placementRecords = mysqlTable("placement_records", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId").notNull().unique(),
  year: int("year").notNull(),
  branch: varchar("branch", { length: 80 }).notNull(),
  gender: varchar("gender", { length: 24 }).notNull(),
  skillCategory: varchar("skillCategory", { length: 100 }).notNull(),
  placed: int("placed").notNull(),
  cgpa: int("cgpa").notNull(),
  codingScore: int("codingScore").notNull(),
  communicationScore: int("communicationScore").notNull(),
  internships: int("internships").notNull(),
});

export const predictionHistory = mysqlTable("prediction_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cgpa: int("cgpa").notNull(),
  backlogs: int("backlogs").notNull(),
  internships: int("internships").notNull(),
  communication: int("communication").notNull(),
  coding: int("coding").notNull(),
  chance: int("chance").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PlacementRecord = typeof placementRecords.$inferSelect;
export type InsertPlacementRecord = typeof placementRecords.$inferInsert;
export type PredictionHistory = typeof predictionHistory.$inferSelect;
export type InsertPredictionHistory = typeof predictionHistory.$inferInsert;
