import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const candidatePaths = [
  path.resolve(__dirname, '../../scripts/build-client.js'),
  path.resolve(__dirname, '../scripts/build-client.js'),
  path.resolve(process.cwd(), 'scripts/build-client.js'),
  path.resolve(process.cwd(), '../scripts/build-client.js')
];

const rootScript = candidatePaths.find(p => fs.existsSync(p));

if (rootScript) {
  await import(pathToFileURL(rootScript).href);
} else {
  console.error('[Pathfinder Build] Unable to locate root scripts/build-client.js in candidates:', candidatePaths);
  process.exit(1);
}
