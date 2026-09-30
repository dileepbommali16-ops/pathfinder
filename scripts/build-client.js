import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('[Pathfinder Build] Starting Vite production build...');
const nodePath = process.execPath;
const viteJs = path.resolve('node_modules', 'vite', 'bin', 'vite.js');

try {
  execSync(`"${nodePath}" "${viteJs}" build`, { stdio: 'inherit' });
} catch (error) {
  console.error('[Pathfinder Build] Error during vite build:', error);
  process.exit(1);
}

const publicDist = path.resolve('dist', 'public');
const rootDist = path.resolve('dist');

if (fs.existsSync(publicDist)) {
  console.log('[Pathfinder Build] Syncing dist/public assets to dist for Vercel compatibility...');
  fs.cpSync(publicDist, rootDist, { recursive: true });
  console.log('[Pathfinder Build] Successfully copied index.html and assets to dist root.');
} else {
  console.warn('[Pathfinder Build] Warning: dist/public was not found.');
}
