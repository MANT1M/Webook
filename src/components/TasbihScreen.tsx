import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  Compass,
  BookOpen,
  ArrowLeft,
  Volume2,
  VolumeX,
  Check,
} from 'lucide-react';
import { TASBIH_PRESETS, TasbihPreset } from '../data/spiritualPracticesData';
import { PortalHeader, PortalSection } from './PortalHeader';

export interface TasbihScreenProps {
  onSelectSection: (section: PortalSection) => void;
  onOpenBookChapter: (chapterNumber: number) => void;
}

const TASBIH_STORAGE_KEY = 'portal_tasbih_state_v1';

export interface TasbihPersistedState {
  presetId: string;
  count: number;
  target: number;
  rounds: number;
  totalAllTime: number;
   vibrate: boolean;
}

export function loadTasbihState(): TasbihPersistedState {
  try {
    const raw = localStorage.getItem(TASBIH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        presetId: parsed.presetId || TASBIH_PRESETS[0].id,
        count: typeof parsed.count === 'number' ? parsed.count : 0,
        target: typeof parsed.target === 'number' ? parsed.target : 33,
        rounds: typeof parsed.rounds === 'number' ? parsed.rounds : 0,
        totalAllTime: typeof parsed.totalAllTime === 'number' ? parsed.totalAllTime : 0,
        vibrate: typeof parsed.vibrate === 'boolean' ? parsed.vibrate : true,
      };
    }
  } catch {
    // ignore
  }
  return {
    presetId: TASBIH_PRESETS[0].id,
    count: 0,
    target: 33,
    rounds: 0,
    totalAllTime: 0,
    vibrate: true,
  };
}

function saveTasbihState(state: TasbihPersistedState) {
  try {
    localStorage.setItem(TASBIH_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const TARGET_OPTIONS = [33, 99, 100, 300, 0]; // 0 = Без лимита (∞)

export const TasbihScreen: React.FC<TasbihScreenProps> = ({
  onSelectSection,
  onOpenBookChapter,
}) => {
  const [state, setState] = useState<TasbihPersistedState>(() => loadTasbihState());
  const [justCompletedRound, setJustCompletedRound] = useState<boolean>(false);

  const activePreset: TasbihPreset =
    TASBIH_PRESETS.find((p) => p.id === state.presetId) || TASBIH_PRESETS[0];

  const handleSelectPreset = (preset: TasbihPreset) => {
    setState((prev) => {
      const next: TasbihPersistedState = {
        ...prev,
        presetId: preset.id,
        count: 0,
        target: preset.defaultTarget,
      };
      saveTasbihState(next);
      return next;
    });
    setJustCompletedRound(false);
  };

  const handleSelectTarget = (target: number) => {
    setState((prev) => {
      const next: TasbihPersistedState = {
        ...prev,
        target,
        count: 0,
      };
      saveTasbihState(next);
      return next;
    });
    setJustCompletedRound(false);
  };

  const handleTap = useCallback(() => {
    setState((prev) => {
      const nextCountRaw = prev.count + 1;
      const reachedTarget = prev.target > 0 && nextCountRaw >= prev.target;
      const nextCount = reachedTarget ? 0 : nextCountRaw;
      const nextRounds = reachedTarget ? prev.rounds + 1 : prev.rounds;
      const nextTotal = prev.totalAllTime + 1;

      if (prev.vibrate) {
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(reachedTarget ? [35, 50, 45] : 14);
          }
        } catch {
          // ignore
        }
      }

      if (reachedTarget) {
        setJustCompletedRound(true);
        setTimeout(() => setJustCompletedRound(false), 1400);
      }

      const next: TasbihPersistedState = {
        ...prev,
        count: nextCount,
        rounds: nextRounds,
        totalAllTime: nextTotal,
      };
      saveTasbihState(next);
      return next;
    });
  }, []);

  const handleResetCurrent = () => {
    setState((prev) => {
      const next: TasbihPersistedState = {
        ...prev,
        count: 0,
        rounds: 0,
      };
      saveTasbihState(next);
      return next;
    });
    setJustCompletedRound(false);
  };

  const toggleVibrate = () => {
    setState((prev) => {
      const next = { ...prev, vibrate: !prev.vibrate };
      saveTasbihState(next);
      return next;
    });
  };

  // Поддержка клавиши Пробел для удобного счета с клавиатуры
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'BUTTON'
      ) {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTap]);

  const progressRatio =
    state.target > 0 ? Math.min(1, state.count / state.target) : (state.count % 33) / 33;
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1b1f] flex flex-col">
      <PortalHeader activeSection="tasbih" onSelectSection={onSelectSection} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Навигационная строка возврата */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <button
            type="button"
            onClick={() => onSelectSection('home')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#06392c] hover:text-emerald-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>На главную страницу</span>
          </button>

          <div className="text-xs text-slate-500 uppercase tracking-widest">
            Раздел 04 · Интерактивный Тасбих
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Левая колонка (7 колонок): Интерактивный круг Тасбиха и текущая формула */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-xs flex flex-col items-center">
            {/* Верхняя панель управления счетчиком */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 mr-1">Цель:</span>
                {TARGET_OPTIONS.map((t) => {
                  const isActive = state.target === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleSelectTarget(t)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-[#06392c] text-[#fef3c7]'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {t === 0 ? '∞' : t}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleVibrate}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 transition cursor-pointer"
                  title="Переключить тактильный отклик"
                >
                  {state.vibrate ? (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className="hidden sm:inline">Отклик</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetCurrent}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 transition cursor-pointer"
                  title="Сбросить текущий счёт"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Сброс</span>
                </button>
              </div>
            </div>

            {/* Текст выбранного зикра */}
            <div className="w-full text-center my-5 px-4 py-5 rounded-2xl bg-[#faf8f2] border border-[#e8e2d2]">
              <div className="text-xs uppercase tracking-widest text-emerald-800 font-semibold mb-2">
                {activePreset.title}
              </div>
              <p
                dir="rtl"
                className="font-arabic text-2xl sm:text-3xl leading-[1.9] text-[#06392c] mb-2"
              >
                {activePreset.arabic}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                {activePreset.transliteration}
              </p>
              <p className="text-xs text-slate-500 italic">
                «{activePreset.translation}»
              </p>
            </div>

            {/* Большая тактильная кнопка Тасбиха с круговым индикатором */}
            <div className="relative my-3 flex items-center justify-center">
              <svg className="w-68 h-68 -rotate-90" viewBox="0 0 260 260">
                <circle
                  cx="130"
                  cy="130"
                  r={radius}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="10"
                />
                <circle
                  cx="130"
                  cy="130"
                  r={radius}
                  fill="none"
                  stroke="#06392c"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-150"
                />
              </svg>

              <button
                type="button"
                onClick={handleTap}
                className="absolute w-52 h-52 rounded-full bg-linear-to-b from-[#06392c] to-[#04271e] hover:from-[#084737] hover:to-[#06392c] active:scale-[0.96] text-white shadow-lg border-4 border-amber-300/30 flex flex-col items-center justify-center select-none cursor-pointer transition-transform"
              >
                <span className="text-[11px] uppercase tracking-widest text-amber-300/90 font-semibold mb-1">
                  {justCompletedRound ? 'Круг завершён!' : 'Нажмите для зикра'}
                </span>
                <span className="font-mono text-5xl sm:text-6xl font-bold text-[#fef3c7] tracking-tight tabular-nums">
                  {state.count}
                </span>
                <span className="text-xs text-emerald-200/80 font-mono mt-1.5">
                  {state.target > 0 ? `из ${state.target}` : 'без лимита'}
                </span>
              </button>
            </div>

            {/* Статистика сессии и общего числа поминаний */}
            <div className="w-full grid grid-cols-3 gap-3 pt-5 mt-3 border-t border-slate-100 text-center">
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <div className="text-[11px] text-slate-500">Кругов завершено</div>
                <div className="font-mono text-lg sm:text-xl font-bold text-[#06392c] mt-0.5">
                  {state.rounds}
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <div className="text-[11px] text-slate-500">Текущая цель</div>
                <div className="font-mono text-lg sm:text-xl font-bold text-[#06392c] mt-0.5">
                  {state.target === 0 ? '∞' : state.target}
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <div className="text-[11px] text-slate-500">Всего зикров</div>
                <div className="font-mono text-lg sm:text-xl font-bold text-[#06392c] mt-0.5">
                  {state.totalAllTime}
                </div>
              </div>
            </div>
          </div>

          {/* Правая колонка (5 колонок): Выбор формулы поминания и достоинство из книги */}
          <div className="lg:col-span-5 space-y-5">
            {/* Карточка достоинства выбранного зикра */}
            <div className="bg-[#06392c] text-white rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300 font-semibold mb-2">
                <Compass className="w-4 h-4" />
                <span>Награда и достоинство зикра</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-50/95 leading-relaxed mb-3">
                {activePreset.virtue}
              </p>
              <div className="text-[11px] text-emerald-200/80 mb-4">
                Источник: {activePreset.source}
              </div>

              {activePreset.bookChapterNumber && (
                <button
                  type="button"
                  onClick={() => onOpenBookChapter(activePreset.bookChapterNumber!)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#fef3c7] hover:bg-amber-200 text-[#06392c] text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>
                    Открыть главу {activePreset.bookChapterNumber} в книге «Простые благодеяния»
                  </span>
                </button>
              )}
            </div>

            {/* Список доступных формул для Тасбиха */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
              <h2 className="font-serif text-lg font-bold text-slate-900 mb-1">
                Формулы поминания Аллаха
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Выберите слова зикра для отсчёта на тасбихе:
              </p>

              <div className="space-y-2.5">
                {TASBIH_PRESETS.map((preset) => {
                  const isSelected = preset.id === activePreset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/90 border-[#06392c] text-slate-900'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm text-slate-900 truncate">
                            {preset.shortTitle}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            · {preset.defaultTarget}x
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {preset.translation}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          dir="rtl"
                          className="font-arabic text-base text-[#06392c] hidden sm:inline"
                        >
                          {preset.arabic.split('،')[0]}
                        </span>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#06392c] text-[#fef3c7] flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
