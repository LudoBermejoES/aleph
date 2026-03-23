import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { join } from 'path'
import * as schema from './schema'

const DB_PATH = join(process.cwd(), 'data', 'aleph.db')

// Ensure data directory exists
import { mkdirSync } from 'fs'
mkdirSync(join(process.cwd(), 'data'), { recursive: true })

const sqlite = new Database(DB_PATH)

// Enable WAL mode for concurrent reads
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    file_path TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'members',
    content_hash TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entity_names (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL REFERENCES entities(id),
    name TEXT NOT NULL,
    name_lower TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0
  );

  -- FTS5 virtual table (managed via raw SQL, not Drizzle)
  CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
    name,
    aliases,
    tags,
    body,
    tokenize='porter unicode61',
    prefix='2 3'
  );
`)

export const db = drizzle(sqlite, { schema })
export { sqlite }
