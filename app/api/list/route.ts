import { principal, database, reply, failure, checkWrite, body, ApiError } from '@/server/context';
import { getPersona } from '@/server/state';
import { catalog, eligible } from '@/lib/catalog';
import { MODEL_VERSION } from '@/lib/recommendations';
async function write(req: Request, save: boolean) {
    try {
        checkWrite(req);
        const u = await principal();
        const b = await body(req);
        const a = catalog.find(a => a.id === b.appId);
        const p = await getPersona(u.userId);
        if (!a || !eligible(a, p))
            throw new ApiError(404, 'App is unavailable.');
        const db = database();
        const now = new Date().toISOString();
        const op = save ? db.prepare('INSERT INTO saved_apps (user_id,app_id,saved_at) VALUES (?,?,?) ON CONFLICT(user_id,app_id) DO NOTHING').bind(u.userId, a.id, now) : db.prepare('DELETE FROM saved_apps WHERE user_id = ? AND app_id = ?').bind(u.userId, a.id);
        await db.batch([op, db.prepare('INSERT INTO events (id,user_id,app_id,event_type,created_at,model_version) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(), u.userId, a.id, save ? 'save' : 'unsave', now, MODEL_VERSION)]);
        return reply({ appId: a.id, saved: save });
    }
    catch (e) {
        return failure(e);
    }
}
export const PUT = (req: Request) => write(req, true);
export const DELETE = (req: Request) => write(req, false);
