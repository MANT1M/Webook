import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import {
  PRAYER_SCHEDULE_TABLE,
  PRAYER_ITEMS_META,
  PRAYER_PERIODS,
  PrayerKey,
  PrayerPeriodId,
  PrayerTableRow,
  findTodayRowIndex,
  getActiveAndNextPrayerFromRow,
} from '../utils/prayerTimes';
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
  const todayRowIndex = useMemo(() => findTodayRowIndex(now), [now]);

  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(() =>
    findTodayRowIndex(new Date())
  );
  const [tableFilterPeriod, setTableFilterPeriod] = useState<
    PrayerPeriodId | 'all'
  >('oct_nov');
  const [showFullTable, setShowFullTable] = useState<boolean>(true);
  const [showOriginalImage, setShowOriginalImage] = useState<boolean>(false);

  // Живой таймер каждую секунду
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeRow: PrayerTableRow =
    PRAYER_SCHEDULE_TABLE[selectedRowIndex] || PRAYER_SCHEDULE_TABLE[0];

  const nextDayRow: PrayerTableRow =
    PRAYER_SCHEDULE_TABLE[
      (selectedRowIndex + 1) % PRAYER_SCHEDULE_TABLE.length
    ];

  // Автоматически переключаем вкладку таблицы при выборе дня из другого периода
  const handleSelectDayIndex = (idx: number) => {
    setSelectedRowIndex(idx);
    const targetRow = PRAYER_SCHEDULE_TABLE[idx];
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
    return PRAYER_SCHEDULE_TABLE.map((row, globalIndex) => ({
      row,
      globalIndex,
    })).filter(({ row }) =>
      tableFilterPeriod === 'all' ? true : row.periodId === tableFilterPeriod
    );
  }, [tableFilterPeriod]);

  const isViewingToday = selectedRowIndex === todayRowIndex;

  // Счётчик дней и прогресс-полоска до священного месяца Рамадан
  const ramadanStatus = useMemo(() => {
    const refYear = now.getFullYear();
    const currentDate = new Date(
      refYear,
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
  }, [activeRow.month, activeRow.day, now]);

  return (
    <section
      aria-label="Время намаза"
      className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden"
    >
      {/* ВЕРХНЯЯ ПАНЕЛЬ БЛОКА */}
      <div className="bg-gradient-to-br from-[#06392c] via-[#074233] to-[#04271e] text-white px-5 sm:px-8 py-6 sm:py-7 relative overflow-hidden">
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
              <span>Расписание намазов · 12 окт — 9 дек</span>
              {activeRow.isFriday && (
                <span className="bg-emerald-500/30 border border-emerald-300/40 text-emerald-100 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-normal normal-case">
                  Җомга · Пятница
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#fef3c7] tracking-tight">
                Время намаза (Уфа)
              </h2>
              <span className="text-xs sm:text-sm text-emerald-100/90 font-medium">
                Миләди:{' '}
                <strong className="text-[#fef3c7]">
                  {activeRow.miladiFullRu}
                </strong>{' '}
                · {activeRow.weekdayTt} ({activeRow.weekdayRu}) · Һиҗри:{' '}
                <strong className="text-[#fef3c7]">{activeRow.hijriDay}</strong>
              </span>
            </div>
          </div>

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
                    className={`relative rounded-xl sm:rounded-2xl px-0.5 py-1.5 sm:p-3.5 lg:p-4 transition-all flex flex-col justify-between text-center sm:text-left border min-w-0 ${
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
                          className={`sm:hidden text-[8.5px] font-bold uppercase tracking-tighter leading-tight whitespace-nowrap ${
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
                        className={`sm:hidden text-[8.5px] leading-tight whitespace-nowrap mb-0.5 ${
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
                        className={`font-mono tabular-nums text-[12.5px] sm:text-xl lg:text-3xl font-bold tracking-tight my-0.5 sm:my-1 ${
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
            <div className="pt-3 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1 w-full sm:flex-1 sm:max-w-md">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-200/80 font-medium">
                  <Moon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>
                    Священный месяц · начало {ramadanStatus.dateLabelRu} · Первый день поста
                  </span>
                </div>
                <div className="text-sm sm:text-base font-bold text-[#fef3c7] flex flex-wrap items-center justify-between gap-2">
                  <span>До месяца Рамадан</span>
                  <span className="text-xs font-medium text-amber-300/90 sm:hidden">
                    Ещё {ramadanStatus.daysRemaining} {ramadanStatus.dayWord}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-amber-200 rounded-full transition-all duration-700"
                    style={{ width: `${ramadanStatus.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-emerald-200/70 pt-0.5">
                  <span>Прошло {ramadanStatus.progressPercent}% года</span>
                  <span>
                    Осталось {ramadanStatus.daysRemaining} {ramadanStatus.dayWord}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-[10px] uppercase tracking-widest text-amber-200/75 font-semibold">
                  До Рамадана
                </div>
                <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#fef3c7] tracking-tight flex items-baseline gap-1.5">
                  <span>{ramadanStatus.daysRemaining}</span>
                  <span className="font-sans text-sm sm:text-base font-semibold text-amber-300">
                    {ramadanStatus.dayWord}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ПАНЕЛЬ НАВИГАЦИИ ПО ДАТАМ И ПЕРИОДАМ (12 ОКТ — 9 ДЕК) */}
        <div className="relative z-10 mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Переключение дней таблицы — стрелки и выбор даты строго в одну строку */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto min-w-0">
            <button
              type="button"
              onClick={() =>
                handleSelectDayIndex(
                  selectedRowIndex > 0
                    ? selectedRowIndex - 1
                    : PRAYER_SCHEDULE_TABLE.length - 1
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
                <optgroup
                  label="Таблица 1: 12 октября — 9 ноября (Һиҗри 1–29)"
                  className="bg-[#04271e] text-amber-300"
                >
                  {PRAYER_SCHEDULE_TABLE.map((row, idx) =>
                    row.periodId === 'oct_nov' ? (
                      <option
                        key={`oct_nov_${row.hijriDay}`}
                        value={idx}
                        className="bg-[#06392c] text-white"
                      >
                        {row.miladiLabel} · {row.weekdayTt} ({row.weekdayRu}) ·
                        Һиҗри {row.hijriDay}
                      </option>
                    ) : null
                  )}
                </optgroup>
                <optgroup
                  label="Таблица 2: 10 ноября — 9 декабря (Һиҗри 1–30)"
                  className="bg-[#04271e] text-amber-300"
                >
                  {PRAYER_SCHEDULE_TABLE.map((row, idx) =>
                    row.periodId === 'nov_dec' ? (
                      <option
                        key={`nov_dec_${row.hijriDay}`}
                        value={idx}
                        className="bg-[#06392c] text-white"
                      >
                        {row.miladiLabel} · {row.weekdayTt} ({row.weekdayRu}) ·
                        Һиҗри {row.hijriDay}
                      </option>
                    ) : null
                  )}
                </optgroup>
              </select>
            </div>

            <button
              type="button"
              onClick={() =>
                handleSelectDayIndex(
                  selectedRowIndex < PRAYER_SCHEDULE_TABLE.length - 1
                    ? selectedRowIndex + 1
                    : 0
                )
              }
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-100 transition cursor-pointer shrink-0"
              title="Следующий день таблицы"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

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

          {/* Кнопки управления таблицей и оригиналами */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowOriginalImage((prev) => !prev)}
              className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-100 transition cursor-pointer whitespace-nowrap"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>
                {showOriginalImage ? 'Скрыть сканы' : 'Оригиналы таблиц (2)'}
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

      {/* РАСКРЫВАЕМЫЕ РАЗДЕЛЫ: ОРИГИНАЛЫ ТАБЛИЦ И ПОЛНОЕ РАСПИСАНИЕ */}
      {(showOriginalImage || showFullTable) && (
        <div className="p-3 sm:p-6 lg:p-7 bg-[#faf9f6] space-y-5">
          {/* ОРИГИНАЛЬНЫЕ ИЗОБРАЖЕНИЯ ОБЕИХ ТАБЛИЦ (ПО КНОПКЕ) */}
          {showOriginalImage && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900">
                  Оригиналы таблиц времени намаза (12 окт — 9 ноя и 10 ноя — 9 дек)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowOriginalImage(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRAYER_PERIODS.map((period) => (
                  <div
                    key={period.id}
                    className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-3 flex flex-col items-center"
                  >
                    <div className="text-xs font-bold text-[#06392c] mb-2">
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
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    Расписание намазов по таблицам
                  </h3>
                <p className="text-xs text-slate-500">
                  Нажмите на любую строку в таблице, чтобы показать времена этого дня в карточках выше. Зелёным выделены пятницы (Җомга) и начало месяца.
                </p>
              </div>

              {/* Переключатель таблиц: 12 окт — 9 ноя / 10 ноя — 9 дек / Все */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl self-start lg:self-auto">
                {PRAYER_PERIODS.map((period) => {
                  const isActive = tableFilterPeriod === period.id;
                  return (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() => setTableFilterPeriod(period.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-[#06392c] text-[#fef3c7] shadow-xs'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      {period.shortTitle}
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
                  Все дни (59)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border-2 border-[#169c38]/80 bg-white shadow-xs">
              <table className="w-full text-center border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-white text-slate-900 border-b-2 border-slate-300 font-serif">
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
          </div>
        )}
        </div>
      )}
    </section>
  );
};
