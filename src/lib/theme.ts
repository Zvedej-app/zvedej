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
  danger: string;
  success: string;
  like: string;
  tabBar: string;
  overlay: string;
}

/** Modrobílá paleta aplikace Zvedej */
export const BLUE = {
  50: '#EEF4FF',
  100: '#DCE7FF',
  200: '#B5CCFF',
  300: '#84A9FF',
  400: '#4F80FA',
  500: '#2160F0',
  600: '#1249D1',
  700: '#0E39A6',
  800: '#0C2D7E',
  900: '#081D52',
  950: '#050F2E',
};

export const lightPalette: Palette = {
  bg: '#FFFFFF',
  surface: '#F4F7FE',
  surfaceAlt: BLUE[50],
  border: '#DCE3F2',
  text: '#0A1633',
  textMuted: '#5B6B8C',
  primary: BLUE[600],
  primaryStrong: BLUE[700],
  primarySoft: BLUE[100],
  onPrimary: '#FFFFFF',
  danger: '#D92D3A',
  success: '#12915A',
  like: '#F0304E',
  tabBar: '#FFFFFF',
  overlay: 'rgba(5,15,46,0.55)',
};

export const darkPalette: Palette = {
  bg: BLUE[950],
  surface: '#0B1A44',
  surfaceAlt: '#102356',
  border: '#1C3170',
  text: '#F2F6FF',
  textMuted: '#9AABD3',
  primary: BLUE[400],
  primaryStrong: BLUE[300],
  primarySoft: '#16307A',
  onPrimary: '#FFFFFF',
  danger: '#FF5A66',
  success: '#3CCB8A',
  like: '#FF4D6A',
  tabBar: '#071437',
  overlay: 'rgba(0,0,0,0.6)',
};

export const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 };
export const space = (n: number) => n * 4;
