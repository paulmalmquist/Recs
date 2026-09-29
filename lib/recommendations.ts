import type { AppRecord, Persona, EventRecord, RankedApp } from './domain';
import { eligible } from './catalog';
export const MODEL_VERSION = 'rules-v1.0';
export function rankApps(apps: AppRecord[], persona: Persona, saved: string[], dismissed: string[], events: EventRecord[], now = Date.now()): RankedApp[] {
    const savedApps = apps.filter(a => saved.includes(a.id) && eligible(a, persona));
    const eligibleIds = new Set(apps.filter(a => eligible(a, persona)).map(a => a.id));
    const recent = events.filter(e => eligibleIds.has(e.app_id) && ['launch', 'meaningful_use'].includes(e.event_type));
    const learnedDomains = new Map<string, number>();
    for (const event of recent) {
        const a = apps.find(x => x.id === event.app_id);
        if (a) {
            const age = Math.max(0, (now - Date.parse(event.created_at)) / 86400000);
            learnedDomains.set(a.domain, Math.min(1, (learnedDomains.get(a.domain) ?? 0) + .2 * Math.pow(.5, age / 14)));
        }
    }
    return apps.filter(a => eligible(a, persona) && !dismissed.includes(a.id)).map(app => {
        const overlap = app.datasets.filter(x => persona.datasets.includes(x)).length;
        const savedOverlap = savedApps.filter(s => s.id !== app.id && (s.domain === app.domain || s.datasets.some(d => app.datasets.includes(d)))).length;
        const signals = [
            { label: `Matches your ${app.domain.toLowerCase()} activity`, points: Math.round(25 * (persona.domains[app.domain] ?? 0)) },
            { label: 'Fits your role', points: app.roles.includes(persona.role) ? 18 : 0 },
            { label: 'Uses data you work with', points: Math.min(20, overlap * 10) },
            { label: 'Related to apps in My List', points: Math.min(12, savedOverlap * 6) },
            { label: 'Used by your team', points: Math.round(10 * Math.min(1, (app.teamUse[persona.team] ?? 0) / 40)) },
            { label: 'Related to your recent launches', points: Math.round(8 * (learnedDomains.get(app.domain) ?? 0)) },
            { label: 'Certified data product', points: app.certified ? 5 : 0 },
            { label: 'New app to explore', points: app.newApp ? 4 : 0 },
            { label: 'Availability warning', points: app.warning?.level === 'warning' ? -12 : app.warning ? -4 : 0 }
        ];
        const total = signals.reduce((n, s) => n + s.points, 0);
        const reason = signals.filter(s => s.points > 0).sort((a, b) => b.points - a.points)[0]?.label ?? 'Discover a certified app';
        return { ...app, score: Math.max(0, total), reason, signals: signals.filter(s => s.points !== 0), saved: saved.includes(app.id) };
    }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
// A small catalog is scored on demand. Swap this service for a batch-score adapter at scale.
export function diversify(apps: RankedApp[], limit = 6) { const out: RankedApp[] = []; const counts = new Map<string, number>(); for (const a of apps) {
    if ((counts.get(a.domain) ?? 0) < 2) {
        out.push(a);
        counts.set(a.domain, (counts.get(a.domain) ?? 0) + 1);
    }
    if (out.length === limit)
        return out;
} for (const a of apps) {
    if (!out.some(b => b.id === a.id))
        out.push(a);
    if (out.length === limit)
        break;
} return out; }
