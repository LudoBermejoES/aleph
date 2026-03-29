import fs from 'fs';
import path from 'path';

const ARCADIA_ROOT = '/Users/ludo/code/arcadia/docs/campaigns';

// The single Arcadia campaign on the remote server
const ARCADIA_CAMPAIGN_ID = '753b7958-d63b-4053-bcb5-1ac44b0f96e0';

// ---------------------------------------------------------------------------
// Session group definitions (one per sub-campaign)
// ---------------------------------------------------------------------------
const CAMPAIGN_GROUPS = [
  { key: 'la-familia', name: 'La Familia' },
  { key: 'genesis', name: 'Génesis' },
  { key: 'la-fuerza-oculta', name: 'La Fuerza Oculta' },
  { key: 'aun-sin-nombre', name: 'Reformatorio Nueva Esperanza' },
  { key: 'crematorio-la-tranquilidad', name: 'Crematorio La Tranquilidad' },
  { key: 'hospital', name: 'Hospital' },
];

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
async function apiFetch(config, method, endpoint, body) {
  const url = `${config.url.replace(/\/$/, '')}/api${endpoint}`;
  const headers = { 'X-API-Key': config.apiKey };
  const init = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (res.status === 204) return null;
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const msg = (data && data.message) ? data.message : text;
    throw Object.assign(new Error(msg), { status: res.status, data });
  }
  return data;
}

function apiGet(config, endpoint) { return apiFetch(config, 'GET', endpoint); }
function apiPost(config, endpoint, body) { return apiFetch(config, 'POST', endpoint, body); }
function apiPut(config, endpoint, body) { return apiFetch(config, 'PUT', endpoint, body); }

// ---------------------------------------------------------------------------
// Strip Jekyll front-matter
// ---------------------------------------------------------------------------
function stripFrontmatter(content) {
  if (!content.startsWith('---')) return content;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return content;
  return content.slice(end + 4).trimStart();
}

// ---------------------------------------------------------------------------
// Parse date from filename
// ---------------------------------------------------------------------------
function parseDateFromFilename(filename) {
  const m = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Parse title from front-matter (keep full title including campaign prefix
// so slugs are unique across the shared campaign namespace)
// ---------------------------------------------------------------------------
function parseTitleFromFrontmatter(content) {
  const m = content.match(/^---[\s\S]*?title:\s*["']?(.+?)["']?\s*$/m);
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '');
}

function readMarkdown(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

// ---------------------------------------------------------------------------
// Derive slug (matches server slugify logic)
// ---------------------------------------------------------------------------
function deriveSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Ensure session group exists (idempotent)
// ---------------------------------------------------------------------------
async function ensureSessionGroup(config, campaignId, name) {
  const groups = await apiGet(config, `/campaigns/${campaignId}/session-groups`);
  const expectedSlug = deriveSlug(name);
  const existing = groups.find((g) => g.slug === expectedSlug);
  if (existing) {
    console.log(`→ Skipped group: ${name} (already exists)`);
    return existing.slug;
  }
  const created = await apiPost(config, `/campaigns/${campaignId}/session-groups`, { name });
  console.log(`✓ Created group: ${name}`);
  return created.slug;
}

// ---------------------------------------------------------------------------
// Session cache per campaign
// ---------------------------------------------------------------------------
let sessionSlugCache = null;

async function getExistingSessionSlugs(config, campaignId) {
  if (!sessionSlugCache) {
    const sessions = await apiGet(config, `/campaigns/${campaignId}/sessions`);
    sessionSlugCache = new Set(sessions.map((s) => s.slug));
  }
  return sessionSlugCache;
}

// ---------------------------------------------------------------------------
// Ensure session exists (idempotent)
// ---------------------------------------------------------------------------
async function ensureSession(config, campaignId, title, scheduledDate, groupSlug, n) {
  const existingSlugs = await getExistingSessionSlugs(config, campaignId);
  const expectedSlug = deriveSlug(title);

  if (existingSlugs.has(expectedSlug)) {
    console.log(`  → Skipped session ${n}: ${title} (already exists)`);
    return expectedSlug;
  }

  try {
    const body = { title, status: 'completed' };
    if (scheduledDate) body.scheduledDate = scheduledDate;
    if (groupSlug) body.groupSlug = groupSlug;
    const created = await apiPost(config, `/campaigns/${campaignId}/sessions`, body);
    existingSlugs.add(created.slug);
    console.log(`  ✓ Session ${n}: ${title}`);
    return created.slug;
  } catch (err) {
    console.error(`  ✗ Error creating session ${n} "${title}": ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Import session content
// ---------------------------------------------------------------------------
async function importSessionContent(config, campaignId, sessionSlug, manualNotes, aiNotes, summary) {
  const uploads = [];
  if (manualNotes != null) uploads.push(['manual_notes', manualNotes]);
  if (aiNotes != null) uploads.push(['ai_notes', aiNotes]);
  if (summary != null) uploads.push(['summary', summary]);

  for (const [type, content] of uploads) {
    try {
      await apiPut(config, `/campaigns/${campaignId}/sessions/${sessionSlug}/content`, { type, content });
    } catch (err) {
      console.error(`    ✗ Error uploading ${type} for ${sessionSlug}: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Find matching ai-notes and summary files by date
// ---------------------------------------------------------------------------
function findMatchingNotes(dateStr, notesDir, summaryDir) {
  if (!dateStr) return { aiNotes: null, summary: null };

  let aiNotes = null;
  let summary = null;

  if (notesDir && fs.existsSync(notesDir)) {
    const files = fs.readdirSync(notesDir);
    const match = files.find((f) => f.includes(dateStr) && f !== 'index.md');
    if (match) aiNotes = stripFrontmatter(readMarkdown(path.join(notesDir, match)) || '');
  }

  if (summaryDir && fs.existsSync(summaryDir)) {
    const files = fs.readdirSync(summaryDir);
    const match = files.find((f) => f.includes(dateStr) && f !== 'index.md');
    if (match) summary = stripFrontmatter(readMarkdown(path.join(summaryDir, match)) || '');
  }

  return { aiNotes, summary };
}

// ---------------------------------------------------------------------------
// Import La Familia sessions
// ---------------------------------------------------------------------------
async function importLaFamilia(config, campaignId, groupSlug) {
  console.log('\nImporting La Familia sessions...');
  const dir = path.join(ARCADIA_ROOT, 'la-familia');
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith('session-') && f.endsWith('.md') && !f.includes('summary'))
    .sort();

  let n = 0;
  for (const file of files) {
    n++;
    const content = readMarkdown(path.join(dir, file));
    if (!content) continue;
    const title = parseTitleFromFrontmatter(content) || file.replace('.md', '');
    const date = parseDateFromFilename(file);
    const body = stripFrontmatter(content);
    const slug = await ensureSession(config, campaignId, title, date, groupSlug, n);
    if (slug) await importSessionContent(config, campaignId, slug, body, null, null);
  }
}

// ---------------------------------------------------------------------------
// Import Génesis sessions
// ---------------------------------------------------------------------------
async function importGenesis(config, campaignId, groupSlug) {
  console.log('\nImporting Génesis sessions...');
  const dir = path.join(ARCADIA_ROOT, 'genesis');
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith('session-') && f.endsWith('.md'))
    .sort();

  let n = 0;
  for (const file of files) {
    n++;
    const content = readMarkdown(path.join(dir, file));
    if (!content) continue;
    const title = parseTitleFromFrontmatter(content) || file.replace('.md', '');
    const date = parseDateFromFilename(file);
    const body = stripFrontmatter(content);
    const slug = await ensureSession(config, campaignId, title, date, groupSlug, n);
    if (slug) await importSessionContent(config, campaignId, slug, body, null, null);
  }
}

// ---------------------------------------------------------------------------
// Import Hospital sessions
// ---------------------------------------------------------------------------
async function importHospital(config, campaignId, groupSlug) {
  console.log('\nImporting Hospital sessions...');
  const dir = path.join(ARCADIA_ROOT, 'hospital');
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith('session-') && f.endsWith('.md'))
    .sort();

  let n = 0;
  for (const file of files) {
    n++;
    const content = readMarkdown(path.join(dir, file));
    if (!content) continue;
    const title = parseTitleFromFrontmatter(content) || file.replace('.md', '');
    const date = parseDateFromFilename(file);
    const body = stripFrontmatter(content);
    const slug = await ensureSession(config, campaignId, title, date, groupSlug, n);
    if (slug) await importSessionContent(config, campaignId, slug, body, null, null);
  }
}

// ---------------------------------------------------------------------------
// Import La Fuerza Oculta sessions
// ---------------------------------------------------------------------------
async function importLaFuerzaOculta(config, campaignId, groupSlug) {
  console.log('\nImporting La Fuerza Oculta sessions...');
  const manualDir = path.join(ARCADIA_ROOT, 'la-fuerza-oculta', 'manual-notes');
  const aiDir = path.join(ARCADIA_ROOT, 'la-fuerza-oculta', 'ai-notes');
  const summaryDir = path.join(ARCADIA_ROOT, 'la-fuerza-oculta', 'ai-notes-summary');

  const files = fs.readdirSync(manualDir)
    .filter((f) => f.startsWith('session-') && f.endsWith('.md') && f !== 'index.md')
    .sort();

  let n = 0;
  for (const file of files) {
    n++;
    const content = readMarkdown(path.join(manualDir, file));
    if (!content) continue;
    const title = parseTitleFromFrontmatter(content) || file.replace('.md', '');
    const date = parseDateFromFilename(file);
    const body = stripFrontmatter(content);
    const { aiNotes, summary } = findMatchingNotes(date, aiDir, summaryDir);
    const slug = await ensureSession(config, campaignId, title, date, groupSlug, n);
    if (slug) await importSessionContent(config, campaignId, slug, body, aiNotes, summary);
  }
}

// ---------------------------------------------------------------------------
// Import Reformatorio Nueva Esperanza sessions
// ---------------------------------------------------------------------------
async function importAunSinNombre(config, campaignId, groupSlug) {
  console.log('\nImporting Reformatorio Nueva Esperanza sessions...');
  const aiDir = path.join(ARCADIA_ROOT, 'aun-sin-nombre', 'ai-notes');
  const summaryDir = path.join(ARCADIA_ROOT, 'aun-sin-nombre', 'ai-notes-summary');

  const files = fs.readdirSync(aiDir)
    .filter((f) => f !== 'index.md' && f.endsWith('.md'))
    .sort();

  let n = 0;
  for (const file of files) {
    n++;
    const date = parseDateFromFilename(file);
    const content = readMarkdown(path.join(aiDir, file));
    if (!content) continue;
    const title = parseTitleFromFrontmatter(content) || `Reformatorio Nueva Esperanza - Sesión ${n}`;
    const aiNotes = stripFrontmatter(content);
    const { summary } = findMatchingNotes(date, null, summaryDir);
    const slug = await ensureSession(config, campaignId, title, date, groupSlug, n);
    if (slug) await importSessionContent(config, campaignId, slug, null, aiNotes, summary);
  }
}

// ---------------------------------------------------------------------------
// Import Crematorio La Tranquilidad (1 session)
// ---------------------------------------------------------------------------
async function importCrematorio(config, campaignId, groupSlug) {
  console.log('\nImporting Crematorio La Tranquilidad sessions...');
  const sessionFile = path.join(ARCADIA_ROOT, 'crematorio-la-tranquilidad', 'sessions', 'index.md');
  const aiNotesFile = path.join(ARCADIA_ROOT, 'crematorio-la-tranquilidad', 'ai-notes', '2025-10-25-Session-1.md');

  const sessionContent = readMarkdown(sessionFile);
  if (!sessionContent) {
    console.error('  ✗ Could not read crematorio sessions/index.md');
    return;
  }
  const title = parseTitleFromFrontmatter(sessionContent) || 'Sesión 1';
  const aiNotesContent = readMarkdown(aiNotesFile);
  const aiNotes = aiNotesContent ? stripFrontmatter(aiNotesContent) : null;

  const slug = await ensureSession(config, campaignId, title, '2025-10-25', groupSlug, 1);
  if (slug) await importSessionContent(config, campaignId, slug, null, aiNotes, null);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export async function runImport(config) {
  const campaignId = ARCADIA_CAMPAIGN_ID;
  sessionSlugCache = null; // reset cache on each run
  console.log(`\nImporting Arcadia campaigns into campaign ${campaignId} at ${config.url}\n`);

  // Create one session group per sub-campaign
  console.log('Creating session groups...');
  const groupSlugs = {};
  for (const g of CAMPAIGN_GROUPS) {
    groupSlugs[g.key] = await ensureSessionGroup(config, campaignId, g.name);
  }

  // Import sessions into each group
  await importLaFamilia(config, campaignId, groupSlugs['la-familia']);
  await importGenesis(config, campaignId, groupSlugs['genesis']);
  await importHospital(config, campaignId, groupSlugs['hospital']);
  await importLaFuerzaOculta(config, campaignId, groupSlugs['la-fuerza-oculta']);
  await importAunSinNombre(config, campaignId, groupSlugs['aun-sin-nombre']);
  await importCrematorio(config, campaignId, groupSlugs['crematorio-la-tranquilidad']);

  console.log('\n✓ Import complete.\n');
}
