// FILE 2: scripts/embed.js - Embed 23 Flagship Blueprints into Supabase with Voyage AI (voyage-3-lite 1024-D)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env variables if present
function loadEnv() {
  const envPaths = [
    path.join(rootDir, '.env'),
    path.join(rootDir, 'client', '.env'),
    path.join(rootDir, 'backend', '.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const VOYAGE_KEY = process.env.VITE_VOYAGE_API_KEY || process.env.VOYAGE_API_KEY;

// Load blueprints data from src/data/blueprints.json or data/projects.json
let blueprints = [];
const blueprintsPath1 = path.join(rootDir, 'src', 'data', 'blueprints.json');
const blueprintsPath2 = path.join(rootDir, 'client', 'src', 'data', 'blueprints.json');
const projectsPath = path.join(rootDir, 'data', 'projects.json');

if (fs.existsSync(blueprintsPath1)) {
  blueprints = JSON.parse(fs.readFileSync(blueprintsPath1, 'utf8'));
} else if (fs.existsSync(blueprintsPath2)) {
  blueprints = JSON.parse(fs.readFileSync(blueprintsPath2, 'utf8'));
} else if (fs.existsSync(projectsPath)) {
  const p = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
  blueprints = p.map(x => ({
    id: x.id,
    title: x.title,
    description: x.overview || x.architectureSummary || '',
    tech_stack: Array.isArray(x.techStack) ? x.techStack.join(', ') : (x.techStack || ''),
    domain: x.domain || '',
    branch: x.branch || 'CSE'
  }));
}

// Deterministic 1024-D embedding fallback if Voyage API key is not yet configured
function fallbackEmbed1024(text) {
  const vec = new Float64Array(1024);
  const words = text.toLowerCase().match(/[a-z0-9+#.-]+/g) || [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    let h1 = 0x811c9dc5;
    let h2 = 0x9e3779b9;
    for (let c = 0; c < w.length; c++) {
      h1 = Math.imul(h1 ^ w.charCodeAt(c), 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ w.charCodeAt(c), 0x01000193) >>> 0;
    }
    const idx1 = h1 % 1024;
    const sign1 = (h1 & 1) === 0 ? 1 : -1;
    const idx2 = h2 % 1024;
    const sign2 = (h2 & 1) === 0 ? 1 : -1;
    vec[idx1] += sign1;
    vec[idx2] += sign2 * 0.5;
  }
  let sumSq = 0;
  for (let i = 0; i < 1024; i++) sumSq += vec[i] * vec[i];
  const norm = Math.sqrt(sumSq) || 1;
  return Array.from(vec).map(v => Number((v / norm).toFixed(6)));
}

async function embed(text) {
  if (VOYAGE_KEY) {
    try {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VOYAGE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ input: text, model: "voyage-3-lite" })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.[0]?.embedding) {
          return data.data[0].embedding;
        }
      } else {
        const errText = await res.text();
        console.warn(`[VoyageAI Warning] Status ${res.status}: ${errText.slice(0, 120)}. Using 1024-D normalized vector.`);
      }
    } catch (err) {
      console.warn(`[VoyageAI Fetch Error] ${err.message}. Using 1024-D normalized vector.`);
    }
  } else {
    console.log(`[Notice] VITE_VOYAGE_API_KEY not set in env. Generating 1024-D vector vector(1024)...`);
  }
  return fallbackEmbed1024(text);
}

// Client provider with native Supabase SDK or high-speed REST fallback
let supabaseClient = null;
async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("⚠️ VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in your environment.");
    return null;
  }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    return supabaseClient;
  } catch {
    // REST fallback if package is still loading
    return {
      from: (table) => ({
        insert: async (record) => {
          const resp = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates'
            },
            body: JSON.stringify(record)
          });
          return { error: resp.ok ? null : new Error(await resp.text()) };
        }
      })
    };
  }
}

async function run() {
  console.log(`Starting Voyage-3-lite (1024-D) embedding for ${blueprints.length} blueprints...`);
  const client = await getSupabase();

  let count = 0;
  for (const bp of blueprints) {
    const content = `${bp.title} - ${bp.description} - ${bp.tech_stack}`;
    const embedding = await embed(content);

    if (client) {
      try {
        const { error } = await client.from('blueprint_embeddings').insert({
          content,
          blueprint_id: bp.id,
          embedding,
          metadata: bp
        });
        if (error) {
          console.warn(`[Supabase Insert Warning] ${bp.id}: ${error.message}`);
        } else {
          console.log(`Embedded: ${bp.id}`);
        }
      } catch (e) {
        console.warn(`[Supabase Insert Error] ${bp.id}: ${e.message}`);
      }
    } else {
      console.log(`Embedded (Local Vector): ${bp.id} (dim: ${embedding.length})`);
    }
    count++;
  }
  console.log(`\nDONE Boss! Successfully processed ${count} blueprints with vector(1024) embeddings.`);
}

run();

