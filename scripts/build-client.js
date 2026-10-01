import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Walk up until we find the project root containing package.json and vite.config.ts
let projectRoot = path.resolve(__dirname, '..');
while (projectRoot !== path.dirname(projectRoot)) {
  if (fs.existsSync(path.join(projectRoot, 'package.json')) && fs.existsSync(path.join(projectRoot, 'vite.config.ts'))) {
    break;
  }
  projectRoot = path.dirname(projectRoot);
}

console.log(`[Pathfinder Build] Project root: ${projectRoot}`);
console.log(`[Pathfinder Build] Execution directory: ${process.cwd()}`);

// Locate vite executable
let viteJs = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
if (!fs.existsSync(viteJs)) {
  const fallbackVite = path.resolve('node_modules', 'vite', 'bin', 'vite.js');
  if (fs.existsSync(fallbackVite)) {
    viteJs = fallbackVite;
  }
}

const nodePath = process.execPath;
const viteConfig = path.join(projectRoot, 'vite.config.ts');

console.log('[Pathfinder Build] Running Vite production build...');
try {
  execSync(`"${nodePath}" "${viteJs}" build --config "${viteConfig}"`, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error('[Pathfinder Build] Error during Vite build:', error);
  process.exit(1);
}

// Vite outputs to projectRoot/dist/public per vite.config.ts
const distPublic = path.join(projectRoot, 'dist', 'public');
const distRoot = path.join(projectRoot, 'dist');
const clientDist = path.join(projectRoot, 'client', 'dist');
const clientDistPublic = path.join(projectRoot, 'client', 'dist', 'public');
const cwdDist = path.join(process.cwd(), 'dist');

if (fs.existsSync(distPublic)) {
  console.log('[Pathfinder Build] Synchronizing build artifacts across all expected deployment paths...');

  // 1. Sync to projectRoot/dist (standard Vercel output from repo root)
  if (path.resolve(distPublic) !== path.resolve(distRoot)) {
    fs.cpSync(distPublic, distRoot, { recursive: true });
  }

  // 2. Sync to client/dist (for when Vercel root directory is set to 'client')
  if (!fs.existsSync(clientDist)) {
    fs.mkdirSync(clientDist, { recursive: true });
  }
  fs.cpSync(distPublic, clientDist, { recursive: true });

  // 3. Sync to client/dist/public
  if (!fs.existsSync(clientDistPublic)) {
    fs.mkdirSync(clientDistPublic, { recursive: true });
  }
  fs.cpSync(distPublic, clientDistPublic, { recursive: true });

  // 4. If current working directory is distinct, sync to cwd/dist
  if (path.resolve(cwdDist) !== path.resolve(distRoot) && path.resolve(cwdDist) !== path.resolve(clientDist)) {
    if (!fs.existsSync(cwdDist)) {
      fs.mkdirSync(cwdDist, { recursive: true });
    }
    fs.cpSync(distPublic, cwdDist, { recursive: true });
  }

  console.log('[Pathfinder Build] Build assets successfully synchronized to:');
  console.log(`  - ${distRoot}`);
  console.log(`  - ${clientDist}`);
  console.log('[Pathfinder Build] Deployment build completed successfully.');
} else {
  console.warn('[Pathfinder Build] Warning: dist/public was not found.');
}
