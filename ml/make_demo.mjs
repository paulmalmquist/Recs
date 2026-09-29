// Export the actual app catalog and generate deterministic, explicitly synthetic interactions.
import ts from 'typescript';
import fs from 'node:fs';
const compiled = ts.transpileModule(fs.readFileSync('lib/catalog.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const { catalog, personas, eligible } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
let seed = 42;
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
const users = Array.from({ length: 72 }, (_, i) => ({ ...personas[i % 3], id: `synthetic-${i}` }));
const events = [];
for (let i = 0; i < users.length; i++) {
  const available = catalog.filter(a => eligible(a, users[i]));
  // Personal interests intentionally differ within a role; no real people or activity.
  const favorites = [available[i % available.length], available[(i + 3) % available.length]];
  for (let day = 0; day < 60; day++) {
    if (random() > .65) continue;
    const app = random() < .85 ? favorites[Math.floor(random()*2)] : available[Math.floor(random()*available.length)];
    events.push({ event_id: `demo-${i}-${day}`, user_id: users[i].id, app_id: app.id,
      event_type: random() < .25 ? 'save' : random() < .6 ? 'meaningful_use' : 'launch',
      created_at: new Date(Date.UTC(2026, 6, 1 + day, 12)).toISOString() });
  }
}
const data = { synthetic: true, features_as_of: '2026-07-01T00:00:00Z',
  train_end: '2026-08-10T00:00:00Z', validation_end: '2026-08-20T00:00:00Z',
  test_end: '2026-08-30T00:00:00Z', users, apps: catalog, events };
fs.mkdirSync('ml/demo', { recursive: true });
fs.writeFileSync('ml/demo/input.json', JSON.stringify(data) + '\n');
fs.writeFileSync('ml/demo/context.json', JSON.stringify({ users, apps: catalog,
  allowed_app_ids: Object.fromEntries(users.map(u => [u.id, catalog.filter(a => eligible(a, u)).map(a => a.id)])) }) + '\n');
console.log(`Generated ${users.length} synthetic people, ${events.length} events, ${catalog.length} apps.`);
