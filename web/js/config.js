// Supabase bağlantı bilgileri.
// Bu iki değer herkese açık olabilir: veriyi sunucudaki satır bazlı güvenlik kuralları (RLS) korur.
// Kendi kopyanı kuruyorsan README'deki adımlarla kendi projenin değerlerini yaz.
export const SUPABASE_URL = 'https://zjshhkttbpfshznrjrrx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NM8yhk9wRf1LFJor8TX33A_MSUL5jK9';

// Google ile giriş düğmesi. Supabase'de Authentication > Sign In / Providers > Google açılıp
// OAuth bilgileri girildikten sonra true yap. Kapalıyken düğme hiç görünmez.
export const GOOGLE_LOGIN = true;
