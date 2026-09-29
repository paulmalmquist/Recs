import { reply, failure, database, principal } from '@/server/context';
export async function GET() { try {
    await principal();
    await database().prepare('SELECT 1').first();
    return reply({ ok: true, mode: 'synthetic', version: '1.0.0' });
}
catch (e) {
    return failure(e);
} }
