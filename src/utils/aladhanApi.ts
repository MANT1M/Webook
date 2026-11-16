import {
  PrayerTableRow,
  formatMinutesToHHMM,
  parseTimeToMinutes,
} from './prayerTimes';

export type PrayerCalculationSource = 'cdum' | 'aladhan';

export type AladhanSchool = 1 | 0;

export type AladhanMethodId = 14 | 1 | 3 | 13 | 4;

export interface AladhanMethodMeta {
  id: AladhanMethodId;
  nameRu: string;
  shortLabelRu: string;
  anglesInfoRu: string;
}

export interface AladhanSchoolMeta {
  id: AladhanSchool;
  nameRu: string;
  shortLabelRu: string;
  descriptionRu: string;
}

export const ALADHAN_SCHOOLS: AladhanSchoolMeta[] = [
  {
    id: 1,
    nameRu: 'Ханафитский мазхаб',
    shortLabelRu: 'Аср: Ханафитский',
    descriptionRu:
      'Время намаза Аср наступает, когда тень предмета равна двум его длинам плюс полуденная тень.',
  },
  {
    id: 0,
    nameRu: 'Шафиитский / Маликитский / Ханбалитский',
    shortLabelRu: 'Аср: Шафиитский',
    descriptionRu:
      'Время намаза Аср наступает раньше — когда тень предмета равна одной его длине плюс полуденная тень.',
  },
];

export const ALADHAN_METHODS: AladhanMethodMeta[] = [
  {
    id: 14,
    nameRu: 'ДУМ РФ / Россия',
    shortLabelRu: 'ДУМ РФ',
    anglesInfoRu: 'Фаджр 16°, Иша 15°',
  },
  {
    id: 1,
    nameRu: 'Университет исламских наук Карачи',
    shortLabelRu: 'Карачи',
    anglesInfoRu: 'Фаджр 18°, Иша 18°',
  },
  {
    id: 3,
    nameRu: 'Всемирная исламская лига MWL',
    shortLabelRu: 'MWL',
    anglesInfoRu: 'Фаджр 18°, Иша 17°',
  },
  {
    id: 13,
    nameRu: 'Diyanet, Турция',
    shortLabelRu: 'Diyanet Турция',
    anglesInfoRu: 'Фаджр 18°, Иша 17°',
  },
  {
    id: 4,
    nameRu: 'Умм аль-Кура, Мекка',
    shortLabelRu: 'Умм аль-Кура',
    anglesInfoRu: 'Фаджр 18.5°, Иша через 90 мин после Магриба',
  },
];

const SOURCE_STORAGE_KEY = 'namaz_calc_source_v1';
const SCHOOL_STORAGE_KEY = 'namaz_aladhan_school_v1';
const METHOD_STORAGE_KEY = 'namaz_aladhan_method_v1';

export function loadSavedCalculationSource(): PrayerCalculationSource {
  try {
    if (typeof window === 'undefined') return 'cdum';
    const val = window.localStorage.getItem(SOURCE_STORAGE_KEY);
    if (val === 'aladhan' || val === 'cdum') return val;
  } catch {
    // ignore
  }
  return 'cdum';
}

export function saveCalculationSource(source: PrayerCalculationSource): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SOURCE_STORAGE_KEY, source);
    }
  } catch {
    // ignore
  }
}

export function loadSavedAladhanSchool(): AladhanSchool {
  try {
    if (typeof window === 'undefined') return 1;
    const val = window.localStorage.getItem(SCHOOL_STORAGE_KEY);
    if (val === '0') return 0;
    if (val === '1') return 1;
  } catch {
    // ignore
  }
  return 1;
}

export function saveAladhanSchool(school: AladhanSchool): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SCHOOL_STORAGE_KEY, String(school));
    }
  } catch {
    // ignore
  }
}

export function loadSavedAladhanMethod(): AladhanMethodId {
  try {
    if (typeof window === 'undefined') return 14;
    const val = Number(window.localStorage.getItem(METHOD_STORAGE_KEY));
    if (val === 14 || val === 1 || val === 3 || val === 13 || val === 4) {
      return val;
    }
  } catch {
    // ignore
  }
  return 14;
}

export function saveAladhanMethod(method: AladhanMethodId): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(METHOD_STORAGE_KEY, String(method));
    }
  } catch {
    // ignore
  }
}

interface AladhanDayItem {
  timings: {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
  date: {
    gregorian: {
      day: string;
      month: {
        number: number;
      };
      year: string;
    };
  };
}

interface AladhanYearCalendarResponse {
  code: number;
  data: Record<string, AladhanDayItem[]>;
}

const yearCalendarCache = new Map<
  string,
  Record<string, [string, string, string, string, string, string]>
>();

function cleanAladhanTime(raw: string): string {
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return raw.trim();
  return `${parseInt(match[1], 10)}:${match[2]}`;
}

async function fetchAladhanYearLookup(
  year: number,
  lat: number,
  lon: number,
  method: AladhanMethodId,
  school: AladhanSchool
): Promise<Record<string, [string, string, string, string, string, string]>> {
  const cacheKey = `${year}_${lat.toFixed(4)}_${lon.toFixed(4)}_${method}_${school}`;
  const existing = yearCalendarCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const url = `https://api.aladhan.com/v1/calendar/${year}?latitude=${encodeURIComponent(
    lat
  )}&longitude=${encodeURIComponent(lon)}&method=${method}&school=${school}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Ошибка ответа AlAdhan API: ${response.status}`);
  }

  const json = (await response.json()) as AladhanYearCalendarResponse;
  if (!json || json.code !== 200 || !json.data) {
    throw new Error('Некорректный формат ответа от AlAdhan API');
  }

  const lookup: Record<
    string,
    [string, string, string, string, string, string]
  > = {};

  for (const [monthKey, daysList] of Object.entries(json.data)) {
    const monthNum = Number(monthKey);
    if (!Array.isArray(daysList)) continue;
    for (const item of daysList) {
      const dayNum = parseInt(item.date?.gregorian?.day || '0', 10);
      if (!dayNum || !item.timings) continue;
      lookup[`${year}_${monthNum}_${dayNum}`] = [
        cleanAladhanTime(item.timings.Fajr),
        cleanAladhanTime(item.timings.Sunrise),
        cleanAladhanTime(item.timings.Dhuhr),
        cleanAladhanTime(item.timings.Asr),
        cleanAladhanTime(item.timings.Maghrib),
        cleanAladhanTime(item.timings.Isha),
      ];
    }
  }

  yearCalendarCache.set(cacheKey, lookup);
  return lookup;
}

/**
 * Запрашивает математический расчёт времени намаза от AlAdhan API
 * для всех дат переданного расписания (по координатам города, методу и мазхабу Аср).
 */
export async function fetchAladhanScheduleForRows(
  baseRows: PrayerTableRow[],
  lat: number,
  lon: number,
  method: AladhanMethodId,
  school: AladhanSchool
): Promise<PrayerTableRow[]> {
  const uniqueYears = Array.from(new Set(baseRows.map((r) => r.year)));
  const yearMaps = await Promise.all(
    uniqueYears.map((yr) =>
      fetchAladhanYearLookup(yr, lat, lon, method, school)
    )
  );

  const combinedLookup: Record<
    string,
    [string, string, string, string, string, string]
  > = Object.assign({}, ...yearMaps);

  return baseRows.map((row) => {
    const found = combinedLookup[`${row.year}_${row.month}_${row.day}`];
    if (!found) return row;
    const [fajr, sunrise, dhuhr, asr, maghrib, isha] = found;
    const suhoorEnd =
      row.periodId === 'feb_mar'
        ? formatMinutesToHHMM(parseTimeToMinutes(fajr) - 20)
        : undefined;
    return {
      ...row,
      fajr,
      sunrise,
      dhuhr,
      asr,
      maghrib,
      isha,
      ...(suhoorEnd ? { suhoorEnd } : {}),
    };
  });
}
