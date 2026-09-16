import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertPlacementRecord, InsertPredictionHistory, InsertUser, placementRecords, predictionHistory, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function seedPlacementRecords(records: InsertPlacementRecord[]) {
  const db = await getDb();
  if (!db || records.length === 0) return;
  await db.insert(placementRecords).values(records).onDuplicateKeyUpdate({
    set: {
      year: sql`values(${placementRecords.year})`,
      branch: sql`values(${placementRecords.branch})`,
      gender: sql`values(${placementRecords.gender})`,
      skillCategory: sql`values(${placementRecords.skillCategory})`,
      placed: sql`values(${placementRecords.placed})`,
      cgpa: sql`values(${placementRecords.cgpa})`,
      codingScore: sql`values(${placementRecords.codingScore})`,
      communicationScore: sql`values(${placementRecords.communicationScore})`,
      internships: sql`values(${placementRecords.internships})`,
    },
  });
}

export async function replacePlacementRecords(records: InsertPlacementRecord[]) {
  const db = await getDb();
  if (!db || records.length === 0) throw new Error("Database is not available or CSV is empty");
  await db.transaction(async (tx) => {
    await tx.delete(placementRecords);
    await tx.insert(placementRecords).values(records);
  });
  return records.length;
}

export async function getPlacementRecords(filters?: { year?: number; branch?: string; gender?: string; skillCategory?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    filters?.year ? eq(placementRecords.year, filters.year) : undefined,
    filters?.branch ? eq(placementRecords.branch, filters.branch) : undefined,
    filters?.gender ? eq(placementRecords.gender, filters.gender) : undefined,
    filters?.skillCategory && filters.skillCategory !== "AIML + Python" ? eq(placementRecords.skillCategory, filters.skillCategory) : undefined,
  ].filter(Boolean);
  const records = await db.select().from(placementRecords).where(conditions.length ? and(...conditions) : undefined);
  if (filters?.skillCategory !== "AIML + Python") return records;

  const groups = new Map<string, Set<string>>();
  records.forEach((record) => {
    const key = `${record.year}|${record.branch}|${record.gender}`;
    const skills = groups.get(key) ?? new Set<string>();
    skills.add(record.skillCategory);
    groups.set(key, skills);
  });
  return records.filter((record) => {
    const skills = groups.get(`${record.year}|${record.branch}|${record.gender}`);
    return skills?.has("AIML") && skills.has("Python") && (record.skillCategory === "AIML" || record.skillCategory === "Python");
  });
}

export async function addPredictionHistory(input: InsertPredictionHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(predictionHistory).values(input);
  return result;
}

export async function getPredictionHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(predictionHistory).where(eq(predictionHistory.userId, userId)).orderBy(desc(predictionHistory.createdAt)).limit(20);
}
