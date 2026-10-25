// Çalıştır: deno test supabase/functions/scan
import { deepStrictEqual } from 'node:assert';
const assertEquals = (a: unknown, b: unknown, msg?: string) => deepStrictEqual(a, b, msg);
import { makeHandler, type Deps } from './handler.ts';
import { sanitize } from './sanitize.ts';

const JPEG = '/9j/' + 'A'.repeat(100);
const mk = (over: Partial<Deps> = {}) => {
  const calls = { bump: 0, refund: 0, gemini: 0, gbump: 0, grefund: 0 };
  const deps: Deps = {
    limit: 3, globalLimit: 100, hasKey: true,
    getUser: async (j) => (j === 'good' ? { id: 'u1' } : null),
    bump: async () => { calls.bump++; return 1; },
    refund: async () => { calls.refund++; },
    bumpGlobal: async () => { calls.gbump++; return 1; },
    refundGlobal: async () => { calls.grefund++; },
    gemini: async () => { calls.gemini++; return { ok: true, json: { items: [{ name: 'Süt 1 L', category: 'food', quantity: 2, expiry_date: '2099-01-01' }] } }; },
    ...over,
  };
  return { h: makeHandler(deps), calls };
};
const post = (body: unknown, token = 'good') =>
  new Request('http://x/', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });

Deno.test('CORS ve yöntem', async () => {
  const { h } = mk();
  assertEquals((await h(new Request('http://x/', { method: 'OPTIONS' }))).status, 204);
  assertEquals((await h(new Request('http://x/', { method: 'GET' }))).status, 405);
});

Deno.test('oturumsuz veya geçersiz oturum reddedilir, sayaç ve Gemini çalışmaz', async () => {
  const { h, calls } = mk();
  assertEquals((await h(new Request('http://x/', { method: 'POST', body: '{}' }))).status, 401);
  assertEquals((await h(post({ image: JPEG }, 'bad'))).status, 401);
  assertEquals(calls, { bump: 0, refund: 0, gemini: 0, gbump: 0, grefund: 0 });
});

Deno.test('geçersiz görsel reddedilir', async () => {
  const { h, calls } = mk();
  for (const image of ['', 'merhaba', 'iVBORw0KGgo=', '/9j/' + '!'.repeat(10), '/9j/' + 'A'.repeat(1_400_001), 5]) {
    assertEquals((await h(post({ image }))).status, 400, String(image).slice(0, 20));
  }
  assertEquals((await h(new Request('http://x/', { method: 'POST', headers: { Authorization: 'Bearer good' }, body: 'json-degil' }))).status, 400);
  assertEquals(calls.bump, 0);
});

Deno.test('data URL öneki kabul edilir', async () => {
  const { h } = mk();
  assertEquals((await h(post({ image: 'data:image/jpeg;base64,' + JPEG }))).status, 200);
});

Deno.test('anahtar yoksa 503 ve sayaç harcanmaz', async () => {
  const { h, calls } = mk({ hasKey: false });
  const r = await h(post({ image: JPEG }));
  assertEquals(r.status, 503); assertEquals((await r.json()).error, 'ai_not_configured'); assertEquals(calls.bump, 0);
});

Deno.test('günlük sınır dolunca 429 ve Gemini çağrılmaz', async () => {
  const { h, calls } = mk({ bump: async () => -1 });
  const r = await h(post({ image: JPEG }));
  assertEquals(r.status, 429); assertEquals((await r.json()).error, 'daily_limit'); assertEquals(calls.gemini, 0);
});

Deno.test('Gemini hatasında hak iade edilir; hata ayrıntısı sızmaz', async () => {
  for (const [status, err] of [[429, 'ai_busy'], [500, 'ai_unavailable'], [0, 'ai_unavailable']] as const) {
    const { h, calls } = mk({ gemini: async () => ({ ok: false, status }) });
    const r = await h(post({ image: JPEG }));
    assertEquals(r.status, 502); assertEquals(await r.json(), { error: err }); assertEquals(calls.refund, 1);
  }
  const { h, calls } = mk({ gemini: async () => { throw new Error('anahtar: SECRET'); } });
  const r = await h(post({ image: JPEG }));
  assertEquals(r.status, 502); assertEquals(calls.refund, 1);
  assertEquals((await r.text()).includes('SECRET'), false);
});

Deno.test('başarılı cevap: kalan hak ve temiz ürünler', async () => {
  const { h } = mk({ bump: async () => 2 });
  const b = await (await h(post({ image: JPEG }))).json();
  assertEquals(b.remaining, 1); assertEquals(b.limit, 3);
  assertEquals(b.items, [{ name: 'Süt 1 L', category: 'food', quantity: 2, expiry_date: null }]); // 2099 makul aralık dışı
});

Deno.test('sanitize: kötü veriyi temizler', () => {
  const now = new Date('2026-10-26T00:00:00Z');
  const out = sanitize({ items: [
    { name: '  Makarna\n<b>500</b> g ', category: 'food', quantity: 500, expiry_date: '2027-03-31' },
    { name: 'makarna\n<b>500</b> g', category: 'food' },                                   // tekrar
    { name: 'Şarj aleti', category: 'tuhaf', quantity: -4, expiry_date: '2027-01-01' },       // eşya: tarih atılır
    { name: 'D vitamini', category: 'medicine', quantity: 'x', expiry_date: '2027-02-30' },   // geçersiz tarih
    { name: '', category: 'food' }, null, 7, { name: 'Y'.repeat(500), category: 'food' },
  ] }, now);
  assertEquals(out[0], { name: 'Makarna b 500 /b g', category: 'food', quantity: 99, expiry_date: '2027-03-31' });
  assertEquals(out[1], { name: 'Şarj aleti', category: 'item', quantity: 1, expiry_date: null });
  assertEquals(out[2], { name: 'D vitamini', category: 'medicine', quantity: 1, expiry_date: null });
  assertEquals(out[3].name.length, 120);
  assertEquals(out.length, 4);
  assertEquals(sanitize('x'), []); assertEquals(sanitize({ items: 'x' }), []);
  assertEquals(sanitize({ items: Array.from({ length: 30 }, (_, i) => ({ name: 'u' + i, category: 'item' })) }).length, 12);
});

Deno.test('toplam tavan dolunca 503, kullanıcı hakkı iade edilir ve Gemini çağrılmaz', async () => {
  const { h, calls } = mk({ bumpGlobal: async () => -1 });
  const r = await h(post({ image: JPEG }));
  assertEquals(r.status, 503); assertEquals((await r.json()).error, 'service_busy');
  assertEquals(calls.refund, 1); assertEquals(calls.gemini, 0);
});

Deno.test('toplam sayaç hata verirse güvenli tarafta kalınır (503, iade)', async () => {
  const { h, calls } = mk({ bumpGlobal: async () => { throw new Error('db'); } });
  assertEquals((await h(post({ image: JPEG }))).status, 503);
  assertEquals(calls.refund, 1); assertEquals(calls.gemini, 0);
});

Deno.test('kullanıcı sınırı dolmuşsa toplam sayaç harcanmaz', async () => {
  const { h, calls } = mk({ bump: async () => -1 });
  await h(post({ image: JPEG }));
  assertEquals(calls.gbump, 0);
});

Deno.test('Gemini hatasında hem kullanıcı hem toplam hak iade edilir', async () => {
  const { h, calls } = mk({ gemini: async () => ({ ok: false, status: 500 }) });
  assertEquals((await h(post({ image: JPEG }))).status, 502);
  assertEquals(calls.refund, 1); assertEquals(calls.grefund, 1);
});
