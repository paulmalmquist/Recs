import { principal, database, reply, failure, checkWrite, body, ApiError } from '@/server/context';
import { getPersona } from '@/server/state';
import { catalog, eligible } from '@/lib/catalog';
import { MODEL_VERSION } from '@/lib/recommendations';
const types = new Set(['impression', 'detail', 'launch', 'meaningful_use', 'dismiss', 'restore']);
export async function POST(req: Request) {
    try {
        checkWrite(req);
        const u = await principal();
        const b = await body(req);
        const p = await getPersona(u.userId);
        const rows = Array.isArray(b.events) ? b.events : [b];
        if (!rows.length || rows.length > 30)
            throw new ApiError(400, 'Send between 1 and 30 events.');
        const valid = rows.map((r: any) => { if (!r || typeof r !== 'object')
            throw new ApiError(400, 'Expected an event object.'); const a = catalog.find(a => a.id === r.appId); if (!a || !eligible(a, p))
            throw new ApiError(404, 'App is unavailable.'); if (!types.has(r.type))
            throw new ApiError(400, 'Unknown event type.'); if (typeof r.id !== 'string' || !/^[-a-zA-Z0-9]{8,80}$/.test(r.id))
            throw new ApiError(400, 'An event ID is required.'); return { ...r, appId: a.id }; });
        const db = database();
        const now = new Date().toISOString();
        const statements = valid.flatMap((r: any) => {
            const stmts = [db.prepare('INSERT INTO events (id,user_id,app_id,event_type,created_at,request_id,position,surface,model_version) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(u.userId + ':' + r.id, u.userId, r.appId, r.type, now, typeof r.requestId === 'string' ? r.requestId.slice(0, 100) : null, Number.isInteger(r.position) ? String(r.position) : null, typeof r.surface === 'string' ? r.surface.slice(0, 80) : null, MODEL_VERSION)];
            if (r.type === 'dismiss')
                stmts.push(db.prepare('INSERT INTO dismissals (user_id,app_id,created_at) VALUES (?,?,?) ON CONFLICT(user_id,app_id) DO NOTHING').bind(u.userId, r.appId, now));
            if (r.type === 'restore')
                stmts.push(db.prepare('DELETE FROM dismissals WHERE user_id = ? AND app_id = ?').bind(u.userId, r.appId));
            return stmts;
        });
        await db.batch(statements);
        return reply({ accepted: valid.length });
    }
    catch (e) {
        return failure(e);
    }
}
