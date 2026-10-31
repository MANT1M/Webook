import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Bookmark,
  Copy,
  Check,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  DUA_CATEGORIES,
  DUA_COLLECTION,
  DuaCategory,
  DuaItem,
} from '../data/spiritualPracticesData';
import { PortalHeader, PortalSection } from './PortalHeader';

export interface DuaScreenProps {
  onSelectSection: (section: PortalSection) => void;
  onOpenBookChapter: (chapterNumber: number) => void;
}

export const DuaScreen: React.FC<DuaScreenProps> = ({
  onSelectSection,
  onOpenBookChapter,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DuaCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [showTransliteration, setShowTransliteration] = useState<boolean>(true);
  const [arabicScale, setArabicScale] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('portal_favorite_duas');
      if (raw) return new Set(JSON.parse(raw));
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem('portal_favorite_duas', JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleCopyDua = async (dua: DuaItem) => {
    const text = `${dua.title}\n\n${dua.arabic}\n\nТранслитерация: ${dua.transliteration}\n\nПеревод: ${dua.translation}\n\nИсточник: ${dua.source}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(dua.id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === dua.id ? null : prev));
      }, 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const filteredDuas = useMemo(() => {
    return DUA_COLLECTION.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (onlyFavorites && !favoriteIds.has(item.id)) {
        return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.translation.toLowerCase().includes(q) ||
        item.transliteration.toLowerCase().includes(q) ||
        item.virtue.toLowerCase().includes(q) ||
        (item.bookChapterTitle && item.bookChapterTitle.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, onlyFavorites, favoriteIds, searchQuery]);

  const arabicFontSizeClass =
    arabicScale === 'xlarge'
      ? 'text-3xl sm:text-4xl leading-[2.1]'
      : arabicScale === 'large'
      ? 'text-2xl sm:text-3xl leading-[2.0]'
      : 'text-xl sm:text-2xl leading-[1.9]';

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1b1f] flex flex-col">
      <PortalHeader activeSection="dua" onSelectSection={onSelectSection} />

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
            Раздел 02 · Собрание Дуа
          </div>
        </div>

        {/* Заголовочный блок раздела Дуа */}
        <section className="rounded-2xl sm:rounded-3xl bg-[#06392c] text-white p-6 sm:p-8 lg:p-10 mb-7 shadow-md relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(circle at 24px 24px, #fef3c7 2px, transparent 0)`,
              backgroundSize: '48px 48px',
            }}
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300/90 font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Мольбы из Корана, Сунны и книги «Простые благодеяния»</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#fef3c7] tracking-tight mb-2.5">
                Собрание достоверных Дуа
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                Мольба (дуа) — это суть поклонения и прямая связь раба со своим Господом.
                Каждая мольба снабжена арабским оригиналом, транслитерацией, переводом смысла
                и ссылкой на соответствующую главу книги муфтия Мухаммада Таки Усмани.
              </p>
            </div>

            {/* Поиск по дуа */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по смыслу, тексту или главе..."
                  className="w-full bg-white text-slate-900 rounded-xl py-2.5 pl-10 pr-9 text-xs sm:text-sm outline-none shadow-xs placeholder:text-slate-400 focus:ring-2 focus:ring-amber-300/60"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer"
                    title="Очистить"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Панель фильтров и настроек отображения */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 mb-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {DUA_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-[#06392c] text-[#fef3c7] shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setOnlyFavorites((prev) => !prev)}
              className={`ml-auto px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                onlyFavorites
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  onlyFavorites ? 'fill-amber-600 text-amber-600' : 'text-slate-400'
                }`}
              />
              <span>Избранные ({favoriteIds.size})</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Показано мольб: <strong className="text-slate-900">{filteredDuas.length}</strong> из{' '}
              {DUA_COLLECTION.length}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Переключатель транслитерации */}
              <button
                type="button"
                onClick={() => setShowTransliteration((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
              >
                {showTransliteration ? (
                  <Eye className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Транслитерация</span>
              </button>

              {/* Размер арабского текста */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setArabicScale('normal')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    arabicScale === 'normal'
                      ? 'bg-white text-[#06392c] shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  Араб. A
                </button>
                <button
                  type="button"
                  onClick={() => setArabicScale('large')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    arabicScale === 'large'
                      ? 'bg-white text-[#06392c] shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => setArabicScale('xlarge')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    arabicScale === 'xlarge'
                      ? 'bg-white text-[#06392c] shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  A++
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Список карточек Дуа */}
        {filteredDuas.length > 0 ? (
          <div className="space-y-5">
            {filteredDuas.map((dua, index) => {
              const isFav = favoriteIds.has(dua.id);
              const isCopied = copiedId === dua.id;

              return (
                <article
                  key={dua.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-2xs hover:border-emerald-900/25 transition-colors"
                >
                  {/* Верхняя строка метаданных и кнопок действий */}
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-1">
                        {String(index + 1).padStart(2, '0')} · {dua.categoryLabel} · {dua.source}
                      </div>
                      <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
                        {dua.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyDua(dua)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
                        title="Скопировать текст дуа"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="text-emerald-800 font-semibold">Скопировано</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Копировать</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFavorite(dua.id)}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                          isFav
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                        title={isFav ? 'Убрать из избранного' : 'В избранное'}
                      >
                        <Bookmark
                          className={`w-4 h-4 ${
                            isFav ? 'fill-amber-600 text-amber-600' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Арабский оригинал */}
                  <div className="my-5 rounded-2xl bg-[#faf8f2] border border-[#e8e2d2] px-5 py-6 sm:px-7 sm:py-7">
                    <p
                      dir="rtl"
                      className={`font-arabic text-right text-[#06392c] select-all ${arabicFontSizeClass}`}
                    >
                      {dua.arabic}
                    </p>
                  </div>

                  {/* Транслитерация */}
                  {showTransliteration && (
                    <div className="mb-4">
                      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                        Транслитерация
                      </div>
                      <p className="text-sm sm:text-base text-slate-700 italic leading-relaxed">
                        {dua.transliteration}
                      </p>
                    </div>
                  )}

                  {/* Смысловой перевод */}
                  <div className="mb-5">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                      Перевод смысла
                    </div>
                    <p className="font-serif text-base sm:text-lg text-slate-900 leading-relaxed">
                      «{dua.translation}»
                    </p>
                  </div>

                  {/* Достоинство и ссылка на главу книги */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                      <strong className="text-[#06392c] font-semibold">Достоинство и наставление: </strong>
                      {dua.virtue}
                    </p>

                    {dua.bookChapterNumber && (
                      <button
                        type="button"
                        onClick={() => onOpenBookChapter(dua.bookChapterNumber!)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-[#06392c] border border-emerald-200 text-xs font-semibold transition cursor-pointer shrink-0 self-start sm:self-center"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
                        <span>Открыть главу {dua.bookChapterNumber} в книге</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-md mx-auto">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-4">
              По выбранным условиям мольбы не найдены.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setOnlyFavorites(false);
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-[#06392c] text-[#fef3c7] text-xs font-semibold cursor-pointer"
            >
              Показать все дуа
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
