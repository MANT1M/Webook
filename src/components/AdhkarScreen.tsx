import React, { useState, useMemo } from 'react';
import {
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  Check,
  BookOpen,
  ArrowLeft,
  Compass,
} from 'lucide-react';
import {
  ADHKAR_CATEGORIES,
  ADHKAR_COLLECTION,
  AdhkarCategory,
  AdhkarItem,
} from '../data/spiritualPracticesData';
import { PortalHeader, PortalSection } from './PortalHeader';

export interface AdhkarScreenProps {
  onSelectSection: (section: PortalSection) => void;
  onOpenBookChapter: (chapterNumber: number) => void;
}

const STORAGE_KEY = 'portal_adhkar_counts_v1';

function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export function loadTodayAdhkarCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && parsed.date === getTodayDateKey() && parsed.counts) {
      return parsed.counts;
    }
  } catch {
    // ignore
  }
  return {};
}

function saveTodayAdhkarCounts(counts: Record<string, number>) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        date: getTodayDateKey(),
        counts,
      })
    );
  } catch {
    // ignore
  }
}

export const AdhkarScreen: React.FC<AdhkarScreenProps> = ({
  onSelectSection,
  onOpenBookChapter,
}) => {
  const [activeCategory, setActiveCategory] = useState<AdhkarCategory>('morning');
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    loadTodayAdhkarCounts()
  );

  const categoryItems = useMemo(() => {
    return ADHKAR_COLLECTION.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const activeCategoryMeta = useMemo(() => {
    return (
      ADHKAR_CATEGORIES.find((c) => c.id === activeCategory) ||
      ADHKAR_CATEGORIES[0]
    );
  }, [activeCategory]);

  const completedInCategory = useMemo(() => {
    return categoryItems.filter(
      (item) => (counts[item.id] ?? 0) >= item.targetCount
    ).length;
  }, [categoryItems, counts]);

  const categoryProgressPercent = useMemo(() => {
    if (categoryItems.length === 0) return 0;
    return Math.round((completedInCategory / categoryItems.length) * 100);
  }, [completedInCategory, categoryItems.length]);

  const handleIncrement = (item: AdhkarItem) => {
    setCounts((prev) => {
      const current = prev[item.id] ?? 0;
      if (current >= item.targetCount) {
        return prev;
      }
      const nextVal = current + 1;
      const next = { ...prev, [item.id]: nextVal };
      saveTodayAdhkarCounts(next);
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(nextVal >= item.targetCount ? [25, 40, 35] : 12);
        }
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleResetSingle = (id: string) => {
    setCounts((prev) => {
      const next = { ...prev, [id]: 0 };
      saveTodayAdhkarCounts(next);
      return next;
    });
  };

  const handleResetCategory = () => {
    setCounts((prev) => {
      const next = { ...prev };
      for (const item of categoryItems) {
        next[item.id] = 0;
      }
      saveTodayAdhkarCounts(next);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1b1f] flex flex-col">
      <PortalHeader activeSection="adhkar" onSelectSection={onSelectSection} />

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
            Раздел 03 · Ежедневные Азкары
          </div>
        </div>

        {/* Заголовочный блок раздела Азкары */}
        <section className="rounded-2xl sm:rounded-3xl bg-[#06392c] text-white p-6 sm:p-8 lg:p-10 mb-7 shadow-md relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(circle at 24px 24px, #fef3c7 2px, transparent 0)`,
              backgroundSize: '48px 48px',
            }}
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300/90 font-semibold mb-2">
                <Sun className="w-3.5 h-3.5" />
                <span>Утренние, вечерние и повседневные поминания Аллаха</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#fef3c7] tracking-tight mb-2.5">
                Азкары на каждый день
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                Поминание Аллаха (зикр) оживляет сердце, защищает верующего в течение дня и ночи
                и приносит неисчислимую награду. Нажимайте на счётчик внутри карточки при чтении каждого азкара.
              </p>
            </div>

            {/* Сводка выполнения по текущему разделу */}
            <div className="bg-[#04271e]/80 border border-amber-300/20 rounded-2xl p-4 sm:p-5 lg:w-72 shrink-0">
              <div className="flex items-center justify-between text-xs text-emerald-100/90 mb-2">
                <span>Выполнено в разделе:</span>
                <span className="font-mono font-bold text-[#fef3c7]">
                  {completedInCategory} / {categoryItems.length} ({categoryProgressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-amber-300 transition-all duration-300 rounded-full"
                  style={{ width: `${categoryProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleResetCategory}
                  className="text-[11px] text-emerald-200 hover:text-white inline-flex items-center gap-1 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Сбросить раздел</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectSection('tasbih')}
                  className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 transition cursor-pointer"
                >
                  <Compass className="w-3 h-3" />
                  <span>Открыть Тасбих →</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Переключатель категорий азкаров */}
        <section className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ADHKAR_CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              const itemsForCat = ADHKAR_COLLECTION.filter((i) => i.category === cat.id);
              const doneForCat = itemsForCat.filter(
                (i) => (counts[i.id] ?? 0) >= i.targetCount
              ).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-left p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#06392c] text-white border-[#06392c] shadow-sm'
                      : 'bg-white text-slate-900 border-slate-200/90 hover:border-emerald-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`font-serif font-bold text-base ${
                        isSelected ? 'text-[#fef3c7]' : 'text-slate-900'
                      }`}
                    >
                      {cat.label}
                    </span>
                    {cat.id === 'morning' ? (
                      <Sun
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-amber-300' : 'text-amber-600'
                        }`}
                      />
                    ) : cat.id === 'evening' ? (
                      <Moon
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-amber-300' : 'text-slate-600'
                        }`}
                      />
                    ) : (
                      <Sparkles
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-amber-300' : 'text-emerald-700'
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`text-xs leading-snug mb-3 ${
                      isSelected ? 'text-emerald-100/85' : 'text-slate-500'
                    }`}
                  >
                    {cat.subtitle}
                  </p>
                  <div
                    className={`text-[11px] font-mono font-semibold pt-2 border-t ${
                      isSelected
                        ? 'border-white/15 text-amber-200'
                        : 'border-slate-100 text-emerald-800'
                    }`}
                  >
                    Выполнено сегодня: {doneForCat} из {itemsForCat.length}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Список карточек азкаров выбранной категории */}
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                {activeCategoryMeta.label}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {activeCategoryMeta.subtitle}
              </p>
            </div>
          </div>

          {categoryItems.map((item, idx) => {
            const currentCount = counts[item.id] ?? 0;
            const isCompleted = currentCount >= item.targetCount;
            const itemRatio = Math.min(
              100,
              Math.round((currentCount / item.targetCount) * 100)
            );

            return (
              <article
                key={item.id}
                className={`rounded-2xl sm:rounded-3xl border p-5 sm:p-7 transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/50 border-emerald-300/90'
                    : 'bg-white border-slate-200/90 shadow-2xs'
                }`}
              >
                {/* Верхняя строка */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200/70">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-1">
                      Азкар {String(idx + 1).padStart(2, '0')} · Повторений: {item.targetCount} ·{' '}
                      {item.source}
                    </div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {currentCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleResetSingle(item.id)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-600 inline-flex items-center gap-1 transition cursor-pointer"
                        title="Сбросить счётчик этого азкара"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Сброс</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Арабский текст */}
                <div className="my-5 rounded-2xl bg-[#faf8f2] border border-[#e8e2d2] px-5 py-6 sm:px-7">
                  <p
                    dir="rtl"
                    className="font-arabic text-2xl sm:text-3xl leading-[2.0] text-right text-[#06392c] select-all"
                  >
                    {item.arabic}
                  </p>
                </div>

                {/* Транслитерация и перевод */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                      Транслитерация
                    </div>
                    <p className="text-sm text-slate-700 italic leading-relaxed">
                      {item.transliteration}
                    </p>
                  </div>

                  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                      Перевод смысла
                    </div>
                    <p className="font-serif text-sm sm:text-base text-slate-900 leading-relaxed">
                      «{item.translation}»
                    </p>
                  </div>
                </div>

                {/* Интерактивная панель отсчёта повторений и достоинство */}
                <div className="pt-4 border-t border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      <strong className="text-[#06392c] font-semibold">Достоинство: </strong>
                      {item.virtue}
                    </p>
                    {item.bookChapterNumber && (
                      <button
                        type="button"
                        onClick={() => onOpenBookChapter(item.bookChapterNumber!)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#06392c] hover:text-emerald-700 underline underline-offset-4 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>
                          Читать подробнее в книге: {item.bookChapterTitle}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Кнопка-счётчик */}
                  <div className="flex items-center gap-3 shrink-0 self-stretch md:self-center">
                    <button
                      type="button"
                      onClick={() => handleIncrement(item)}
                      disabled={isCompleted}
                      className={`w-full md:w-auto min-w-[210px] py-3.5 px-6 rounded-2xl font-semibold text-sm transition flex items-center justify-between gap-4 select-none ${
                        isCompleted
                          ? 'bg-emerald-700 text-white cursor-default'
                          : 'bg-[#06392c] hover:bg-[#084b3a] active:scale-[0.98] text-[#fef3c7] cursor-pointer shadow-sm'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isCompleted ? (
                          <>
                            <Check className="w-4 h-4 text-amber-300" />
                            <span>Завершено</span>
                          </>
                        ) : (
                          <span>Нажать для счёта</span>
                        )}
                      </span>
                      <span className="font-mono text-base font-bold bg-black/20 px-3 py-1 rounded-xl">
                        {currentCount} / {item.targetCount}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Тонкая полоса прогресса под карточкой */}
                {item.targetCount > 1 && (
                  <div className="mt-4 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#06392c] transition-all duration-200 rounded-full"
                      style={{ width: `${itemRatio}%` }}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
};
