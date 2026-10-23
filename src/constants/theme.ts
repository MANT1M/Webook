import { ThemeMode } from '../types/reader';

export interface ThemeConfig {
  name: string;
  bg: string;
  fg: string;
  surface: string;
}

export const BRAND_COLORS = {
  primaryBg: '#06372C',
  primaryText: '#FEF3C7',
  secondaryText: '#FDE68A',
  amberAccent: '#B45309',
  amberProgress: '#F59E0B',
  emeraldSuccess: '#15803D',
  redError: '#B91C1C',
} as const;

export const THEMES: Record<ThemeMode, ThemeConfig> = {
  LIGHT: {
    name: 'Светлая',
    bg: '#FAF9F6',
    fg: '#1C1B1F',
    surface: '#EFECE6',
  },
  SEPIA: {
    name: 'Сепия',
    bg: '#F4ECD8',
    fg: '#3E3023',
    surface: '#E6DBC2',
  },
  NIGHT: {
    name: 'Ночная',
    bg: '#141518',
    fg: '#D8DAE0',
    surface: '#202227',
  },
};

export const READER_LIMITS = {
  FONT_SIZE_MIN: 14,
  FONT_SIZE_MAX: 28,
  FONT_SIZE_STEP: 2,
  FONT_SIZE_DEFAULT: 18,
  ARABIC_SCALE_MIN: 1.0,
  ARABIC_SCALE_MAX: 2.0,
  ARABIC_SCALE_STEP: 0.05,
  ARABIC_SCALE_DEFAULT: 1.35,
  PASSING_SCORE: 75,
} as const;
