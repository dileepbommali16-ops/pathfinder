import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootScript = path.resolve(__dirname, '../../scripts/build-client.js');

if (fs.existsSync(rootScript)) {
  await import(`file://${rootScript.replace(/\\/g, '/')}`);
} else {
  console.error('[Pathfinder Build] Unable to locate root scripts/build-client.js at:', rootScript);
  process.exit(1);
}
