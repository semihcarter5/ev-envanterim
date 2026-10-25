// Barkod okuma ve ürün adı arama.
// Okuma: tarayıcının yerleşik BarcodeDetector'ı varsa o, yoksa (iOS Safari gibi) zxing kütüphanesi.
// Ad arama: Open Food Facts (ücretsiz, açık veritabanı). Dışarı yalnızca barkod numarası gider.
import { norm } from './lib.js';

export const isCode = (c) => /^\d{8,14}$/.test(String(c));
const NATIVE = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
let readerP = null;

function getReader() {
  readerP ??= (async () => {
    if ('BarcodeDetector' in window) {
      try {
        const sup = await window.BarcodeDetector.getSupportedFormats();
        const formats = NATIVE.filter((f) => sup.includes(f));
        if (formats.length) {
          const d = new window.BarcodeDetector({ formats });
          return { detect: async (src) => (await d.detect(src))[0]?.rawValue || null };
        }
      } catch { /* yedeğe geç */ }
    }
    const zx = await import('https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/+esm');
    const reader = new zx.MultiFormatReader();
    reader.setHints(new Map([
      [zx.DecodeHintType.POSSIBLE_FORMATS, [zx.BarcodeFormat.EAN_13, zx.BarcodeFormat.EAN_8, zx.BarcodeFormat.UPC_A, zx.BarcodeFormat.UPC_E]],
      [zx.DecodeHintType.TRY_HARDER, true],
    ]));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return {
      detect: async (src) => {
        const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
        if (!sw || !sh) return null;
        const k = Math.min(1, 1280 / Math.max(sw, sh));
        const w = Math.round(sw * k), h = Math.round(sh * k);
        canvas.width = w; canvas.height = h;
        ctx.drawImage(src, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const lum = new Uint8ClampedArray(w * h);
        for (let i = 0; i < lum.length; i++) lum[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000;
        try { return reader.decode(new zx.BinaryBitmap(new zx.HybridBinarizer(new zx.RGBLuminanceSource(lum, w, h)))).getText(); }
        catch { return null; } // bu karede barkod yok
      },
    };
  })();
  return readerP;
}
/** src: video, canvas, img veya ImageBitmap. Bulunursa rakamlardan oluşan barkod, yoksa null. */
export async function readBarcode(src) {
  const code = await (await getReader()).detect(src);
  return code && isCode(code) ? code : null;
}

/** Barkoddan ürün adı. Bulunamazsa null; ağ hatasında hata fırlatır. */
export async function lookupProduct(code) {
  if (!isCode(code)) return null;
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_tr,generic_name,brands,quantity`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const j = await r.json();
  const p = j?.status === 1 ? j.product : null;
  const base = String(p?.product_name_tr || p?.product_name || p?.generic_name || '').trim();
  if (!base) return null;
  const brand = String(p.brands || '').split(',')[0].trim();
  let name = brand && !norm(base).includes(norm(brand)) ? `${brand} ${base}` : base;
  const q = String(p.quantity || '').trim();
  if (q && !norm(name).includes(norm(q))) name += ` ${q}`;
  return name.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}
