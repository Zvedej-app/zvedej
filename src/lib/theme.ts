export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  onPrimary: string;
  /** červený akcent z české vlajky */
  accent: string;
  accentSoft: string;
  danger: string;
  success: string;
  like: string;
  tabBar: string;
  overlay: string;
  /** barvy typů závodů */
  mcr: string;
  liga: string;
  other: string;
}

/** Tmavě modrá jako nápis v ikoně aplikace, červená přesně podle loga ČSV (koruna a kotouče činky), bílá */
export const FLAG = { blue: '#0A3666', red: '#C0000C', white: '#FFFFFF' };

export const BLUE = {
  50: '#EEF2F7',
  100: '#DDE6F2',
  200: '#A9BFDC',
  300: '#6F93C3',
  400: '#3F6FAE',
  500: '#14477F',
  600: '#0A3666',
  700: '#082B52',
  800: '#062244',
  900: '#071B35',
  950: '#07142A',
};

export const lightPalette: Palette = {
  bg: '#FFFFFF',
  surface: '#F5F7FA',
  surfaceAlt: '#EEF2F7',
  border: '#DCE3EC',
  text: '#0A1633',
  textMuted: '#5B6B84',
  primary: FLAG.blue,
  primaryStrong: '#082B52',
  primarySoft: '#DDE6F2',
  onPrimary: '#FFFFFF',
  accent: FLAG.red,
  accentSoft: '#F8DADC',
  danger: '#C0000C',
  success: '#16A34A',
  like: FLAG.red,
  tabBar: '#FFFFFF',
  overlay: 'rgba(7,20,42,0.55)',
  mcr: FLAG.red,
  liga: FLAG.blue,
  other: '#6B7A90',
};

export const darkPalette: Palette = {
  bg: '#07142A',
  surface: '#0E1F3D',
  surfaceAlt: '#142A4D',
  border: '#203A66',
  text: '#F2F6FB',
  textMuted: '#9DB0CC',
  primary: '#4F86C9',
  primaryStrong: '#8DB4E3',
  primarySoft: '#16335E',
  onPrimary: '#FFFFFF',
  accent: '#C0000C',
  accentSoft: '#3A0B12',
  danger: '#C0000C',
  success: '#22C55E',
  like: '#C0000C',
  tabBar: '#061226',
  overlay: 'rgba(0,0,0,0.6)',
  mcr: '#C0000C',
  liga: '#4F86C9',
  other: '#8A97AB',
};

export const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 };
export const space = (n: number) => n * 4;
