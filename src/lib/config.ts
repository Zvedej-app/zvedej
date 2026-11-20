/**
 * Konfigurace backendu. Hodnoty se načítají z proměnných prostředí
 * (soubor .env – viz .env.example). Bez nich aplikace běží v demo režimu,
 * kdy jsou data uložena pouze v zařízení.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const HAS_BACKEND = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const CSV_BASE = 'https://www.vzpirani.cz';
export const CSV_FEEDS = {
  calendar: `${CSV_BASE}/kalendar?action=atom`,
  news: `${CSV_BASE}/aktuality?action=atom`,
};

/** Limity videí pro výzvu Vzpěrač měsíce */
export const VIDEO_MAX_SECONDS = 60;
export const VIDEO_MAX_MB = 80;

export const FEEDBACK_EMAIL = process.env.EXPO_PUBLIC_FEEDBACK_EMAIL ?? '';
