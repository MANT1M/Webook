import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Image as ImageIcon,
  Compass,
  MapPin,
  Search,
  X,
  Check,
} from 'lucide-react';
import {
  PRAYER_SCHEDULE_TABLE,
  PRAYER_SCHEDULE_BY_CITY,
  PRAYER_SCHEDULE_CITIES,
  PRAYER_ITEMS_META,
  PRAYER_PERIODS,
  PrayerKey,
  PrayerPeriodId,
  PrayerScheduleCityId,
  PrayerTableRow,
  findTodayRowIndex,
  getActiveAndNextPrayerFromRow,
  loadSavedPrayerCity,
  savePrayerCity,
} from '../utils/prayerTimes';
import {
  QIBLA_CITY_PRESETS,
  QiblaLocationState,
  calculateQiblaFromCoords,
  estimateMagneticDeclination,
  loadSavedQiblaLocation,
  saveQiblaLocation,
} from '../utils/qiblaGeodesy';
import {
  ALADHAN_METHODS,
  ALADHAN_SCHOOLS,
  AladhanMethodId,
  AladhanSchool,
  PrayerCalculationSource,
  fetchAladhanScheduleForRows,
  loadSavedAladhanMethod,
  loadSavedAladhanSchool,
  loadSavedCalculationSource,
  saveAladhanMethod,
  saveAladhanSchool,
  saveCalculationSource,
} from '../utils/aladhanApi';
import {
  ALL_RUSSIAN_CITIES,
  RussianCityItem,
  findRussianCityByName,
  loadSavedAladhanRussianCity,
  saveAladhanRussianCity,
} from '../utils/russianCities';
import { QiblaFinderPanel } from './QiblaFinderPanel';
import { PortalSection } from './PortalHeader';

export interface PrayerTimesBlockProps {
  onSelectSection?: (section: PortalSection) => void;
}

const PRAYER_ICONS: Record<PrayerKey, React.FC<{ className?: string }>> = {
  fajr: Moon,
  sunrise: Sunrise,
  dhuhr: Sun,
  asr: Sun,
  maghrib: Sunset,
  isha: Moon,
};

const MOBILE_SHORT_LABELS: Record<
  PrayerKey,
  { tt: string; ru: string }
> = {
  fajr: { tt: 'Иртәнге', ru: 'Фаджр' },
  sunrise: { tt: 'Кояш', ru: 'Шурук' },
  dhuhr: { tt: 'Өйлә', ru: 'Зухр' },
  asr: { tt: 'Икенде', ru: 'Аср' },
  maghrib: { tt: 'Ахшам', ru: 'Магриб' },
  isha: { tt: 'Ястү', ru: 'Иша' },
};

export const PrayerTimesBlock: React.FC<PrayerTimesBlockProps> = ({
  onSelectSection,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());

  const [scheduleCityId, setScheduleCityId] = useState<PrayerScheduleCityId>(
    () => loadSavedPrayerCity()
  );

  const [calculationSource, setCalculationSource] =
    useState<PrayerCalculationSource>(() => loadSavedCalculationSource());
  const [aladhanSchool, setAladhanSchool] = useState<AladhanSchool>(() =>
    loadSavedAladhanSchool()
  );
  const [aladhanMethod, setAladhanMethod] = useState<AladhanMethodId>(() =>
    loadSavedAladhanMethod()
  );
  const [aladhanSchedule, setAladhanSchedule] = useState<
    PrayerTableRow[] | null
  >(null);
  const [isLoadingAladhan, setIsLoadingAladhan] = useState<boolean>(false);
  const [aladhanError, setAladhanError] = useState<string | null>(null);

  const [aladhanCity, setAladhanCity] = useState<RussianCityItem>(() => {
    const savedCdumId = loadSavedPrayerCity();
    const cdumMeta = PRAYER_SCHEDULE_CITIES.find((c) => c.id === savedCdumId);
    return loadSavedAladhanRussianCity(cdumMeta?.nameRu || 'Уфа');
  });
  const [isCitySearchOpen, setIsCitySearchOpen] = useState<boolean>(false);
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');
  const cityDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isCitySearchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCitySearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCitySearchOpen]);

  const filteredRussianCities = useMemo(() => {
    const q = citySearchQuery.trim().toLowerCase();
    if (!q) return ALL_RUSSIAN_CITIES;
    return ALL_RUSSIAN_CITIES.filter(
      (c) =>
        c.nameRu.toLowerCase().includes(q) ||
        c.regionRu.toLowerCase().includes(q)
    );
  }, [citySearchQuery]);

  const baseCitySchedule = useMemo(() => {
    if (calculationSource === 'aladhan') {
      const matchedCdum = PRAYER_SCHEDULE_CITIES.find(
        (c) => c.nameRu.toLowerCase() === aladhanCity.nameRu.toLowerCase()
      );
      if (matchedCdum && matchedCdum.id === 'ufa') {
        return PRAYER_SCHEDULE_TABLE;
      }
      return PRAYER_SCHEDULE_BY_CITY.moscow;
    }
    return PRAYER_SCHEDULE_BY_CITY[scheduleCityId] || PRAYER_SCHEDULE_TABLE;
  }, [calculationSource, scheduleCityId, aladhanCity.nameRu]);

  const selectedCityCoords = useMemo(() => {
    if (calculationSource === 'aladhan') {
      return { lat: aladhanCity.lat, lon: aladhanCity.lon };
    }
    const found = QIBLA_CITY_PRESETS.find((c) => c.id === scheduleCityId);
    if (found) {
      return { lat: found.lat, lon: found.lon };
    }
    return { lat: 54.7388, lon: 55.9721 };
  }, [calculationSource, aladhanCity.lat, aladhanCity.lon, scheduleCityId]);

  useEffect(() => {
    if (calculationSource !== 'aladhan') {
      setAladhanError(null);
      return;
    }
    let cancelled = false;
    setIsLoadingAladhan(true);
    setAladhanError(null);
    fetchAladhanScheduleForRows(
      baseCitySchedule,
      selectedCityCoords.lat,
      selectedCityCoords.lon,
      aladhanMethod,
      aladhanSchool
    )
      .then((rows) => {
        if (!cancelled) {
          setAladhanSchedule(rows);
          setIsLoadingAladhan(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setIsLoadingAladhan(false);
          setAladhanError(
            err instanceof Error
              ? err.message
              : 'Не удалось загрузить расчёт от AlAdhan API'
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    calculationSource,
    baseCitySchedule,
    selectedCityCoords.lat,
    selectedCityCoords.lon,
    aladhanMethod,
    aladhanSchool,
  ]);

  const currentCitySchedule = useMemo(() => {
    if (
      calculationSource === 'aladhan' &&
      aladhanSchedule &&
      aladhanSchedule.length === baseCitySchedule.length
    ) {
      return aladhanSchedule;
    }
    return baseCitySchedule;
  }, [calculationSource, aladhanSchedule, baseCitySchedule]);

  const todayRowIndex = useMemo(
    () => findTodayRowIndex(now, currentCitySchedule),
    [now, currentCitySchedule]
  );

  const availablePeriods = useMemo(() => {
    const presentIds = new Set(currentCitySchedule.map((r) => r.periodId));
    const isUfaFullHijri =
      calculationSource === 'cdum'
        ? scheduleCityId === 'ufa'
        : aladhanCity.nameRu.toLowerCase() === 'уфа';
    return PRAYER_PERIODS.filter((p) => presentIds.has(p.id)).map((p) => {
      if (!isUfaFullHijri && p.id === 'dec_jan') {
        return {
          ...p,
          title: '10 декабря — 31 декабря 2026 (Рәҗәб · Һиҗри 1–22)',
          shortTitle: '10 дек — 31 дек',
          footnotes: p.footnotes.slice(0, 1),
        };
      }
      return p;
    });
  }, [
    currentCitySchedule,
    calculationSource,
    scheduleCityId,
    aladhanCity.nameRu,
  ]);

  const activeCityMeta = useMemo(
    () =>
      PRAYER_SCHEDULE_CITIES.find((c) => c.id === scheduleCityId) ||
      PRAYER_SCHEDULE_CITIES[0],
    [scheduleCityId]
  );

  const displayCityNameRu =
    calculationSource === 'aladhan'
      ? aladhanCity.nameRu
      : activeCityMeta.nameRu;

  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(() => {
    const initCity = loadSavedPrayerCity();
    const initSchedule =
      PRAYER_SCHEDULE_BY_CITY[initCity] || PRAYER_SCHEDULE_TABLE;
    return findTodayRowIndex(new Date(), initSchedule);
  });
  const [tableFilterPeriod, setTableFilterPeriod] = useState<
    PrayerPeriodId | 'all'
  >(() => {
    const initCity = loadSavedPrayerCity();
    const initSchedule =
      PRAYER_SCHEDULE_BY_CITY[initCity] || PRAYER_SCHEDULE_TABLE;
    const initialRow = initSchedule[findTodayRowIndex(new Date(), initSchedule)];
    return initialRow ? initialRow.periodId : 'oct_nov';
  });
  const [showFullTable, setShowFullTable] = useState<boolean>(false);
  const [showOriginalImage, setShowOriginalImage] = useState<boolean>(false);
  const [showQiblaPanel, setShowQiblaPanel] = useState<boolean>(false);

  // Состояние локации для расчёта Киблы (по умолчанию — Уфа, 206.5° ЮЗ)
  const [qiblaLocation, setQiblaLocation] = useState<QiblaLocationState>(() =>
    loadSavedQiblaLocation()
  );
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const qiblaResult = useMemo(
    () =>
      calculateQiblaFromCoords(
        qiblaLocation.lat,
        qiblaLocation.lon,
        qiblaLocation.magneticDeclinationDeg
      ),
    [
      qiblaLocation.lat,
      qiblaLocation.lon,
      qiblaLocation.magneticDeclinationDeg,
    ]
  );

  const handleSelectQiblaCity = (cityId: string) => {
    const found = QIBLA_CITY_PRESETS.find((c) => c.id === cityId);
    if (!found) return;
    setGpsError(null);
    const nextState: QiblaLocationState = {
      cityId: found.id,
      labelRu: found.nameRu,
      lat: found.lat,
      lon: found.lon,
      magneticDeclinationDeg: found.magneticDeclinationDeg,
      source: 'preset',
    };
    setQiblaLocation(nextState);
    saveQiblaLocation(nextState);
  };

  const handleUpdateQiblaPinCoords = (newLat: number, newLon: number) => {
    setGpsError(null);
    const nextState: QiblaLocationState = {
      cityId: 'custom_pin',
      labelRu: `Дом на карте (${newLat.toFixed(4)}°, ${newLon.toFixed(4)}°)`,
      lat: newLat,
      lon: newLon,
      magneticDeclinationDeg: estimateMagneticDeclination(newLat, newLon),
      source: 'map_pin',
    };
    setQiblaLocation(nextState);
    saveQiblaLocation(nextState);
  };

  const handleRequestQiblaGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError(
        'Геолокация не поддерживается вашим браузером. Выберите город из списка или укажите свой дом на Яндекс.Карте.'
      );
      return;
    }
    setIsLocatingGps(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lon = Math.round(pos.coords.longitude * 1000000) / 1000000;
        const nextState: QiblaLocationState = {
          cityId: 'custom_gps',
          labelRu: 'Моё местоположение (GPS)',
          lat,
          lon,
          magneticDeclinationDeg: estimateMagneticDeclination(lat, lon),
          source: 'gps',
        };
        setQiblaLocation(nextState);
        saveQiblaLocation(nextState);
      },
      (err) => {
        setIsLocatingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError(
            'Доступ к геопозиции запрещён в настройках браузера. Выберите город из списка или укажите свой дом кликом на Яндекс.Карте.'
          );
        } else {
          setGpsError(
            'Не удалось получить сигнал GPS. Проверьте геолокацию на телефоне или выберите свой дом на Яндекс.Карте.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Живой таймер каждую секунду
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSelectScheduleCity = (nextCityId: PrayerScheduleCityId) => {
    setScheduleCityId(nextCityId);
    savePrayerCity(nextCityId);
    const cdumCity = PRAYER_SCHEDULE_CITIES.find((c) => c.id === nextCityId);
    if (cdumCity) {
      const matchedRu = findRussianCityByName(cdumCity.nameRu);
      if (matchedRu) {
        setAladhanCity(matchedRu);
        saveAladhanRussianCity(matchedRu);
      }
    }
    const nextSchedule =
      PRAYER_SCHEDULE_BY_CITY[nextCityId] || PRAYER_SCHEDULE_TABLE;
    if (selectedRowIndex >= nextSchedule.length) {
      const nextTodayIdx = findTodayRowIndex(now, nextSchedule);
      setSelectedRowIndex(nextTodayIdx);
      const fallbackRow = nextSchedule[nextTodayIdx] || nextSchedule[0];
      if (fallbackRow && tableFilterPeriod !== 'all') {
        setTableFilterPeriod(fallbackRow.periodId);
      }
    } else if (
      tableFilterPeriod !== 'all' &&
      !nextSchedule.some((r) => r.periodId === tableFilterPeriod)
    ) {
      const currentRow = nextSchedule[selectedRowIndex] || nextSchedule[0];
      if (currentRow) {
        setTableFilterPeriod(currentRow.periodId);
      }
    }
    if (qiblaLocation.source === 'preset') {
      handleSelectQiblaCity(nextCityId);
    }
  };

  const handleSelectAladhanRussianCity = (city: RussianCityItem) => {
    setAladhanCity(city);
    saveAladhanRussianCity(city);
    setIsCitySearchOpen(false);
    setCitySearchQuery('');

    const matchedCdum = PRAYER_SCHEDULE_CITIES.find(
      (c) => c.nameRu.toLowerCase() === city.nameRu.toLowerCase()
    );
    if (matchedCdum) {
      setScheduleCityId(matchedCdum.id);
      savePrayerCity(matchedCdum.id);
    }

    const nextSchedule =
      matchedCdum?.id === 'ufa'
        ? PRAYER_SCHEDULE_TABLE
        : PRAYER_SCHEDULE_BY_CITY.moscow;
    if (selectedRowIndex >= nextSchedule.length) {
      const nextTodayIdx = findTodayRowIndex(now, nextSchedule);
      setSelectedRowIndex(nextTodayIdx);
      const fallbackRow = nextSchedule[nextTodayIdx] || nextSchedule[0];
      if (fallbackRow && tableFilterPeriod !== 'all') {
        setTableFilterPeriod(fallbackRow.periodId);
      }
    }

    if (qiblaLocation.source === 'preset') {
      const nextQiblaState: QiblaLocationState = {
        cityId: matchedCdum ? matchedCdum.id : city.id,
        labelRu: city.nameRu,
        lat: city.lat,
        lon: city.lon,
        magneticDeclinationDeg: estimateMagneticDeclination(city.lat, city.lon),
        source: 'preset',
      };
      setQiblaLocation(nextQiblaState);
      saveQiblaLocation(nextQiblaState);
    }
  };

  const activeRow: PrayerTableRow =
    currentCitySchedule[selectedRowIndex] || currentCitySchedule[0];

  const nextDayRow: PrayerTableRow =
    currentCitySchedule[
      (selectedRowIndex + 1) % currentCitySchedule.length
    ];

  // Автоматически переключаем вкладку таблицы при выборе дня из другого периода
  const handleSelectDayIndex = (idx: number) => {
    setSelectedRowIndex(idx);
    const targetRow = currentCitySchedule[idx];
    if (
      targetRow &&
      tableFilterPeriod !== 'all' &&
      tableFilterPeriod !== targetRow.periodId
    ) {
      setTableFilterPeriod(targetRow.periodId);
    }
  };

  const activeStatus = useMemo(
    () => getActiveAndNextPrayerFromRow(activeRow, nextDayRow, now),
    [activeRow, nextDayRow, now]
  );

  // Форматирование обратного отсчёта ЧЧ:ММ:СС
  const countdownFormatted = useMemo(() => {
    const total = activeStatus.secondsRemaining;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [activeStatus.secondsRemaining]);

  const nextPrayerMeta = useMemo(
    () =>
      PRAYER_ITEMS_META.find((p) => p.key === activeStatus.nextKey) ||
      PRAYER_ITEMS_META[0],
    [activeStatus.nextKey]
  );

  const currentPrayerMeta = useMemo(
    () =>
      activeStatus.activeKey
        ? PRAYER_ITEMS_META.find((p) => p.key === activeStatus.activeKey) || null
        : null,
    [activeStatus.activeKey]
  );

  const filteredTableRows = useMemo(() => {
    return currentCitySchedule.map((row, globalIndex) => ({
      row,
      globalIndex,
    })).filter(({ row }) =>
      tableFilterPeriod === 'all' ? true : row.periodId === tableFilterPeriod
    );
  }, [currentCitySchedule, tableFilterPeriod]);

  const isViewingToday = selectedRowIndex === todayRowIndex;

  // Счётчик дней и прогресс-полоска до священного месяца Рамадан
  const ramadanStatus = useMemo(() => {
    const currentDate = new Date(
      activeRow.year,
      activeRow.month - 1,
      activeRow.day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );

    // Даты начала месяца Рамадан (1 Рамадана) по астрономическому календарю ДУМ РБ / Уфа
    const ramadanCycles = [
      {
        prevStart: new Date(2024, 2, 11, 0, 0, 0),
        nextStart: new Date(2025, 2, 1, 0, 0, 0),
        dateLabelRu: '1 марта',
      },
      {
        prevStart: new Date(2025, 2, 1, 0, 0, 0),
        nextStart: new Date(2026, 1, 18, 0, 0, 0),
        dateLabelRu: '18 февраля',
      },
      {
        prevStart: new Date(2026, 1, 18, 0, 0, 0),
        nextStart: new Date(2027, 1, 8, 0, 0, 0),
        dateLabelRu: '8 февраля',
      },
      {
        prevStart: new Date(2027, 1, 8, 0, 0, 0),
        nextStart: new Date(2028, 0, 28, 0, 0, 0),
        dateLabelRu: '28 января',
      },
      {
        prevStart: new Date(2028, 0, 28, 0, 0, 0),
        nextStart: new Date(2029, 0, 16, 0, 0, 0),
        dateLabelRu: '16 января',
      },
    ];

    const cycle =
      ramadanCycles.find((c) => currentDate < c.nextStart) ||
      ramadanCycles[2];

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalCycleDays = Math.max(
      1,
      Math.round((cycle.nextStart.getTime() - cycle.prevStart.getTime()) / msPerDay)
    );
    const remainingMs = Math.max(0, cycle.nextStart.getTime() - currentDate.getTime());
    const daysRemaining = Math.ceil(remainingMs / msPerDay);
    const daysElapsed = Math.max(0, totalCycleDays - daysRemaining);
    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round((daysElapsed / totalCycleDays) * 100))
    );

    const mod10 = daysRemaining % 10;
    const mod100 = daysRemaining % 100;
    let dayWord = 'дней';
    if (mod10 === 1 && mod100 !== 11) {
      dayWord = 'день';
    } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      dayWord = 'дня';
    }

    return {
      daysRemaining,
      dayWord,
      totalCycleDays,
      daysElapsed,
      progressPercent,
      dateLabelRu: cycle.dateLabelRu,
    };
  }, [activeRow.year, activeRow.month, activeRow.day, now]);

  return (
    <section
      aria-label="Время намаза"
      className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden"
    >
      {/* ВЕРХНЯЯ ПАНЕЛЬ БЛОКА */}
      <div className="bg-gradient-to-br from-[#06392c] via-[#074233] to-[#04271e] text-white px-3 sm:px-8 py-6 sm:py-7 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, #fef3c7 1.5px, transparent 0), radial-gradient(circle at 60px 60px, #fef3c7 1.5px, transparent 0)`,
            backgroundSize: '80px 80px',
          }}
        />

        <div className="relative z-10 space-y-4">
          {/* Верхняя строка: Заголовок и выбранная дата из таблицы */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-amber-300/90 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {calculationSource === 'aladhan'
                  ? `Математический расчёт от AlAdhan API · ${displayCityNameRu}`
                  : `Расписание намазов ЦДУМ · ${displayCityNameRu} · 1448 һиҗри`}
              </span>
              {calculationSource === 'aladhan' && (
                <span className="bg-amber-400/25 border border-amber-300/50 text-[#fef3c7] px-2 py-0.5 rounded-md text-[11px] font-bold tracking-normal normal-case">
                  Математический расчёт от AlAdhan API
                </span>
              )}
              {activeRow.isFriday && (
                <span className="bg-emerald-500/30 border border-emerald-300/40 text-emerald-100 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-normal normal-case">
                  Җомга · Пятница
                </span>
              )}
              {activeRow.suhoorEnd && (
                <span className="bg-amber-400/25 border border-amber-300/50 text-[#fef3c7] px-2 py-0.5 rounded-md text-[11px] font-bold tracking-normal normal-case">
                  Сәхәр тәмам: {activeRow.suhoorEnd}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#fef3c7] tracking-tight">
                Время намаза ({displayCityNameRu})
              </h2>
              <span className="text-xs sm:text-sm text-emerald-100/90 font-medium">
                Миләди:{' '}
                <strong className="text-[#fef3c7]">
                  {activeRow.miladiFullRu}
                </strong>{' '}
                · {activeRow.weekdayTt} ({activeRow.weekdayRu}) · Һиҗри:{' '}
                <strong className="text-[#fef3c7]">
                  {activeRow.hijriDay} {activeRow.hijriMonthTt}
                </strong>
              </span>
            </div>
          </div>

          {/* Переключение дней таблицы и выбор города */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial min-w-0">
              <button
                type="button"
                onClick={() =>
                  handleSelectDayIndex(
                    selectedRowIndex > 0
                      ? selectedRowIndex - 1
                      : currentCitySchedule.length - 1
                  )
                }
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-100 transition cursor-pointer shrink-0"
                title="Предыдущий день таблицы"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 sm:flex-initial min-w-0 flex items-center gap-1.5 sm:gap-2 bg-white/10 border border-white/20 rounded-xl px-2.5 sm:px-3 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <label htmlFor="prayer-table-date-select" className="sr-only">
                  Выберите дату из расписания
                </label>
                <select
                  id="prayer-table-date-select"
                  value={selectedRowIndex}
                  onChange={(e) => handleSelectDayIndex(Number(e.target.value))}
                  className="w-full min-w-0 truncate bg-transparent text-xs sm:text-sm font-semibold text-white focus:outline-none cursor-pointer"
                >
                  {availablePeriods.map((period) => (
                    <optgroup
                      key={period.id}
                      label={`Таблица ${period.tableNumber}: ${period.title}`}
                      className="bg-[#04271e] text-amber-300"
                    >
                      {currentCitySchedule.map((row, idx) =>
                        row.periodId === period.id ? (
                          <option
                            key={`${period.id}_${row.hijriDay}`}
                            value={idx}
                            className="bg-[#06392c] text-white"
                          >
                            {row.miladiLabel} · {row.weekdayTt} ({row.weekdayRu}) ·
                            Һиҗри {row.hijriDay} ({row.hijriMonthTt})
                          </option>
                        ) : null
                      )}
                    </optgroup>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleSelectDayIndex(
                    selectedRowIndex < currentCitySchedule.length - 1
                      ? selectedRowIndex + 1
                      : 0
                  )
                }
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-100 transition cursor-pointer shrink-0"
                title="Следующий день таблицы"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Выбор города справа от выбора даты */}
            {calculationSource === 'cdum' ? (
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-2.5 sm:px-3 py-1.5 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <label htmlFor="prayer-schedule-city-select" className="sr-only">
                  Выберите город
                </label>
                <select
                  id="prayer-schedule-city-select"
                  value={scheduleCityId}
                  onChange={(e) =>
                    handleSelectScheduleCity(
                      e.target.value as PrayerScheduleCityId
                    )
                  }
                  className="bg-transparent text-xs sm:text-sm font-semibold text-white focus:outline-none cursor-pointer"
                >
                  {PRAYER_SCHEDULE_CITIES.map((city) => (
                    <option
                      key={city.id}
                      value={city.id}
                      className="bg-[#06392c] text-white"
                    >
                      {city.nameRu}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div ref={cityDropdownRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCitySearchOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-white transition cursor-pointer"
                  title="Выбрать любой город России (поиск по названию)"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{aladhanCity.nameRu}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                </button>

                {isCitySearchOpen && (
                  <div className="absolute left-0 sm:right-0 mt-1.5 w-72 sm:w-80 rounded-2xl bg-[#052e23] border border-amber-300/40 shadow-2xl z-50 p-2.5 space-y-2">
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-amber-300 absolute left-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={citySearchQuery}
                        onChange={(e) => setCitySearchQuery(e.target.value)}
                        placeholder="Введите название города России..."
                        autoFocus
                        className="w-full bg-black/30 border border-white/20 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-emerald-200/60 focus:outline-none focus:border-amber-300"
                      />
                      {citySearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCitySearchQuery('')}
                          className="absolute right-2 text-emerald-200/70 hover:text-white cursor-pointer"
                          title="Очистить поиск"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between px-1 text-[10px] text-amber-200/80 uppercase tracking-wider font-semibold">
                      <span>Все города России</span>
                      <span>Найдено: {filteredRussianCities.length}</span>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-white/10 rounded-xl border border-white/10 bg-black/20">
                      {filteredRussianCities.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-emerald-200/70">
                          Город не найден
                        </div>
                      ) : (
                        filteredRussianCities.map((city) => {
                          const isSelected =
                            city.nameRu === aladhanCity.nameRu &&
                            city.regionRu === aladhanCity.regionRu;
                          return (
                            <button
                              key={city.id}
                              type="button"
                              onClick={() =>
                                handleSelectAladhanRussianCity(city)
                              }
                              className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-400/25 text-[#fef3c7] font-bold'
                                  : 'text-white hover:bg-white/10'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="truncate">{city.nameRu}</div>
                                <div className="text-[10px] text-emerald-200/70 truncate">
                                  {city.regionRu}
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Выбор источника расчёта: ЦДУМ России или Математический расчёт от AlAdhan API */}
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-2.5 sm:px-3 py-1.5 shrink-0">
              <label htmlFor="prayer-calc-source-select" className="sr-only">
                Источник расчёта времени намаза
              </label>
              <select
                id="prayer-calc-source-select"
                value={calculationSource}
                onChange={(e) => {
                  const nextSource = e.target.value as PrayerCalculationSource;
                  setCalculationSource(nextSource);
                  saveCalculationSource(nextSource);
                }}
                className="bg-transparent text-xs sm:text-sm font-semibold text-amber-200 focus:outline-none cursor-pointer"
              >
                <option value="cdum" className="bg-[#06392c] text-white">
                  ЦДУМ России
                </option>
                <option value="aladhan" className="bg-[#06392c] text-white">
                  AlAdhan API (математический расчёт)
                </option>
              </select>
            </div>

            {!isViewingToday && (
              <button
                type="button"
                onClick={() => handleSelectDayIndex(todayRowIndex)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#fef3c7] text-[#06392c] hover:bg-amber-200 text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap"
              >
                Сегодня
              </button>
            )}
          </div>

          {/* Панель настроек и уведомление при выборе математического расчёта от AlAdhan API */}
          {calculationSource === 'aladhan' && (
            <div className="rounded-2xl bg-amber-400/15 border border-amber-300/40 px-3.5 py-2.5 space-y-2 text-xs text-[#fef3c7]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-amber-200">
                  Внимание: выбран математический расчёт от AlAdhan API
                </div>
                {isLoadingAladhan && (
                  <span className="text-[11px] text-amber-300 font-mono">
                    Загрузка расчёта из api.aladhan.com...
                  </span>
                )}
                {aladhanError && (
                  <span className="text-[11px] text-rose-300 font-medium">
                    {aladhanError}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                Это математический расчёт от AlAdhan API по астрономическим углам Солнца и выбранному мазхабу расчёта времени намаза Аср. Значения могут отличаться от утверждённых таблиц ЦДУМ России.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 bg-black/25 border border-white/15 rounded-xl px-2.5 py-1">
                  <span className="text-[11px] text-amber-200/90 font-medium">
                    Мазхаб:
                  </span>
                  <select
                    id="aladhan-school-select"
                    value={aladhanSchool}
                    onChange={(e) => {
                      const nextSchool = Number(
                        e.target.value
                      ) as AladhanSchool;
                      setAladhanSchool(nextSchool);
                      saveAladhanSchool(nextSchool);
                    }}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  >
                    {ALADHAN_SCHOOLS.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        className="bg-[#06392c] text-white"
                      >
                        {s.nameRu}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-black/25 border border-white/15 rounded-xl px-2.5 py-1">
                  <span className="text-[11px] text-amber-200/90 font-medium">
                    Углы Солнца:
                  </span>
                  <select
                    id="aladhan-method-select"
                    value={aladhanMethod}
                    onChange={(e) => {
                      const nextMethod = Number(
                        e.target.value
                      ) as AladhanMethodId;
                      setAladhanMethod(nextMethod);
                      saveAladhanMethod(nextMethod);
                    }}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  >
                    {ALADHAN_METHODS.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        className="bg-[#06392c] text-white"
                      >
                        {m.nameRu}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* КАРТОЧКИ 6 ВРЕМЁН ВЫБРАННОГО ДНЯ ИЗ ТАБЛИЦЫ (ВМЕСТО ТЕКСТОВОЙ СТРОКИ, В ОДНУ СТРОКУ НА СМАРТФОНЕ И ПК) */}
          <div className="p-1.5 sm:p-3.5 lg:p-4 rounded-2xl bg-[#faf9f6] shadow-sm">
            <div className="grid grid-cols-6 gap-1 sm:gap-2.5 lg:gap-4">
              {PRAYER_ITEMS_META.map((item) => {
                const Icon = PRAYER_ICONS[item.key];
                const mobileLabel = MOBILE_SHORT_LABELS[item.key];
                const timeValue = activeRow[item.key];
                const isCurrent = activeStatus.activeKey === item.key;
                const isNext =
                  activeStatus.nextKey === item.key &&
                  !activeStatus.isTomorrowFajr;

                return (
                  <div
                    key={item.key}
                    className={`relative rounded-xl sm:rounded-2xl px-0.5 py-2.5 sm:p-3.5 lg:p-4 transition-all flex flex-col justify-between text-center sm:text-left border min-w-0 ${
                      isCurrent
                        ? 'bg-[#06392c] text-white border-[#06392c] shadow-md ring-1 sm:ring-2 ring-amber-400/60'
                        : isNext
                          ? 'bg-amber-50/90 text-slate-900 border-amber-300 shadow-xs'
                          : 'bg-white text-slate-800 border-slate-200/90 hover:border-emerald-800/30'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center justify-center sm:justify-between gap-1 mb-0.5 sm:mb-1.5">
                        {/* Короткий заголовок на смартфоне без обрезания точками */}
                        <span
                          className={`sm:hidden text-[9.5px] font-bold uppercase tracking-tighter leading-tight whitespace-nowrap ${
                            isCurrent
                              ? 'text-amber-300'
                              : isNext
                                ? 'text-amber-900'
                                : 'text-[#06392c]'
                          }`}
                        >
                          {mobileLabel.tt}
                        </span>

                        {/* Полный заголовок на планшете и ПК */}
                        <span
                          className={`hidden sm:inline text-[10px] lg:text-[11px] font-bold uppercase tracking-wider truncate ${
                            isCurrent
                              ? 'text-amber-300'
                              : isNext
                                ? 'text-amber-900'
                                : 'text-[#06392c]'
                          }`}
                        >
                          {item.tableTitleTt}
                        </span>

                        <div
                          className={`hidden sm:flex w-6 h-6 lg:w-7 lg:h-7 rounded-lg items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-white/15 text-amber-300'
                              : isNext
                                ? 'bg-amber-200/70 text-amber-900'
                                : 'bg-slate-100 text-[#06392c]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        </div>
                      </div>

                      {/* Короткое русское название на смартфоне */}
                      <div
                        className={`sm:hidden text-[9.5px] leading-tight whitespace-nowrap mb-1 ${
                          isCurrent ? 'text-emerald-100/90' : 'text-slate-500'
                        }`}
                      >
                        {mobileLabel.ru}
                      </div>

                      {/* Полное русское и арабское название на планшете и ПК */}
                      <div className="hidden sm:flex items-baseline justify-between gap-1 mb-1">
                        <span
                          className={`text-[11px] lg:text-xs font-medium truncate ${
                            isCurrent ? 'text-emerald-100' : 'text-slate-600'
                          }`}
                        >
                          {item.nameRu}
                        </span>
                        <span
                          className={`hidden xl:inline font-serif text-xs shrink-0 ${
                            isCurrent ? 'text-amber-200/80' : 'text-slate-400'
                          }`}
                          dir="rtl"
                        >
                          {item.nameAr}
                        </span>
                      </div>

                      {/* Время из таблицы */}
                      <div
                        className={`font-mono tabular-nums text-[14px] sm:text-xl lg:text-3xl font-extrabold sm:font-bold tracking-tighter sm:tracking-tight my-0.5 sm:my-1 whitespace-nowrap ${
                          isCurrent
                            ? 'text-[#fef3c7]'
                            : isNext
                              ? 'text-[#06392c]'
                              : 'text-slate-900'
                        }`}
                      >
                        {timeValue}
                      </div>
                    </div>

                    {/* Ракааты и подпись — на планшете и ПК */}
                    <div className="hidden sm:block pt-2 mt-1.5 border-t border-current/10">
                      <div
                        className={`text-[10px] lg:text-[11px] font-medium leading-snug truncate ${
                          isCurrent ? 'text-emerald-100/90' : 'text-slate-600'
                        }`}
                      >
                        {item.rakats}
                      </div>
                      <div
                        className={`hidden lg:block text-[10px] mt-0.5 line-clamp-1 ${
                          isCurrent ? 'text-emerald-200/75' : 'text-slate-400'
                        }`}
                        title={item.subtitle}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Интерактивный таймер до следующего намаза + Счётчик до месяца Рамадан */}
          <div className="bg-black/25 backdrop-blur-xs border border-amber-300/25 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 space-y-3.5">
            {/* Секция 1: Таймер до следующего намаза */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-0.5 w-full sm:w-auto">
                <div className="text-[11px] uppercase tracking-wider text-emerald-200/80 font-medium">
                  {currentPrayerMeta
                    ? `Сейчас: ${currentPrayerMeta.tableTitleTt} (${currentPrayerMeta.nameRu})`
                    : 'Ожидание намаза'}
                </div>
                <div className="text-sm sm:text-base font-bold text-[#fef3c7] flex items-center gap-2">
                  <span>
                    Далее: {nextPrayerMeta.tableTitleTt}
                    {activeStatus.isTomorrowFajr ? ' (завтра)' : ''}
                  </span>
                  <span className="text-amber-300 font-mono tabular-nums">
                    в {activeStatus.nextTimeFormatted}
                  </span>
                </div>
                <div className="w-full sm:w-56 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-amber-300 rounded-full transition-all duration-700"
                    style={{ width: `${activeStatus.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-[10px] uppercase tracking-widest text-amber-200/75 font-semibold">
                  Осталось
                </div>
                <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#fef3c7] tracking-tight">
                  {countdownFormatted}
                </div>
              </div>
            </div>

            {/* Секция 2: Счётчик Рамадан и полоска сколько дней осталось до Рамадана */}
            <div className="pt-3 border-t border-white/15">
              <div className="space-y-1 w-full">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-200/80 font-medium">
                  <Moon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>
                    Священный месяц · начало {ramadanStatus.dateLabelRu} · Первый день поста
                  </span>
                </div>
                <div className="text-sm sm:text-base font-bold text-[#fef3c7] flex flex-wrap items-center justify-between gap-2">
                  <span>До месяца Рамадан</span>
                  <span className="text-xs sm:text-sm font-medium text-amber-300/90">
                    Ещё {ramadanStatus.daysRemaining} {ramadanStatus.dayWord}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-amber-200 rounded-full transition-all duration-700"
                    style={{ width: `${ramadanStatus.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ПАНЕЛЬ УПРАВЛЕНИЯ КИБЛОЙ, ТАБЛИЦЕЙ И ОРИГИНАЛАМИ */}
        <div className="relative z-10 mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-white/15 flex flex-wrap items-center justify-end gap-2">
          {/* Кнопки управления Киблой, таблицей и оригиналами */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowQiblaPanel((prev) => !prev)}
              className={`flex-1 sm:flex-initial justify-center flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer whitespace-nowrap ${
                showQiblaPanel
                  ? 'bg-[#fef3c7] text-[#06392c] border-amber-300 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 border-white/15 text-emerald-100'
              }`}
            >
              <Compass
                className={`w-3.5 h-3.5 shrink-0 ${
                  showQiblaPanel ? 'text-[#06392c]' : 'text-amber-300'
                }`}
              />
              <span>
                {showQiblaPanel
                  ? 'Скрыть Киблу'
                  : `Кибла · ${qiblaResult.azimuthDeg.toFixed(1)}° ${qiblaResult.cardinalShortRu}`}
              </span>
            </button>

            {/* Кнопка оригиналов таблиц временно скрыта (не удалена) */}
            <button
              type="button"
              onClick={() => setShowOriginalImage((prev) => !prev)}
              className="hidden flex-1 sm:flex-initial justify-center items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-100 transition cursor-pointer whitespace-nowrap"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>
                {showOriginalImage ? 'Скрыть сканы' : 'Оригиналы таблиц (12)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowFullTable((prev) => !prev)}
              className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-300/20 hover:bg-amber-300/30 border border-amber-300/40 text-[#fef3c7] transition cursor-pointer whitespace-nowrap"
            >
              <span>
                {showFullTable ? 'Свернуть расписание' : 'Показать расписание'}
              </span>
              {showFullTable ? (
                <ChevronUp className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* РАСКРЫВАЕМЫЕ РАЗДЕЛЫ: КИБЛА, ОРИГИНАЛЫ ТАБЛИЦ И ПОЛНОЕ РАСПИСАНИЕ */}
      {(showQiblaPanel || showOriginalImage || showFullTable) && (
        <div className="p-3 sm:p-6 lg:p-7 bg-[#faf9f6] space-y-5">
          {/* ПАНЕЛЬ ОПРЕДЕЛЕНИЯ КИБЛЫ (КОМПАС + ЯНДЕКС.КАРТА С ДОМАМИ) */}
          {showQiblaPanel && (
            <div
              className={
                showOriginalImage || showFullTable
                  ? 'pb-5 border-b border-slate-200'
                  : ''
              }
            >
              <QiblaFinderPanel
                locationState={qiblaLocation}
                qibla={qiblaResult}
                onSelectPresetCity={handleSelectQiblaCity}
                onRequestGps={handleRequestQiblaGps}
                onUpdatePinCoords={handleUpdateQiblaPinCoords}
                isLocatingGps={isLocatingGps}
                gpsError={gpsError}
                onClose={() => setShowQiblaPanel(false)}
              />
            </div>
          )}
          {/* ОРИГИНАЛЬНЫЕ ИЗОБРАЖЕНИЯ ТАБЛИЦ (ПО КНОПКЕ) */}
          {showOriginalImage && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900">
                  Оригиналы таблиц времени намаза ЦДУМ (1448 һиҗри · 12 месяцев)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowOriginalImage(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PRAYER_PERIODS.map((period) => (
                  <div
                    key={period.id}
                    className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-3 flex flex-col items-center"
                  >
                    <div className="text-xs font-bold text-[#06392c] mb-2 text-center">
                      {period.title}
                    </div>
                    <img
                      src={period.imageUrl}
                      alt={period.title}
                      className="max-w-full h-auto max-h-[640px] rounded-lg shadow-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ПОЛНАЯ ИНТЕРАКТИВНАЯ ТАБЛИЦА С ПЕРЕКЛЮЧАТЕЛЕМ ПЕРИОДОВ */}
          {showFullTable && (
            <div className={showOriginalImage ? 'pt-5 border-t border-slate-200' : ''}>
              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    {calculationSource === 'aladhan'
                      ? `Математический расчёт времени намаза от AlAdhan API · г. ${displayCityNameRu}`
                      : `Расписание намазов ЦДУМ России · г. ${displayCityNameRu}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {calculationSource === 'aladhan'
                      ? 'Времена рассчитаны математически через AlAdhan API по координатам города и выбранному мазхабу. Нажмите на любую строку, чтобы показать времена этого дня в карточках выше.'
                      : 'Нажмите на любую строку в таблице, чтобы показать времена этого дня в карточках выше. Зелёным выделены пятницы (Җомга), начало месяцев и благословенные дни.'}
                  </p>
                </div>

                {/* Переключатель таблиц по месяцам */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1.5 rounded-xl">
                  {availablePeriods.map((period) => {
                    const isActive = tableFilterPeriod === period.id;
                    return (
                      <button
                        key={period.id}
                        type="button"
                        onClick={() => setTableFilterPeriod(period.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isActive
                            ? 'bg-[#06392c] text-[#fef3c7] shadow-xs'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                        }`}
                        title={period.title}
                      >
                        <span>{period.shortTitle}</span>
                        <span className="ml-1 opacity-75 font-normal hidden sm:inline">
                          ({period.hijriMonthTt})
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setTableFilterPeriod('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      tableFilterPeriod === 'all'
                        ? 'bg-[#06392c] text-[#fef3c7] shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Все дни ({currentCitySchedule.length})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border-2 border-[#169c38]/80 bg-white shadow-xs">
                <table className="w-full text-center border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-white text-slate-900 border-b-2 border-slate-300 font-serif">
                      {tableFilterPeriod === 'feb_mar' && (
                        <th className="py-2.5 px-2.5 font-bold border-r border-slate-200 bg-amber-50/70 text-[#06392c]">
                          <div>Сәхәр</div>
                          <div>тәмам</div>
                        </th>
                      )}
                      <th className="py-2.5 px-2.5 font-bold border-r border-slate-200">
                        <div>Иртәнге</div>
                        <div>намаз</div>
                      </th>
                      <th className="py-2.5 px-2.5 font-bold border-r border-slate-200">
                        <div>Кояш</div>
                        <div>чыга</div>
                      </th>
                      <th className="py-2.5 px-2.5 font-bold border-r border-slate-200">
                        <div>Өйлә</div>
                        <div>намаз</div>
                      </th>
                      <th className="py-2.5 px-2.5 font-bold border-r border-slate-200">
                        <div>Икенде</div>
                        <div>намаз</div>
                      </th>
                      <th className="py-2.5 px-2.5 font-bold border-r border-slate-200">
                        <div>Ахшам</div>
                        <div>намаз</div>
                      </th>
                      <th className="py-2.5 px-2.5 font-bold border-r border-slate-200">
                        <div>Ястү</div>
                        <div>намаз</div>
                      </th>
                      <th className="py-2.5 px-2.5 font-bold border-r border-slate-200">
                        Миләди
                      </th>
                      <th className="py-2.5 px-2.5 font-bold border-r border-slate-200">
                        <div>Атна</div>
                        <div>көннәре</div>
                      </th>
                      <th className="py-2.5 px-2.5 font-bold">Һиҗри</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums">
                    {filteredTableRows.map(({ row, globalIndex }, localIdx) => {
                      const isSelected = globalIndex === selectedRowIndex;
                      const isTodayRow = globalIndex === todayRowIndex;
                      const isEvenRow = localIdx % 2 === 1;

                      let rowBgClass = isEvenRow ? 'bg-[#d9ead3]/70' : 'bg-white';
                      let textClass = 'text-slate-900';

                      if (row.isGreenRow) {
                        rowBgClass = 'bg-[#199a39] hover:bg-[#158430]';
                        textClass = 'text-white font-bold';
                      } else if (isSelected) {
                        rowBgClass = 'bg-amber-100/90 hover:bg-amber-200/70';
                        textClass = 'text-[#06392c] font-bold';
                      } else {
                        rowBgClass += ' hover:bg-emerald-100/60';
                      }

                      return (
                        <tr
                          key={`${row.periodId}_${row.hijriDay}`}
                          onClick={() => setSelectedRowIndex(globalIndex)}
                          className={`border-b border-slate-200/80 transition cursor-pointer ${rowBgClass} ${textClass} ${
                            isSelected ? 'ring-2 ring-inset ring-amber-500' : ''
                          }`}
                        >
                          {tableFilterPeriod === 'feb_mar' && (
                            <td className="py-1.5 px-2.5 border-r border-slate-200/60 font-bold">
                              {row.suhoorEnd || '—'}
                            </td>
                          )}
                          <td className="py-1.5 px-2.5 border-r border-slate-200/60">
                            {row.fajr}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200/60">
                            {row.sunrise}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200/60">
                            {row.dhuhr}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200/60">
                            {row.asr}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200/60">
                            {row.maghrib}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200/60">
                            {row.isha}
                          </td>
                          <td className="py-1.5 px-2.5 font-sans border-r border-slate-200/60 whitespace-nowrap">
                            <span>{row.miladiLabel}</span>
                            {isTodayRow && (
                              <span
                                className={`ml-1.5 inline-block text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  row.isGreenRow
                                    ? 'bg-white text-[#199a39]'
                                    : 'bg-[#06392c] text-[#fef3c7]'
                                }`}
                              >
                                сегодня
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 font-serif text-xs sm:text-sm border-r border-slate-200/60 whitespace-nowrap">
                            {row.weekdayTt}
                          </td>
                          <td className="py-1.5 px-2.5 font-serif text-sm">
                            {row.hijriDay}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(() => {
                const activeFootnotes =
                  tableFilterPeriod === 'all'
                    ? availablePeriods.flatMap((p) => p.footnotes)
                    : availablePeriods.find((p) => p.id === tableFilterPeriod)
                        ?.footnotes || [];
                if (activeFootnotes.length === 0) return null;
                return (
                  <div className="mt-3 rounded-xl border border-emerald-200/80 bg-white px-4 py-3 text-xs sm:text-sm text-slate-700 space-y-1 text-center font-serif">
                    {activeFootnotes.map((note, idx) => (
                      <p key={idx}>{note}</p>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
