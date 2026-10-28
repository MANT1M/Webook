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
} from 'lucide-react';
import { VisitStats, ONLINE_TIMEOUT_MS } from '../hooks/useVisitCounter';

interface VisitorCounterBadgeProps {
  stats: VisitStats;
  variant?: 'header' | 'footer' | 'banner';
}

function formatDurationSeconds(totalSeconds: number): string {
  if (totalSeconds < 5) return 'только что';
  if (totalSeconds < 60) return `${totalSeconds} сек. назад`;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins} мин. ${secs} сек. назад`;
}

export const VisitorCounterBadge: React.FC<VisitorCounterBadgeProps> = ({
  stats,
  variant = 'header',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    totalVisits,
    uniqueVisitors,
    dailyUniqueVisitors,
    dailyDate,
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

  // Модальное окно детальной проверки онлайна и уникальных читателей за день
  const renderStatsModal = () => {
    if (!isModalOpen) return null;

    return (
      <div
        data-ignore-activity="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        onClick={() => setIsModalOpen(false)}
      >
        <div
          data-ignore-activity="true"
          className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-slate-800 relative animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#06392c] flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Статистика читателей и онлайн
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Мониторинг уникальных читателей за день и текущей активности
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Главные карточки: Онлайн сейчас и Уникальных за день */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-emerald-800">Сейчас онлайн</span>
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
                <span className="text-xs font-medium text-amber-900">Уникальных за день</span>
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <div className="text-2xl font-bold text-amber-950">{formattedDailyUnique}</div>
              <div className="text-[11px] text-amber-800 mt-1">Дата: {dailyDate}</div>
            </div>
          </div>

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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Проверить сейчас
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#06392c] hover:bg-[#084d3b] text-[#fef3c7] text-xs font-semibold transition-colors"
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
          title="Нажмите, чтобы проверить онлайн и уникальных читателей за день"
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
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
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
          className="inline-flex flex-wrap items-center gap-3 bg-black/25 hover:bg-black/35 backdrop-blur-sm border border-amber-200/20 px-3.5 py-1.5 rounded-xl text-xs text-amber-100 transition-colors cursor-pointer text-left"
          title="Нажмите для подробной проверки статистики"
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
            <span>
              Сейчас онлайн: <strong className="text-emerald-300 font-semibold">{formattedOnline}</strong>
            </span>
          </div>
          <span className="w-1 h-1 rounded-full bg-amber-300/40" />
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span>
              Уникальных за день:{' '}
              <strong className="text-white font-semibold">
                {loading && totalVisits === 0 ? '...' : formattedDailyUnique}
              </strong>
            </span>
          </div>
          <span className="w-1 h-1 rounded-full bg-amber-300/40" />
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-300" />
            <span>
              Всего читателей:{' '}
              <strong className="text-white font-semibold">
                {loading && uniqueVisitors === 0 ? '...' : formattedReaders}
              </strong>
            </span>
          </div>
        </button>
        {renderStatsModal()}
      </>
    );
  }

  // Расширенный блок для подвала (Footer)
  return (
    <>
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Общая статистика Firebase */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600">
            {/* Сейчас онлайн */}
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
                <div className="text-[11px] text-slate-400">Сейчас онлайн (активность &lt; 5 мин)</div>
                <div className="font-bold text-sm text-emerald-800">{formattedOnline} чел.</div>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* Уникальных за день */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-900">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Уникальных за день</div>
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

            {/* Всего посещений */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-200/70 border border-slate-300/70 flex items-center justify-center text-slate-700">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Всего посещений</div>
                <div className="font-bold text-sm text-slate-900">
                  {loading && totalVisits === 0 ? 'Загрузка...' : `${formattedVisits}`}
                </div>
              </div>
            </div>
          </div>

          {/* Кнопка проверки и личная статистика читателя */}
          <div className="flex flex-wrap items-center gap-2.5">
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
      </div>
      {renderStatsModal()}
    </>
  );
};
