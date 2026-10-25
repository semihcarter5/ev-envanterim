// Tarama isteğinin tüm kuralları burada; dış bağımlılıklar (Auth, sayaç, Gemini) dışarıdan verilir ki test edilebilsin.
import { sanitize, type FoundItem } from './sanitize.ts';

export interface Deps {
  limit: number;
  globalLimit: number;                                           // tüm kullanıcılar için günlük toplam
  hasKey: boolean;
  getUser: (jwt: string) => Promise<{ id: string } | null>;
  bump: (uid: string, limit: number) => Promise<number>;      // yeni sayaç; -1 = sınır doldu
  refund: (uid: string) => Promise<void>;
  bumpGlobal: (limit: number) => Promise<number>;                // -1 = toplam tavan doldu
  refundGlobal: () => Promise<void>;
  gemini: (imageB64: string) => Promise<{ ok: true; json: unknown } | { ok: false; status: number }>;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const MAX_B64 = 1_400_000; // ~1 MB görsel

export function makeHandler(d: Deps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const user = jwt ? await d.getUser(jwt).catch(() => null) : null;
    if (!user) return json({ error: 'unauthorized' }, 401);

    let image = '';
    try { image = String(((await req.json()) as { image?: unknown })?.image ?? ''); } catch { return json({ error: 'bad_request' }, 400); }
    image = image.replace(/^data:image\/jpeg;base64,/, '');
    if (!image || image.length > MAX_B64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image) || !image.startsWith('/9j/')) {
      return json({ error: 'bad_image' }, 400); // yalnızca küçük bir JPEG kabul edilir
    }

    // Anahtar yoksa sayaç harcanmaz.
    if (!d.hasKey) return json({ error: 'ai_not_configured' }, 503);

    const used = await d.bump(user.id, d.limit);
    if (used < 0) return json({ error: 'daily_limit', limit: d.limit }, 429);

    // Toplam tavan: sahte hesapların ücretsiz kotayı bitirmesini önler. Dolmuşsa kullanıcının hakkı iade edilir.
    const total = await d.bumpGlobal(d.globalLimit).catch(() => -1);
    if (total < 0) {
      await d.refund(user.id).catch(() => {});
      return json({ error: 'service_busy' }, 503);
    }

    const r = await d.gemini(image).catch(() => ({ ok: false as const, status: 0 }));
    if (!r.ok) {
      await d.refund(user.id).catch(() => {});
      await d.refundGlobal().catch(() => {});
      return json({ error: r.status === 429 ? 'ai_busy' : 'ai_unavailable' }, 502);
    }
    const items: FoundItem[] = sanitize(r.json);
    return json({ items, remaining: Math.max(0, d.limit - used), limit: d.limit });
  };
}
