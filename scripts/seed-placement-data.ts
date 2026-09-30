import { readFile } from "node:fs/promises";
import { seedPlacementRecords } from "../server/db";
import type { InsertPlacementRecord } from "../drizzle/schema";

type PreparedRecord = {
  sourceId: number;
  year: number;
  branch: string;
  gender: string;
  skillCategory: string;
  placed: boolean;
  cgpa: number;
  codingScore: number;
  communicationScore: number;
  internships: number;
};

const raw = await readFile(new URL("../server/data/placement-data.json", import.meta.url), "utf8");
const records = JSON.parse(raw) as PreparedRecord[];
const values: InsertPlacementRecord[] = records.map((record) => ({
  sourceId: record.sourceId,
  year: record.year,
  branch: record.branch,
  gender: record.gender,
  skillCategory: record.skillCategory,
  placed: record.placed ? 1 : 0,
  cgpa: Math.round(record.cgpa * 10),
  codingScore: Math.round(record.codingScore * 10),
  communicationScore: Math.round(record.communicationScore * 10),
  internships: record.internships,
}));

await seedPlacementRecords(values);
console.log(`seeded ${values.length} placement records`);
