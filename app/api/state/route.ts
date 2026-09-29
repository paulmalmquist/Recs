import { principal, database, reply, failure, checkWrite, body, ApiError } from '@/server/context';
import { getState } from '@/server/state';
import { personas } from '@/lib/catalog';
export async function GET() { try {
    const u = await principal();
    return reply(await getState(u.userId, u.displayName));
}
catch (e) {
    return failure(e);
} }
export async function PATCH(req: Request) { try {
    checkWrite(req);
    const u = await principal();
    const b = await body(req);
    if (!personas.some(p => p.id === b.persona))
        throw new ApiError(400, 'Choose an available demo profile.');
    await database().prepare('INSERT INTO profiles (user_id,persona) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET persona = excluded.persona').bind(u.userId, b.persona).run();
    return reply(await getState(u.userId, u.displayName));
}
catch (e) {
    return failure(e);
} }
