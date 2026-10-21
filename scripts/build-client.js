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

// Auto-install and cross-link dependencies between projectRoot and client
const rootNodeModules = path.join(projectRoot, 'node_modules');
const clientNodeModules = path.join(projectRoot, 'client', 'node_modules');

// Link client/node_modules and root/node_modules so Vite config at projectRoot always resolves packages
if (fs.existsSync(clientNodeModules) && !fs.existsSync(rootNodeModules)) {
  try {
    fs.symlinkSync(clientNodeModules, rootNodeModules, 'junction');
    console.log('[Pathfinder Build] Linked client/node_modules to root node_modules');
  } catch (symlinkErr) {
    console.warn('[Pathfinder Build] Could not create junction/symlink to root:', symlinkErr.message);
  }
}
if (fs.existsSync(rootNodeModules) && !fs.existsSync(clientNodeModules)) {
  try {
    fs.symlinkSync(rootNodeModules, clientNodeModules, 'junction');
    console.log('[Pathfinder Build] Linked root node_modules to client/node_modules');
  } catch (symlinkErr) {
    console.warn('[Pathfinder Build] Could not create junction/symlink to client:', symlinkErr.message);
  }
}

const hasTailwindVite = fs.existsSync(path.join(rootNodeModules, '@tailwindcss', 'vite')) ||
                       fs.existsSync(path.join(clientNodeModules, '@tailwindcss', 'vite'));

if (!hasTailwindVite) {
  console.log('[Pathfinder Build] @tailwindcss/vite not found. Installing dependencies in project root...');
  try {
    execSync('pnpm install --no-frozen-lockfile --reporter=silent', { cwd: projectRoot, stdio: 'inherit' });
  } catch (err) {
    console.warn('[Pathfinder Build] pnpm install failed, falling back to npm install...');
    try {
      execSync('npm install --legacy-peer-deps --include=dev --quiet --no-audit --no-fund', { cwd: projectRoot, stdio: 'inherit' });
    } catch (npmErr) {
      console.error('[Pathfinder Build] Failed to install dependencies:', npmErr);
      process.exit(1);
    }
  }
  // Retry link after installation
  if (fs.existsSync(clientNodeModules) && !fs.existsSync(rootNodeModules)) {
    try { fs.symlinkSync(clientNodeModules, rootNodeModules, 'junction'); } catch {}
  }
}

const nodePath = process.execPath;
const viteConfig = path.join(projectRoot, 'vite.config.ts');

const possibleViteJs = [
  path.join(projectRoot, 'node_modules', 'vite', 'dist', 'node', 'cli.js'),
  path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
  path.join(projectRoot, 'client', 'node_modules', 'vite', 'dist', 'node', 'cli.js'),
  path.join(projectRoot, 'client', 'node_modules', 'vite', 'bin', 'vite.js'),
];
let viteJs = possibleViteJs.find(p => fs.existsSync(p)) || '';

// Configure NODE_PATH so Node and Vite search both root and client node_modules
const nodePathEnv = [
  rootNodeModules,
  clientNodeModules,
  process.env.NODE_PATH || ''
].filter(Boolean).join(path.delimiter);

const buildEnv = {
  ...process.env,
  NODE_ENV: 'production',
  NODE_PATH: nodePathEnv
};

console.log(`[Pathfinder Build] Running Vite production build with config: ${viteConfig}`);
let buildSuccess = false;

// Strategy 1: Direct node invocation of vite.js with NODE_PATH
if (fs.existsSync(viteJs)) {
  try {
    execSync(`"${nodePath}" "${viteJs}" build --config "${viteConfig}"`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: buildEnv
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
      env: buildEnv
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
      env: buildEnv
    });
    buildSuccess = true;
  } catch (e) {
    console.error('[Pathfinder Build] All Vite build strategies failed:', e);
    process.exit(1);
  }
}

// Vite outputs to projectRoot/dist per vite.config.ts
const distRoot = path.join(projectRoot, 'dist');
const distPublic = path.join(projectRoot, 'dist', 'public');
const clientDist = path.join(projectRoot, 'client', 'dist');
const clientDistPublic = path.join(projectRoot, 'client', 'dist', 'public');
const cwdDist = path.join(process.cwd(), 'dist');

if (fs.existsSync(path.join(distRoot, 'index.html'))) {
  console.log(`[Pathfinder Build] Synchronizing build artifacts from ${distRoot}...`);

  const copyContents = (srcDir, targetDir) => {
    try {
      if (!fs.existsSync(srcDir)) return;
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const items = fs.readdirSync(srcDir);
      for (const item of items) {
        if (item === 'public') continue;
        const src = path.join(srcDir, item);
        const dest = path.join(targetDir, item);
        try {
          fs.cpSync(src, dest, { recursive: true, force: true, dereference: true });
        } catch (cpErr) {
          try {
            if (fs.statSync(src).isDirectory()) {
              if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
              copyContents(src, dest);
            } else {
              fs.copyFileSync(src, dest);
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn(`[Pathfinder Build] Notice mirroring from ${srcDir} to ${targetDir}:`, err.message);
    }
  };

  // Remove any stale or duplicate nested dist/public folder to conserve Vercel storage
  if (fs.existsSync(distPublic)) {
    try {
      fs.rmSync(distPublic, { recursive: true, force: true });
    } catch {}
  }
  if (fs.existsSync(clientDistPublic)) {
    try {
      fs.rmSync(clientDistPublic, { recursive: true, force: true });
    } catch {}
  }

  // Mirror to client/dist (clean first so obsolete hashed bundles never accumulate)
  if (fs.existsSync(clientDist)) {
    try {
      fs.rmSync(clientDist, { recursive: true, force: true });
    } catch {}
  }
  copyContents(distRoot, clientDist);

  // Mirror to process.cwd()/dist if different
  if (process.cwd() !== projectRoot && process.cwd() !== path.join(projectRoot, 'client')) {
    if (fs.existsSync(cwdDist)) {
      try {
        fs.rmSync(cwdDist, { recursive: true, force: true });
      } catch {}
    }
    copyContents(distRoot, cwdDist);
  }

  console.log('[Pathfinder Build] Build assets successfully synchronized to:');
  console.log(`  - ${distRoot}`);
  console.log(`  - ${clientDist}`);
  console.log('[Pathfinder Build] Deployment build completed successfully.');
} else {
  console.warn('[Pathfinder Build] Warning: index.html was not found in dist.');
}

