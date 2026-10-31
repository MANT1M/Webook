import React, { useMemo } from 'react';
import {
  BookOpen,
  Sparkles,
  Sun,
  Compass,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { ChapterData, ChapterProgress } from '../types/reader';
import {
  CATALOG_BOOKS,
  INTERACTIVE_BOOKS_MAP,
} from '../data/catalogBooks';
import {
  DUA_COLLECTION,
  ADHKAR_COLLECTION,
  TASBIH_PRESETS,
} from '../data/spiritualPracticesData';
import { loadTodayAdhkarCounts } from './AdhkarScreen';
import { loadTasbihState } from './TasbihScreen';
import { PortalHeader, PortalSection } from './PortalHeader';
import { BookCoverRenderer } from './BookCoverRenderer';
import { useVisitCounter } from '../hooks/useVisitCounter';
import { VisitorCounterBadge } from './VisitorCounterBadge';

export interface HomeScreenProps {
  progress: Record<number, ChapterProgress>;
  onSelectSection: (section: PortalSection) => void;
  onOpenBookToc: (bookId: string) => void;
  onOpenChapter: (chapter: ChapterData) => void;
  onOpenEasyDeedsChapterNumber: (chapterNumber: number) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  progress,
  onSelectSection,
  onOpenBookToc,
  onOpenEasyDeedsChapterNumber,
}) => {
  const visitStats = useVisitCounter();

  // Статистика чтения по всем интерактивным книгам
  const libraryStats = useMemo(() => {
    let totalChapters = 0;
    let passedChapters = 0;
    for (const bookData of Object.values(INTERACTIVE_BOOKS_MAP)) {
      totalChapters += bookData.chapters.length;
      passedChapters += bookData.chapters.filter(
        (ch) => progress[ch.id]?.status === 'PASSED'
      ).length;
    }
    return {
      booksCount: CATALOG_BOOKS.length,
      totalChapters,
      passedChapters,
    };
  }, [progress]);

  // Статистика азкаров за сегодня
  const adhkarStats = useMemo(() => {
    const counts = loadTodayAdhkarCounts();
    const completed = ADHKAR_COLLECTION.filter(
      (item) => (counts[item.id] ?? 0) >= item.targetCount
    ).length;
    return {
      total: ADHKAR_COLLECTION.length,
      completed,
    };
  }, []);

  // Статистика тасбиха
  const tasbihStats = useMemo(() => {
    const state = loadTasbihState();
    const preset =
      TASBIH_PRESETS.find((p) => p.id === state.presetId) || TASBIH_PRESETS[0];
    return {
      totalAllTime: state.totalAllTime,
      rounds: state.rounds,
      activePresetTitle: preset.shortTitle,
    };
  }, []);

  // Дуа дня (выбирается стабильно по дню года)
  const featuredDua = useMemo(() => {
    const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return DUA_COLLECTION[dayOfYear % DUA_COLLECTION.length];
  }, []);

  const mainSections = [
    {
      num: '01',
      id: 'library' as PortalSection,
      title: '1. Библиотека',
      subtitle: 'Электронный каталог исламских книг и хрестоматий',
      description:
        'Интерактивное чтение книг «Простые благодеяния» муфтия Мухаммада Таки Усмани и «Канонические труды Величайшего имама Абу Ханифы по вероучению» со сносками и проверочными тестами.',
      meta: `${libraryStats.booksCount} книги · Прочитано разделов: ${libraryStats.passedChapters}`,
      cta: 'Открыть Библиотеку',
      icon: BookOpen,
      accentBg: 'from-[#06392c] to-[#084d3b]',
    },
    {
      num: '02',
      id: 'dua' as PortalSection,
      title: '2. Дуа',
      subtitle: 'Собрание мольб из Корана, Сунны и «Простых благодеяний»',
      description:
        'Мольбы о прощении (Саййидуль-истигфар), благодарности, исцелении больных, защите в трудностях и повседневные дуа с арабским оригиналом, транслитерацией и переводом.',
      meta: `${DUA_COLLECTION.length} достоверных дуа · 5 тематических рубрик`,
      cta: 'Перейти к Дуа',
      icon: Sparkles,
      accentBg: 'from-[#0b4636] to-[#06392c]',
    },
    {
      num: '03',
      id: 'adhkar' as PortalSection,
      title: '3. Азкары',
      subtitle: 'Утренние, вечерние и повседневные поминания Аллаха',
      description:
        'Структурированные азкары утром и вечером, слова поминания после азана, омовения и обязательного намаза со встроенным интерактивным счётчиком повторений.',
      meta: `Выполнено сегодня: ${adhkarStats.completed} из ${adhkarStats.total} азкаров`,
      cta: 'Открыть Азкары',
      icon: Sun,
      accentBg: 'from-[#06392c] to-[#052e24]',
    },
    {
      num: '04',
      id: 'tasbih' as PortalSection,
      title: '4. Тасбих',
      subtitle: 'Интерактивный цифровой счётчик зикра и салаватов',
      description:
        'Удобный счётчик поминаний (Субхана-Ллах, Альхамду ли-Ллях, Аллаху Акбар, Истигфар, Салават, Хаукаля) с выбором цели (33, 99, 100, ∞), круговой шкалой и сохранением истории.',
      meta: `Всего зикров: ${tasbihStats.totalAllTime} · Активно: ${tasbihStats.activePresetTitle}`,
      cta: 'Открыть Тасбих',
      icon: Compass,
      accentBg: 'from-[#084737] to-[#04271e]',
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1b1f] flex flex-col">
      <PortalHeader activeSection="home" onSelectSection={onSelectSection} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10">
        {/* ГЛАВНЫЙ ПРИВЕТСТВЕННЫЙ БАННЕР */}
        <section className="relative rounded-3xl bg-[#06392c] text-white overflow-hidden shadow-lg border border-[#04271e]">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08]"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, #fef3c7 2px, transparent 0), radial-gradient(circle at 75px 75px, #fef3c7 2px, transparent 0)`,
              backgroundSize: '100px 100px',
            }}
          />
          <div className="absolute -right-16 -bottom-20 w-72 h-72 border-4 border-amber-300/10 rounded-full pointer-events-none" />
          <div className="absolute -left-16 -top-20 w-72 h-72 border-4 border-amber-300/10 rounded-full pointer-events-none" />

          <div className="relative z-10 px-5 sm:px-10 py-8 sm:py-12 lg:py-14 text-center max-w-3xl mx-auto">
            <div className="text-xs uppercase tracking-widest text-amber-300/90 font-semibold mb-2.5">
              Образовательный и духовный портал
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl lg:text-[42px] font-bold text-[#fef3c7] leading-tight mb-3">
              Библиотека благодеяний
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-emerald-100/90 leading-relaxed mb-6">
              Чтение канонических книг, достоверные мольбы (дуа), ежедневные утренние
              и вечерние азкары и интерактивный тасбих в одном пространстве.
            </p>

            {/* Быстрые кнопки 4 разделов внутри баннера */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-6">
              <button
                type="button"
                onClick={() => onSelectSection('library')}
                className="bg-[#fef3c7] hover:bg-amber-200 text-[#06392c] font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <BookOpen className="w-4 h-4" />
                <span>1. Библиотека</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectSection('dua')}
                className="bg-white/10 hover:bg-white/20 text-[#fef3c7] border border-amber-300/30 font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>2. Дуа</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectSection('adhkar')}
                className="bg-white/10 hover:bg-white/20 text-[#fef3c7] border border-amber-300/30 font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                <Sun className="w-4 h-4 text-amber-300" />
                <span>3. Азкары</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectSection('tasbih')}
                className="bg-white/10 hover:bg-white/20 text-[#fef3c7] border border-amber-300/30 font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                <Compass className="w-4 h-4 text-amber-300" />
                <span>4. Тасбих</span>
              </button>
            </div>

            <div className="flex justify-center">
              <VisitorCounterBadge stats={visitStats} variant="banner" />
            </div>
          </div>
        </section>

        {/* ОСНОВНЫЕ 4 РАЗДЕЛА ГЛАВНОЙ СТРАНИЦЫ */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5 pb-3 border-b border-slate-200">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Навигация по порталу
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Основные разделы
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Выберите нужный раздел для чтения или поминания Аллаха
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {mainSections.map((sec) => {
              const Icon = sec.icon;
              return (
                <article
                  key={sec.id}
                  onClick={() => {
                    onSelectSection(sec.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group bg-white rounded-3xl border border-slate-200/90 hover:border-[#06392c]/50 p-6 sm:p-7 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    {/* Верхняя строка карточки */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-linear-to-br ${sec.accentBg} text-[#fef3c7] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}
                        >
                          <Icon className="w-6 h-6 text-amber-300" />
                        </div>
                        <div>
                          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block">
                            Раздел {sec.num}
                          </span>
                          <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-[#06392c] transition-colors">
                            {sec.title}
                          </h3>
                        </div>
                      </div>

                      <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-[#06392c] text-slate-600 group-hover:text-[#fef3c7] flex items-center justify-center transition-colors shrink-0">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm font-semibold text-emerald-900 mb-2">
                      {sec.subtitle}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                      {sec.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 font-medium">
                      {sec.meta}
                    </span>

                    <span className="text-xs font-bold text-[#06392c] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1 shrink-0">
                      <span>{sec.cta}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* НИЖНИЙ РЯД: ДУА ДНЯ ИЗ КНИГИ И БЫСТРЫЙ ДОСТУП К КНИГАМ БИБЛИОТЕКИ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Карточка «Мольба дня из книги Простые благодеяния» (7 колонок) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-5">
                <div>
                  <div className="text-xs uppercase tracking-widest text-emerald-800 font-semibold">
                    Избранная мольба · {featuredDua.categoryLabel}
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                    {featuredDua.title}
                  </h3>
                </div>
                <span className="text-xs text-slate-400">{featuredDua.source}</span>
              </div>

              <div className="rounded-2xl bg-[#faf8f2] border border-[#e8e2d2] px-5 py-6 mb-4">
                <p
                  dir="rtl"
                  className="font-arabic text-2xl sm:text-3xl leading-[2.0] text-right text-[#06392c]"
                >
                  {featuredDua.arabic}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 italic mb-2">
                {featuredDua.transliteration}
              </p>
              <p className="font-serif text-sm sm:text-base text-slate-900 leading-relaxed mb-4">
                «{featuredDua.translation}»
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onSelectSection('dua')}
                className="bg-[#06392c] hover:opacity-95 text-[#fef3c7] text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Все мольбы в разделе «Дуа»</span>
              </button>

              {featuredDua.bookChapterNumber && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenEasyDeedsChapterNumber(featuredDua.bookChapterNumber!)
                  }
                  className="text-xs font-semibold text-[#06392c] hover:text-emerald-700 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Открыть главу {featuredDua.bookChapterNumber} в книге →</span>
                </button>
              )}
            </div>
          </div>

          {/* Быстрый доступ к книгам библиотеки (5 колонок) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                    Издания в каталоге
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                    Книги для чтения
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectSection('library')}
                  className="text-xs font-semibold text-[#06392c] hover:underline cursor-pointer"
                >
                  Весь каталог →
                </button>
              </div>

              <div className="space-y-3.5">
                {CATALOG_BOOKS.map((catBook) => {
                  const bookObj = INTERACTIVE_BOOKS_MAP[catBook.id];
                  const chaptersCount = bookObj ? bookObj.chapters.length : 0;

                  return (
                    <div
                      key={catBook.id}
                      onClick={() => onOpenBookToc(catBook.id)}
                      className="group p-3.5 rounded-2xl border border-slate-200/80 hover:border-[#06392c]/40 bg-slate-50/60 hover:bg-white transition flex items-center gap-3.5 cursor-pointer"
                    >
                      <div className="w-14 shrink-0 rounded-lg overflow-hidden shadow-xs border border-amber-300/30">
                        <BookCoverRenderer
                          coverType={catBook.coverType}
                          title={catBook.title}
                          author={catBook.author}
                          coverImageUrl={catBook.coverImageUrl}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-slate-500 truncate">
                          {catBook.author}
                        </div>
                        <h4 className="font-serif font-bold text-sm text-slate-900 group-hover:text-[#06392c] line-clamp-2 leading-snug">
                          {catBook.title}
                        </h4>
                        <div className="text-[11px] text-emerald-800 font-medium mt-1 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          <span>Разделов: {chaptersCount} · Открыть оглавление</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#06392c] shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onSelectSection('library')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-[#06392c]" />
                <span>Перейти в раздел «1. Библиотека»</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ФУТЕР ГЛАВНОЙ СТРАНИЦЫ */}
      <footer className="border-t border-slate-200 bg-white mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <VisitorCounterBadge stats={visitStats} variant="footer" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#06392c]" />
              <span className="font-serif font-bold text-slate-800">
                Библиотека благодеяний
              </span>
              <span>— 1. Библиотека · 2. Дуа · 3. Азкары · 4. Тасбих</span>
            </div>
            <div>
              По материалам книги «Простые благодеяния» (Муфтий Мухаммад Таки Усмани)
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
