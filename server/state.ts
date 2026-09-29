import { catalog, personas, personaFor, eligible } from '@/lib/catalog';
import { rankApps, MODEL_VERSION } from '@/lib/recommendations';
import { database } from './context';
import type { EventRecord, AppState } from '@/lib/domain';
export async function getPersona(userId: string) { const row = await database().prepare('SELECT persona FROM profiles WHERE user_id = ?').bind(userId).first<{
    persona: string;
}>(); return personaFor(row?.persona); }
export async function getState(userId: string, displayName: string): Promise<AppState> {
    const db = database();
    const p = await getPersona(userId);
    const [saved, hidden, events] = await Promise.all([
        db.prepare('SELECT app_id FROM saved_apps WHERE user_id = ? ORDER BY saved_at DESC').bind(userId).all<{
            app_id: string;
        }>(),
        db.prepare('SELECT app_id FROM dismissals WHERE user_id = ?').bind(userId).all<{
            app_id: string;
        }>(),
        db.prepare("SELECT app_id,event_type,created_at FROM events WHERE user_id = ? AND event_type IN ('launch','meaningful_use') ORDER BY created_at DESC LIMIT 400").bind(userId).all<EventRecord>()
    ]);
    const allowed = catalog.filter(a => eligible(a, p));
    const ids = new Set(allowed.map(a => a.id));
    const myList = saved.results.map(x => x.app_id).filter(id => ids.has(id));
    const dismissed = hidden.results.map(x => x.app_id).filter(id => ids.has(id));
    const apps = rankApps(catalog, p, myList, [], events.results);
    return { apps, personas, persona: p, myList, dismissed, displayName, updatedAt: new Date().toISOString(), modelVersion: MODEL_VERSION, mode: 'synthetic', counts: { available: allowed.length, certified: allowed.filter(x => x.certified).length, warnings: allowed.filter(x => x.warning).length } };
}
