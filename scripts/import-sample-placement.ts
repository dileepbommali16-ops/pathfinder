import { readFile } from "node:fs/promises";
import { seedPlacementRecords } from "../server/db";
import type { InsertPlacementRecord } from "../drizzle/schema";

const csv = await readFile(new URL("../sample-placement-2024-2026.csv", import.meta.url), "utf8");
const [header, ...lines] = csv.trim().split(/\r?\n/);
const headers = header.split(",");
const records: InsertPlacementRecord[] = lines.filter(Boolean).map((line) => {
  const values = line.split(",");
  const row = Object.fromEntries(headers.map((key, index) => [key, values[index]]));
  return {
    sourceId: Number(row.sourceId),
    year: Number(row.year),
    branch: row.branch,
    gender: row.gender,
    skillCategory: row.skillCategory,
    placed: Number(row.placed),
    cgpa: Math.round(Number(row.cgpa) * 10),
    codingScore: Math.round(Number(row.codingScore) * 10),
    communicationScore: Math.round(Number(row.communicationScore) * 10),
    internships: Number(row.internships),
  };
});

await seedPlacementRecords(records);
console.log(`imported ${records.length} sample placement records for 2024–2026`);
