import React from 'react';
import { Eye, Users, Flame, BookOpen } from 'lucide-react';
import { VisitStats } from '../hooks/useVisitCounter';

interface VisitorCounterBadgeProps {
  stats: VisitStats;
  variant?: 'header' | 'footer' | 'banner';
}

export const VisitorCounterBadge: React.FC<VisitorCounterBadgeProps> = ({
  stats,
  variant = 'header',
}) => {
  const { totalVisits, uniqueVisitors, personalVisits, readingStreak, loading } = stats;

  const formattedVisits = totalVisits > 0 ? totalVisits.toLocaleString('ru-RU') : '—';
  const formattedReaders = uniqueVisitors > 0 ? uniqueVisitors.toLocaleString('ru-RU') : '—';

  // Компактный бейдж для шапки (Header)
  if (variant === 'header') {
    return (
      <div
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-[#fef3c7]/20 text-[#fef3c7] text-xs font-medium select-none shadow-xs"
        title={`Статистика библиотеки: ${formattedVisits} посещений, ${formattedReaders} уникальных читателей`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <div className="flex items-center gap-1.5 text-xs text-[#fef3c7]/90">
          <Eye className="w-3.5 h-3.5 text-amber-300" />
          <span className="font-semibold text-amber-200">
            {loading && totalVisits === 0 ? '...' : formattedVisits}
          </span>
          <span className="text-[11px] text-[#fef3c7]/70">посещений</span>
        </div>
      </div>
    );
  }

  // Бейдж для баннера
  if (variant === 'banner') {
    return (
      <div className="inline-flex items-center gap-3 bg-black/25 backdrop-blur-sm border border-amber-200/20 px-3.5 py-1.5 rounded-xl text-xs text-amber-100">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-amber-300" />
          <span>
            Посещений: <strong className="text-white font-semibold">{loading && totalVisits === 0 ? '...' : formattedVisits}</strong>
          </span>
        </div>
        <span className="w-1 h-1 rounded-full bg-amber-300/40" />
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-amber-300" />
          <span>
            Читателей: <strong className="text-white font-semibold">{loading && uniqueVisitors === 0 ? '...' : formattedReaders}</strong>
          </span>
        </div>
      </div>
    );
  }

  // Расширенный блок для подвала (Footer)
  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Общая статистика Firebase */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 border border-emerald-200/70 flex items-center justify-center text-[#06392c]">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Всего посещений</div>
              <div className="font-bold text-sm text-slate-900">
                {loading && totalVisits === 0 ? 'Загрузка...' : `${formattedVisits}`}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100/70 border border-amber-200/70 flex items-center justify-center text-amber-900">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Читателей библиотеки</div>
              <div className="font-bold text-sm text-slate-900">
                {loading && uniqueVisitors === 0 ? 'Загрузка...' : `${formattedReaders}`}
              </div>
            </div>
          </div>
        </div>

        {/* Личная статистика читателя */}
        <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <BookOpen className="w-3.5 h-3.5 text-[#06392c]" />
            <span>Ваш визит:</span>
            <strong className="text-[#06392c]">№{personalVisits}</strong>
          </div>
          {readingStreak > 1 && (
            <>
              <span className="text-slate-300">·</span>
              <div className="flex items-center gap-1 text-amber-700 font-semibold" title="Дни чтения подряд">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{readingStreak} дня подряд</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
