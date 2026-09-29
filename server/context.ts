import { getChatGPTUser } from '@/app/chatgpt-auth';
import { env } from 'cloudflare:workers';
export class ApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export async function principal() { const u = await getChatGPTUser(); if (u)
    return u; if (import.meta.env.DEV)
    return { userId: 'local-demo', displayName: 'Local preview', email: '', fullName: null }; throw new ApiError(401, 'Sign in to access your apps.'); }
export function database() { if (!env.DB)
    throw new ApiError(503, 'Your saved apps are temporarily unavailable. Please try again.'); return env.DB; }
export function checkWrite(request: Request) { if (request.headers.get('sec-fetch-site') === 'cross-site')
    throw new ApiError(403, 'Cross-site writes are not permitted.'); const origin = request.headers.get('origin'); if (origin && origin !== new URL(request.url).origin)
    throw new ApiError(403, 'Request origin is not permitted.'); if (!request.headers.get('content-type')?.includes('application/json'))
    throw new ApiError(415, 'Use application/json.'); }
export async function body(request: Request) { const raw = await request.text(); if (raw.length > 20000)
    throw new ApiError(413, 'Request is too large.'); try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error();
    return value;
}
catch {
    throw new ApiError(400, 'Expected a JSON object.');
} }
export function reply(data: unknown, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } }); }
export function failure(error: unknown) { if (error instanceof ApiError)
    return reply({ error: error.message }, error.status); console.error('AIM request failed', error); return reply({ error: 'Something went wrong. Please try again.' }, 503); }
