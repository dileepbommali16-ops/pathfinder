import { getPlacementRecords } from "../server/db";

const records = await getPlacementRecords();
console.log(JSON.stringify({ count: records.length, first: records[0] ?? null }));
process.exit(0);
