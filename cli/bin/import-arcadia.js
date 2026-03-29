#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';

const configPath = path.join(os.homedir(), '.aleph', 'config.json');

if (!fs.existsSync(configPath)) {
  console.error('Error: Aleph is not configured. Run `aleph login` first.');
  process.exit(2);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch {
  console.error('Error: Could not parse ~/.aleph/config.json. Run `aleph login` to reconfigure.');
  process.exit(2);
}

if (!config.url || !config.apiKey) {
  console.error('Error: ~/.aleph/config.json is missing url or apiKey. Run `aleph login` to reconfigure.');
  process.exit(2);
}

const { runImport } = await import('../src/commands/import-arcadia.js');

runImport(config).catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
