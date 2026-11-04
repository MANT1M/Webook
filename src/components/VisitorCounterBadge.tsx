import React, { useState } from 'react';
import {
  Eye,
  Users,
  Flame,
  BookOpen,
  Activity,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  RefreshCw,
  TrendingUp,
  BarChart3,
  LineChart,
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import {
  VisitStats,
  ONLINE_TIMEOUT_MS,
  DailyVisitorPoint,
  DeviceCategory,
} from '../hooks/useVisitCounter';
import { useAuthUser } from '../hooks/useAuthUser';

interface VisitorCounterBadgeProps {
  stats: VisitStats;
  variant?: 'header' | 'footer' | 'banner';
}

type ChartPeriod = 7 | 14 | 30;
type ChartMode = 'area' | 'bars';

function formatDurationSeconds(totalSeconds: number): string {
  if (totalSeconds < 5) return 'только что';
  if (totalSeconds < 60) return `${totalSeconds} сек. назад`;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins} мин. ${secs} сек. назад`;
}

function renderDeviceIcon(category: DeviceCategory, className = 'w-4 h-4') {
  if (category === 'mobile') return <Smartphone className={className} />;
  if (category === 'tablet') return <Tablet className={className} />;
  return <Monitor className={className} />;
}

export const VisitorCounterBadge: React.FC<VisitorCounterBadgeProps> = ({
  stats,
  variant = 'header',
}) => {
  const { isStatsAdmin } = useAuthUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>(14);
  const [chartMode, setChartMode] = useState<ChartMode>('area');
  const [hoveredPoint, setHoveredPoint] = useState<DailyVisitorPoint | null>(null);
  const [showFooterChart, setShowFooterChart] = useState<boolean>(true);

  if (!isStatsAdmin) {
    return null;
  }

  const {
    totalVisits,
    uniqueVisitors,
    dailyUniqueVisitors,
    dailyDate,
    dailyHistory,
    deviceBreakdown,
    currentDevice,
    onlineReaders,
    personalVisits,
    readingStreak,
    lastActionAt,
    secondsSinceLastAction,
    isCurrentUserOnline,
    loading,
    checkNow,
  } = stats;

  const formattedVisits = totalVisits > 0 ? totalVisits.toLocaleString('ru-RU') : '—';
  const formattedReaders = uniqueVisitors > 0 ? uniqueVisitors.toLocaleString('ru-RU') : '—';
  const formattedDailyUnique =
    dailyUniqueVisitors > 0 ? dailyUniqueVisitors.toLocaleString('ru-RU') : '1';
  const formattedOnline = onlineReaders >= 0 ? onlineReaders.toLocaleString('ru-RU') : '0';

  const timeoutTotalSeconds = Math.floor(ONLINE_TIMEOUT_MS / 1000); // 300 сек (5 минут)
  const remainingOnlineSeconds = Math.max(0, timeoutTotalSeconds - secondsSinceLastAction);
  const remainingMins = Math.floor(remainingOnlineSeconds / 60);
  const remainingSecs = String(remainingOnlineSeconds % 60).padStart(2, '0');
  const lastActionTimeStr = new Date(lastActionAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const openModal = () => {
    checkNow();
    setIsModalOpen(true);
  };

  // Выборка точек за выбранный период (7, 14 или 30 дней)
  const periodPoints: DailyVisitorPoint[] =
    dailyHistory && dailyHistory.length > 0
      ? dailyHistory.slice(-chartPeriod)
      : [
          {
            date: dailyDate,
            shortLabel: dailyDate.slice(5).split('-').reverse().join('.'),
            dayLabel: 'Сегодня',
            weekdayShort: 'Сег',
            uniqueVisitors: Math.max(1, dailyUniqueVisitors),
            isToday: true,
          },
        ];

  const maxVisitorsInPeriod = Math.max(
    1,
    ...periodPoints.map((p) => p.uniqueVisitors)
  );
  const yAxisMax = Math.max(4, Math.ceil(maxVisitorsInPeriod * 1.2));

  const totalInPeriod = periodPoints.reduce((acc, p) => acc + p.uniqueVisitors, 0);
  const activeDaysInPeriod = periodPoints.filter((p) => p.uniqueVisitors > 0).length || 1;
  const avgPerActiveDay = (totalInPeriod / activeDaysInPeriod).toFixed(1);

  const peakPoint = periodPoints.reduce(
    (best, curr) => (curr.uniqueVisitors >= best.uniqueVisitors ? curr : best),
    periodPoints[0]
  );

  const todayPoint = periodPoints[periodPoints.length - 1];
  const yesterdayPoint =
    periodPoints.length >= 2 ? periodPoints[periodPoints.length - 2] : null;
  const deltaVsYesterday = yesterdayPoint
    ? todayPoint.uniqueVisitors - yesterdayPoint.uniqueVisitors
    : 0;

  const activePoint = hoveredPoint || todayPoint;

  // Подготовка данных распределения по видам устройств
  const totalDevicesCount = Math.max(
    1,
    deviceBreakdown.desktop + deviceBreakdown.mobile + deviceBreakdown.tablet
  );
  const deviceItems: Array<{
    key: DeviceCategory;
    title: string;
    count: number;
    percent: number;
    barColor: string;
    badgeBg: string;
  }> = [
    {
      key: 'mobile',
      title: 'Смартфоны',
      count: deviceBreakdown.mobile,
      percent: Math.round((deviceBreakdown.mobile / totalDevicesCount) * 100),
      barColor: 'bg-emerald-600',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      key: 'desktop',
      title: 'ПК и ноутбуки',
      count: deviceBreakdown.desktop,
      percent: Math.round((deviceBreakdown.desktop / totalDevicesCount) * 100),
      barColor: 'bg-[#06392c]',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    },
    {
      key: 'tablet',
      title: 'Планшеты',
      count: deviceBreakdown.tablet,
      percent: Math.round((deviceBreakdown.tablet / totalDevicesCount) * 100),
      barColor: 'bg-amber-600',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
    },
  ];

  // Блок отображения текущего устройства и распределения по видам устройств
  const renderDeviceBreakdownBlock = (compact = false) => (
    <div
      data-ignore-activity="true"
      className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#06392c]">
            {renderDeviceIcon(currentDevice.category, 'w-4 h-4 text-emerald-600 shrink-0')}
            <span>Виды устройств читателей</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Автоматическое определение типа устройства, ОС и браузера
          </p>
        </div>

        {/* Текущее определённое устройство пользователя */}
        <div className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50/90 border border-emerald-200/80 text-[11px] text-emerald-950">
          <span className="text-emerald-700 font-medium">Ваше устройство:</span>
          <strong className="font-bold text-[#06392c]">{currentDevice.label}</strong>
          <span className="text-emerald-400">•</span>
          <span>{currentDevice.os}</span>
          <span className="text-emerald-400">•</span>
          <span>{currentDevice.browser}</span>
          {!compact && currentDevice.screen !== '—' && (
            <>
              <span className="text-emerald-400">•</span>
              <span className="text-emerald-700">{currentDevice.screen}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {deviceItems.map((item) => {
          const isCurrentCategory = currentDevice.category === item.key;
          return (
            <div
              key={item.key}
              className={`rounded-xl p-2.5 border transition-colors ${
                isCurrentCategory
                  ? 'bg-emerald-50/40 border-emerald-300/80'
                  : 'bg-slate-50/70 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <span className={`p-1 rounded-md border ${item.badgeBg}`}>
                    {renderDeviceIcon(item.key, 'w-3.5 h-3.5')}
                  </span>
                  <span>{item.title}</span>
                </div>
                {isCurrentCategory && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Вы
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between text-xs mb-1.5">
                <span className="font-bold text-sm text-slate-900">
                  {item.count.toLocaleString('ru-RU')} чел.
                </span>
                <span className="text-[11px] font-semibold text-slate-500">{item.percent}%</span>
              </div>

              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.barColor} transition-all duration-300`}
                  style={{ width: `${Math.max(item.count > 0 ? 6 : 0, item.percent)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Отрисовка интерактивного графика динамики уникальных посетителей
  const renderDynamicsChart = (compact = false) => {
    const svgWidth = 560;
    const svgHeight = compact ? 155 : 185;
    const padLeft = 32;
    const padRight = 16;
    const padTop = 20;
    const padBottom = 28;
    const innerWidth = svgWidth - padLeft - padRight;
    const innerHeight = svgHeight - padTop - padBottom;

    const coords = periodPoints.map((pt, idx) => {
      const x =
        periodPoints.length === 1
          ? padLeft + innerWidth / 2
          : padLeft + (idx / (periodPoints.length - 1)) * innerWidth;
      const ratio = Math.min(1, Math.max(0, pt.uniqueVisitors / yAxisMax));
      const y = padTop + innerHeight - ratio * innerHeight;
      return { x, y, pt, idx };
    });

    const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const curr = pts[i];
        const next = pts[i + 1];
        const cpx1 = curr.x + (next.x - curr.x) * 0.45;
        const cpy1 = curr.y;
        const cpx2 = curr.x + (next.x - curr.x) * 0.55;
        const cpy2 = next.y;
        d += ` C ${cpx1.toFixed(1)} ${cpy1.toFixed(1)}, ${cpx2.toFixed(1)} ${cpy2.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
      }
      return d;
    };

    const linePath = buildSmoothPath(coords);
    const baselineY = padTop + innerHeight;
    const areaPath =
      coords.length > 1
        ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${baselineY} L ${coords[0].x.toFixed(1)} ${baselineY} Z`
        : '';

    const yTicks = [0, Math.round(yAxisMax / 2), yAxisMax];
    const labelStep = chartPeriod === 30 ? 4 : chartPeriod === 14 ? 2 : 1;

    return (
      <div
        data-ignore-activity="true"
        className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs"
      >
        {/* Шапка графика с переключателями периода и типа */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#06392c]">
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Динамика уникальных посетителей</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Посуточный график уникальных читателей за выбранный период
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/70">
              <button
                type="button"
                onClick={() => setChartMode('area')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  chartMode === 'area'
                    ? 'bg-white text-[#06392c] shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Линейный график"
              >
                <LineChart className="w-3 h-3" />
                <span>Линия</span>
              </button>
              <button
                type="button"
                onClick={() => setChartMode('bars')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  chartMode === 'bars'
                    ? 'bg-white text-[#06392c] shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Столбчатая диаграмма"
              >
                <BarChart3 className="w-3 h-3" />
                <span>Столбцы</span>
              </button>
            </div>

            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/70">
              {([7, 14, 30] as ChartPeriod[]).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    setChartPeriod(days);
                    setHoveredPoint(null);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    chartPeriod === days
                      ? 'bg-[#06392c] text-[#fef3c7] font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {days} дн.
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Сводные показатели периода + выбранная точка */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-lg px-2.5 py-2">
            <div className="text-[10px] text-emerald-800/80">
              {activePoint?.isToday
                ? 'Сегодня'
                : `${activePoint?.weekdayShort}, ${activePoint?.dayLabel}`}
            </div>
            <div className="font-bold text-sm text-[#06392c] flex items-baseline gap-1.5 mt-0.5">
              <span>{activePoint?.uniqueVisitors ?? dailyUniqueVisitors} чел.</span>
              {activePoint?.isToday && deltaVsYesterday !== 0 && (
                <span
                  className={`text-[10px] font-semibold ${
                    deltaVsYesterday > 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {deltaVsYesterday > 0 ? `+${deltaVsYesterday}` : deltaVsYesterday} к вчера
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-2">
            <div className="text-[10px] text-slate-500">Среднее за день</div>
            <div className="font-bold text-sm text-slate-800 mt-0.5">{avgPerActiveDay} чел.</div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg px-2.5 py-2">
            <div className="text-[10px] text-amber-900/80">
              Пик ({peakPoint?.dayLabel || 'сегодня'})
            </div>
            <div className="font-bold text-sm text-amber-950 mt-0.5">
              {peakPoint?.uniqueVisitors ?? dailyUniqueVisitors} чел.
            </div>
          </div>
        </div>

        {/* SVG-область графика */}
        <div className="relative w-full select-none">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible"
            role="img"
            aria-label="График уникальных посетителей по дням"
          >
            <defs>
              <linearGradient id="visitorAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.34" />
                <stop offset="85%" stopColor="#059669" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="visitorBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#06392c" />
              </linearGradient>
              <linearGradient id="visitorBarTodayGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>

            {yTicks.map((val, i) => {
              const ratio = val / yAxisMax;
              const y = padTop + innerHeight - ratio * innerHeight;
              return (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray={val === 0 ? undefined : '3 3'}
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3.5}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] font-medium"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {chartMode === 'area' && (
              <>
                {areaPath && <path d={areaPath} fill="url(#visitorAreaGrad)" />}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#06392c"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {coords.map(({ x, y, pt }) => {
                  const isHovered = activePoint?.date === pt.date;
                  return (
                    <g key={pt.date}>
                      {isHovered && (
                        <line
                          x1={x}
                          y1={padTop}
                          x2={x}
                          y2={baselineY}
                          stroke="#059669"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 5.5 : pt.isToday ? 4.5 : 3}
                        fill={pt.isToday ? '#d97706' : isHovered ? '#059669' : '#ffffff'}
                        stroke={pt.isToday ? '#fef3c7' : '#06392c'}
                        strokeWidth={isHovered || pt.isToday ? 2 : 1.75}
                        className="transition-all duration-150"
                      />
                      {(isHovered || pt.isToday || (chartPeriod === 7 && pt.uniqueVisitors > 0)) && (
                        <text
                          x={x}
                          y={Math.max(11, y - 8)}
                          textAnchor="middle"
                          className={`text-[10px] font-bold ${
                            pt.isToday ? 'fill-amber-800' : 'fill-[#06392c]'
                          }`}
                        >
                          {pt.uniqueVisitors}
                        </text>
                      )}
                    </g>
                  );
                })}
              </>
            )}

            {chartMode === 'bars' &&
              coords.map(({ x, y, pt }) => {
                const isHovered = activePoint?.date === pt.date;
                const slotWidth = innerWidth / Math.max(1, periodPoints.length);
                const barWidth = Math.min(28, Math.max(6, slotWidth * 0.62));
                const rawBarHeight = baselineY - y;
                const barHeight = pt.uniqueVisitors > 0 ? Math.max(5, rawBarHeight) : 2;
                const barY = baselineY - barHeight;

                return (
                  <g key={pt.date}>
                    <rect
                      x={x - barWidth / 2}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      rx={Math.min(4, barWidth / 2)}
                      fill={
                        pt.isToday
                          ? 'url(#visitorBarTodayGrad)'
                          : pt.uniqueVisitors > 0
                            ? 'url(#visitorBarGrad)'
                            : '#cbd5e1'
                      }
                      opacity={isHovered ? 1 : pt.isToday ? 0.95 : 0.82}
                      className="transition-opacity duration-150"
                    />
                    {(isHovered || pt.isToday || (chartPeriod <= 14 && pt.uniqueVisitors > 0)) && (
                      <text
                        x={x}
                        y={Math.max(11, barY - 5)}
                        textAnchor="middle"
                        className={`text-[10px] font-bold ${
                          pt.isToday ? 'fill-amber-800' : 'fill-[#06392c]'
                        }`}
                      >
                        {pt.uniqueVisitors}
                      </text>
                    )}
                  </g>
                );
              })}

            {coords.map(({ x, pt, idx }) => {
              const showLabel =
                pt.isToday ||
                idx === 0 ||
                idx % labelStep === 0 ||
                activePoint?.date === pt.date;
              const hitWidth = innerWidth / Math.max(1, periodPoints.length);

              return (
                <g key={`axis-${pt.date}`}>
                  {showLabel && (
                    <text
                      x={x}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      className={`text-[9.5px] ${
                        pt.isToday
                          ? 'fill-amber-800 font-bold'
                          : activePoint?.date === pt.date
                            ? 'fill-[#06392c] font-bold'
                            : 'fill-slate-400 font-medium'
                      }`}
                    >
                      {pt.isToday ? 'Сег.' : pt.shortLabel}
                    </text>
                  )}
                  <rect
                    x={x - hitWidth / 2}
                    y={padTop}
                    width={hitWidth}
                    height={innerHeight + padBottom}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => setHoveredPoint(pt)}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 mt-1 border-t border-slate-100">
          <span>
            Выбрано:{' '}
            <strong className="text-slate-700">
              {activePoint?.dayLabel} ({activePoint?.date})
            </strong>
          </span>
          <span>
            Уникальных посетителей:{' '}
            <strong className="text-[#06392c]">{activePoint?.uniqueVisitors ?? 1}</strong>
          </span>
        </div>
      </div>
    );
  };

  // Модальное окно детальной проверки онлайна, графика динамики, устройств и уникальных читателей за день
  const renderStatsModal = () => {
    if (!isModalOpen) return null;

    return (
      <div
        data-ignore-activity="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
        onClick={() => setIsModalOpen(false)}
      >
        <div
          data-ignore-activity="true"
          className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl text-slate-800 relative animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#06392c] flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Статистика читателей и динамика
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Мониторинг уникальных посетителей, посуточный график, виды устройств и онлайн
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Главные карточки: Онлайн и Уникальных */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-emerald-800">Онлайн</span>
                <span className="relative flex h-2.5 w-2.5">
                  {onlineReaders > 0 ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
                  )}
                </span>
              </div>
              <div className="text-2xl font-bold text-[#06392c]">{formattedOnline}</div>
              <div className="text-[11px] text-emerald-700 mt-1">
                Активность за последние 5 мин.
              </div>
            </div>

            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-amber-900">Уникальных</span>
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <div className="text-2xl font-bold text-amber-950">{formattedDailyUnique}</div>
              <div className="text-[11px] text-amber-800 mt-1">Дата: {dailyDate}</div>
            </div>
          </div>

          {/* График динамики уникальных посетителей */}
          <div className="mb-4">{renderDynamicsChart(false)}</div>

          {/* Распределение по видам устройств + текущее устройство */}
          <div className="mb-4">{renderDeviceBreakdownBlock(false)}</div>

          {/* Блок проверки правила 5 минут для текущего читателя */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 mb-4 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#06392c]" />
                Проверка вашего онлайн-статуса (правило 5 минут)
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                  isCurrentUserOnline
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isCurrentUserOnline ? 'Вы онлайн' : 'Не онлайн (> 5 мин)'}
              </span>
            </div>

            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Последнее действие:</span>
                <strong className="text-slate-900">
                  {formatDurationSeconds(secondsSinceLastAction)} ({lastActionTimeStr})
                </strong>
              </div>
              <div className="flex justify-between">
                <span>До статуса «не онлайн»:</span>
                <strong className="text-slate-900">
                  {isCurrentUserOnline
                    ? `${remainingMins}:${remainingSecs} (при отсутствии действий)`
                    : 'Время неактивности превысило 5 минут'}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-200/80 leading-relaxed">
              Читатель считается онлайн, если его последнее действие на сайте было не более 5 минут
              назад. Если активности нет более 5 минут, читатель автоматически исключается из списка
              онлайн.
            </p>
          </div>

          {/* Общая статистика за всё время */}
          <div className="grid grid-cols-2 gap-2.5 text-xs mb-4">
            <div className="border border-slate-200 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Всего читателей</div>
                <div className="font-bold text-slate-900">{formattedReaders}</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Всего посещений</div>
                <div className="font-bold text-slate-900">{formattedVisits}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={checkNow}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Проверить сейчас
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#06392c] hover:bg-[#084d3b] text-[#fef3c7] text-xs font-semibold transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Понятно
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Компактный бейдж для шапки (Header)
  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          data-ignore-activity="true"
          onClick={openModal}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/60 border border-[#fef3c7]/20 text-[#fef3c7] text-xs font-medium select-none shadow-xs transition-colors cursor-pointer"
          title={`Нажмите для просмотра статистики. Ваше устройство: ${currentDevice.label} (${currentDevice.os})`}
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              {onlineReaders > 0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
              )}
            </span>
            <span className="font-semibold text-emerald-300">{formattedOnline}</span>
            <span className="text-[11px] text-[#fef3c7]/75 hidden sm:inline">онлайн</span>
          </div>

          <span className="w-px h-3.5 bg-[#fef3c7]/20" />

          <div className="flex items-center gap-1 text-xs text-[#fef3c7]/90">
            <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-semibold text-amber-200">
              {loading && totalVisits === 0 ? '...' : formattedDailyUnique}
            </span>
            <span className="text-[11px] text-[#fef3c7]/75 hidden md:inline">за день</span>
          </div>
        </button>
        {renderStatsModal()}
      </>
    );
  }

  // Бейдж для баннера
  if (variant === 'banner') {
    return (
      <>
        <button
          type="button"
          data-ignore-activity="true"
          onClick={openModal}
          className="inline-flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3 gap-y-1.5 bg-black/25 hover:bg-black/35 backdrop-blur-sm border border-amber-200/20 px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-[11px] sm:text-xs text-amber-100 transition-colors cursor-pointer"
          title="Нажмите для просмотра графика динамики, видов устройств и статистики"
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="relative flex h-2 w-2 shrink-0">
              {onlineReaders > 0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
              )}
            </span>
            <span>
              Онлайн:{' '}
              <strong className="text-emerald-300 font-semibold tabular-nums">
                {formattedOnline}
              </strong>
            </span>
          </div>

          <span className="text-amber-300/40 select-none">·</span>

          <div className="flex items-center gap-1 whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>
              Уникальных:{' '}
              <strong className="text-white font-semibold tabular-nums">
                {loading && totalVisits === 0 ? '...' : formattedDailyUnique}
              </strong>
            </span>
          </div>

          <span className="hidden sm:inline text-amber-300/40 select-none">·</span>

          <div className="flex items-center gap-1 whitespace-nowrap">
            {renderDeviceIcon(
              currentDevice.category,
              'w-3.5 h-3.5 text-amber-300 shrink-0'
            )}
            <span className="hidden sm:inline">Устройство:</span>
            <strong className="text-white font-semibold">
              {currentDevice.label}
            </strong>
          </div>

          <span className="text-amber-300/40 select-none">·</span>

          <div className="flex items-center gap-1 text-emerald-300 font-medium whitespace-nowrap">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span className="underline decoration-emerald-400/50 underline-offset-2">
              График
            </span>
          </div>
        </button>
        {renderStatsModal()}
      </>
    );
  }

  // Расширенный блок для подвала (Footer) с встроенным графиком динамики и разбивкой по устройствам
  return (
    <>
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Общая статистика Firebase */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600">
            {/* Онлайн */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-[#06392c] relative">
                <Activity className="w-4 h-4 text-emerald-700" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  {onlineReaders > 0 ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
                  )}
                </span>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Онлайн (активность &lt; 5 мин)</div>
                <div className="font-bold text-sm text-emerald-800">{formattedOnline} чел.</div>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* Уникальных */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-900">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Уникальных</div>
                <div className="font-bold text-sm text-slate-900">
                  {loading && totalVisits === 0 ? 'Загрузка...' : `${formattedDailyUnique} чел.`}
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* Всего уникальных читателей */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-200/70 border border-slate-300/70 flex items-center justify-center text-slate-700">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Всего читателей</div>
                <div className="font-bold text-sm text-slate-900">
                  {loading && uniqueVisitors === 0 ? 'Загрузка...' : `${formattedReaders}`}
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* Ваше устройство */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#06392c]">
                {renderDeviceIcon(currentDevice.category, 'w-4 h-4 text-[#06392c]')}
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Ваше устройство</div>
                <div className="font-bold text-sm text-slate-900">
                  {currentDevice.label} ({currentDevice.os})
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки управления графиком, проверки и личная статистика читателя */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              data-ignore-activity="true"
              onClick={() => setShowFooterChart((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#06392c] border border-slate-200 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>График и устройства</span>
              {showFooterChart ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              data-ignore-activity="true"
              onClick={openModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#06392c] hover:bg-[#084d3b] text-[#fef3c7] text-xs font-medium transition-colors cursor-pointer shadow-xs"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-300" />
              Проверить онлайн и статистику
            </button>

            <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <BookOpen className="w-3.5 h-3.5 text-[#06392c]" />
                <span>Ваш визит:</span>
                <strong className="text-[#06392c]">№{personalVisits}</strong>
              </div>
              {readingStreak > 1 && (
                <>
                  <span className="text-slate-300">·</span>
                  <div
                    className="flex items-center gap-1 text-amber-700 font-semibold"
                    title="Дни чтения подряд"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{readingStreak} дня подряд</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Встроенный интерактивный график динамики и распределение по видам устройств */}
        {showFooterChart && (
          <div className="pt-1 space-y-3">
            {renderDynamicsChart(true)}
            {renderDeviceBreakdownBlock(true)}
          </div>
        )}
      </div>
      {renderStatsModal()}
    </>
  );
};
