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

// Auto-install dependencies if node_modules or vite is missing
const vitePkgDir = path.join(projectRoot, 'node_modules', 'vite');
if (!fs.existsSync(vitePkgDir)) {
  console.log('[Pathfinder Build] node_modules or Vite not found in project root. Installing dependencies...');
  try {
    execSync('pnpm install --no-frozen-lockfile', { cwd: projectRoot, stdio: 'inherit' });
  } catch (err) {
    console.warn('[Pathfinder Build] pnpm install failed, falling back to npm install...');
    try {
      execSync('npm install --legacy-peer-deps', { cwd: projectRoot, stdio: 'inherit' });
    } catch (npmErr) {
      console.error('[Pathfinder Build] Failed to install dependencies:', npmErr);
      process.exit(1);
    }
  }
}

const nodePath = process.execPath;
const viteConfig = path.join(projectRoot, 'vite.config.ts');
let viteJs = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

if (!fs.existsSync(viteJs)) {
  const fallbackVite = path.resolve(projectRoot, 'node_modules', '.bin', 'vite');
  if (fs.existsSync(fallbackVite)) {
    viteJs = fallbackVite;
  }
}

console.log(`[Pathfinder Build] Running Vite production build with config: ${viteConfig}`);
let buildSuccess = false;

// Strategy 1: Direct node invocation of vite.js from project root
if (fs.existsSync(viteJs)) {
  try {
    execSync(`"${nodePath}" "${viteJs}" build --config "${viteConfig}"`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    buildSuccess = true;
  } catch (e) {
    console.warn('[Pathfinder Build] Direct node execution of vite.js encountered an issue, trying pnpm exec...');
  }
}

// Strategy 2: pnpm exec vite build
if (!buildSuccess) {
  try {
    execSync(`pnpm exec vite build --config "${viteConfig}"`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    buildSuccess = true;
  } catch (e) {
    console.warn('[Pathfinder Build] pnpm exec vite failed, trying npx vite with project root cwd...');
  }
}

// Strategy 3: npx vite build executed with cwd: projectRoot
if (!buildSuccess) {
  try {
    execSync(`npx vite build --config "${viteConfig}"`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    buildSuccess = true;
  } catch (e) {
    console.error('[Pathfinder Build] All Vite build strategies failed:', e);
    process.exit(1);
  }
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
