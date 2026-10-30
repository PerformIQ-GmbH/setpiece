import { randomBytes, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

// Invitation plaintext stays outside the repository; production stores hashes only.
const [action, directory] = process.argv.slice(2);
if (!directory || !['generate', 'seed'].includes(action)) throw new Error('Usage: node scripts/pilot-codes.mjs generate|seed <private-directory>');
const root = path.resolve(import.meta.dirname, '..');
const destination = path.resolve(directory);
if (destination === root || destination.startsWith(root + path.sep)) throw new Error('Use a private directory outside the repository.');
const seedPath = path.join(destination, 'pilot-code-hashes.json');
if (action === 'generate') {
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const codes = Array.from({ length: 5 }, () => randomBytes(16).toString('hex').toUpperCase());
  const hashes = codes.map(code => createHash('sha256').update(code).digest('hex'));
  const content = ['SETPIECE – fünf persönliche Pilot-Einladungen', '',
    'Pro Trainer genau einen Code persönlich weitergeben. Nicht öffentlich posten.',
    '1. https://setpiece.performiq.ch öffnen und registrieren/anmelden.',
    '2. Ein kostenloses Team erstellen.',
    '3. In den Team-Einstellungen den persönlichen Code aktivieren.',
    '30 Tage ab Aktivierung, Solo Coach für ein Team. Keine Zahlungsangaben und kein automatisches Abo.',
    'Zum Start Trikotnummern/Pseudonyme verwenden; keine Gesundheits- oder privaten Kontaktdaten erfassen.',
    '', ...codes.map((code, i) => `Trainer ${i + 1}: ${code}`), '',
    'Support: contact@performiq.ch', ''].join('\n');
  // Exclusive writes prevent accidentally replacing invitations already sent to coaches.
  await writeFile(seedPath, JSON.stringify(hashes), { flag: 'wx', mode: 0o600 });
  await writeFile(path.join(destination, 'Trainer-Einladungscodes.txt'), content, { flag: 'wx', mode: 0o600 });
  console.log('Five invitations saved privately; no codes printed.');
} else {
  const hashes = JSON.parse(await readFile(seedPath, 'utf8'));
  if (!Array.isArray(hashes) || hashes.length !== 5 || new Set(hashes).size !== 5 || hashes.some(x => typeof x !== 'string' || !/^[a-f0-9]{64}$/.test(x))) throw new Error('Invalid five-slot seed file.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing.');
  const { Pool } = createRequire(new URL('../lib/db/package.json', import.meta.url))('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(await readFile(new URL('../lib/db/migrations/20261029_pilot_access.sql', import.meta.url), 'utf8'));
    for (let i = 0; i < hashes.length; i++) await client.query('INSERT INTO pilot_access(slot,code_hash) VALUES ($1,$2) ON CONFLICT (slot) DO NOTHING', [i + 1, hashes[i]]);
    const { rows } = await client.query('SELECT slot,code_hash FROM pilot_access ORDER BY slot');
    if (rows.length !== 5 || rows.some((row, i) => row.slot !== i + 1 || row.code_hash !== hashes[i])) throw new Error('Existing pilot codes differ. No changes committed.');
    await client.query('COMMIT');
    console.log('Five pilot slots verified; existing claims preserved.');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
}
