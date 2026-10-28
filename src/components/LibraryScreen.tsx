import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  X,
  Download,
  Bookmark,
  ChevronRight,
  User,
  Sparkles,
  ArrowLeft,
  Check,
  Clock,
  Layers,
  Calendar,
} from 'lucide-react';
import { BookData, ChapterData, ChapterProgress } from '../types/reader';
import { CustomScrollbar } from './CustomScrollbar';
import { AmveraFilesModal } from './AmveraFilesModal';
import { AuthModal } from './AuthModal';
import { BookDetailsModal } from './BookDetailsModal';
import { BookCoverRenderer } from './BookCoverRenderer';
import {
  CATALOG_BOOKS,
  CatalogBook,
  INTERACTIVE_BOOKS_MAP,
} from '../data/catalogBooks';
import { useVisitCounter } from '../hooks/useVisitCounter';
import { VisitorCounterBadge } from './VisitorCounterBadge';

export type QuizOrigin = 'library' | 'reader';

export interface LibraryScreenProps {
  book: BookData;
  progress: Record<number, ChapterProgress>;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onOpenChapter: (chapter: ChapterData) => void;
  onStartQuiz: (chapter: ChapterData, origin: QuizOrigin) => void;
  selectedBookId?: string | null;
  onSelectBook?: (bookId: string | null) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  book,
  progress,
  searchQuery: controlledSearchQuery,
  onSearchQueryChange,
  onOpenChapter,
  onStartQuiz,
  selectedBookId: controlledSelectedBookId,
  onSelectBook,
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>('');
  const [internalSelectedBookId, setInternalSelectedBookId] =
    useState<string | null>(null);

  const visitStats = useVisitCounter();

  const [chapterSearchQuery, setChapterSearchQuery] = useState<string>('');
  const [chapterFilter, setChapterFilter] = useState<'all' | 'unread' | 'passed'>('all');
  const [selectedParentChapterTitle, setSelectedParentChapterTitle] =
    useState<string | null>(null);

  const [amveraModalOpen, setAmveraModalOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [selectedBookForDetails, setSelectedBookForDetails] =
    useState<CatalogBook | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    try {
      return localStorage.getItem('library_user') || null;
    } catch {
      return null;
    }
  });

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('library_bookmarks');
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch {
      // fallback
    }
    return new Set<string>();
  });

  const selectedBookId =
    controlledSelectedBookId !== undefined
      ? controlledSelectedBookId
      : internalSelectedBookId;

  const handleSelectBook = (bookId: string | null) => {
    setSelectedParentChapterTitle(null);
    if (onSelectBook) {
      onSelectBook(bookId);
    } else {
      setInternalSelectedBookId(bookId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const searchQuery =
    controlledSearchQuery !== undefined
      ? controlledSearchQuery
      : internalSearchQuery;

  const setSearchQuery = (val: string) => {
    if (onSearchQueryChange) {
      onSearchQueryChange(val);
    } else {
      setInternalSearchQuery(val);
    }
  };

  const handleToggleBookmark = (bookId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      try {
        localStorage.setItem('library_bookmarks', JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleLogin = (name: string) => {
    setCurrentUser(name);
    try {
      localStorage.setItem('library_user', name);
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('library_user');
    } catch {
      // ignore
    }
  };

  // Активная выбранная книга (для экрана Оглавления)
  const activeBook = useMemo(() => {
    if (selectedBookId && INTERACTIVE_BOOKS_MAP[selectedBookId]) {
      return INTERACTIVE_BOOKS_MAP[selectedBookId];
    }
    return book;
  }, [selectedBookId, book]);

  const selectedCatalogBook = useMemo(() => {
    if (!selectedBookId) return null;
    return CATALOG_BOOKS.find((b) => b.id === selectedBookId) || null;
  }, [selectedBookId]);

  // Сортированные главы для стабильного последовательного порядка
  const sortedChapters = useMemo(() => {
    return [...activeBook.chapters].sort(
      (a, b) => a.chapterOrder - b.chapterOrder
    );
  }, [activeBook.chapters]);

  // Первая глава выбранной книги (chapterOrder === 1)
  const firstChapter = useMemo(() => {
    return (
      sortedChapters.find((ch) => ch.chapterOrder === 1) ||
      sortedChapters[0] ||
      activeBook.chapters[0]
    );
  }, [sortedChapters, activeBook.chapters]);

  // Статистика чтения по выбранной книге
  const totalChapters = activeBook.chapters.length;
  const passedCount = useMemo(() => {
    return activeBook.chapters.filter(
      (ch) => progress[ch.id]?.status === 'PASSED'
    ).length;
  }, [activeBook.chapters, progress]);

  const unreadCount = totalChapters - passedCount;

  const ratio = useMemo(() => {
    if (totalChapters === 0) return 0;
    return Math.round((passedCount / totalChapters) * 100);
  }, [passedCount, totalChapters]);

  // Фильтрация книг каталога по поисковому запросу
  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return CATALOG_BOOKS;

    return CATALOG_BOOKS.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.annotation.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Фильтрация глав для экрана Оглавления
  const filteredChapters = useMemo(() => {
    let list = sortedChapters;

    if (chapterFilter === 'passed') {
      list = list.filter((ch) => progress[ch.id]?.status === 'PASSED');
    } else if (chapterFilter === 'unread') {
      list = list.filter((ch) => progress[ch.id]?.status !== 'PASSED');
    }

    const q = chapterSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (ch) =>
          ch.title.toLowerCase().includes(q) ||
          (ch.parentChapterTitle &&
            ch.parentChapterTitle.toLowerCase().includes(q)) ||
          String(ch.chapterOrder).includes(q)
      );
    }

    return list;
  }, [sortedChapters, chapterFilter, chapterSearchQuery, progress]);

  // Группировка глав и подглав для отображения в Оглавлении
  const tocItems = useMemo(() => {
    type TocItem =
      | { type: 'single'; chapter: ChapterData; chapterNumber: number }
      | {
          type: 'group';
          parentTitle: string;
          parentNumber: number;
          subchapters: ChapterData[];
        };

    const items: TocItem[] = [];
    const groupMap = new Map<
      string,
      { parentTitle: string; parentNumber: number; subchapters: ChapterData[] }
    >();

    for (const ch of filteredChapters) {
      if (ch.parentChapterTitle) {
        const key = ch.parentChapterTitle;
        let existing = groupMap.get(key);
        if (!existing) {
          existing = {
            parentTitle: ch.parentChapterTitle,
            parentNumber: ch.parentChapterNumber ?? ch.chapterOrder,
            subchapters: [],
          };
          groupMap.set(key, existing);
          items.push({ type: 'group', ...existing });
        }
        existing.subchapters.push(ch);
      } else {
        const chapterNumber =
          ch.chapterOrder ??
          activeBook.chapters.findIndex((c) => c.id === ch.id) + 1;
        items.push({ type: 'single', chapter: ch, chapterNumber });
      }
    }

    return items;
  }, [filteredChapters, activeBook.chapters]);

  // Данные выбранной главы с подглавами (открывается при клике на главу)
  const selectedGroupSubchapters = useMemo(() => {
    if (!selectedParentChapterTitle) return null;
    const subs = sortedChapters.filter(
      (ch) => ch.parentChapterTitle === selectedParentChapterTitle
    );
    if (subs.length === 0) return null;
    return {
      parentTitle: selectedParentChapterTitle,
      parentNumber: subs[0].parentChapterNumber ?? subs[0].chapterOrder,
      subchapters: subs,
    };
  }, [sortedChapters, selectedParentChapterTitle]);

  // Количество верхнеуровневых глав (с учетом объединения подглав в одну главу)
  const topLevelChaptersCount = useMemo(() => {
    const parentTitles = new Set<string>();
    let count = 0;
    for (const ch of activeBook.chapters) {
      if (ch.parentChapterTitle) {
        if (!parentTitles.has(ch.parentChapterTitle)) {
          parentTitles.add(ch.parentChapterTitle);
          count += 1;
        }
      } else {
        count += 1;
      }
    }
    return count;
  }, [activeBook.chapters]);

  // Нажатие на книгу в каталоге: переход в ОГЛАВЛЕНИЕ книги
  const handleActionClick = (catBook: CatalogBook) => {
    if (catBook.isInteractiveReader) {
      handleSelectBook(catBook.id);
    } else {
      setSelectedBookForDetails(catBook);
    }
  };

  // Определение главы для продолжения чтения:
  // Если есть прочитанные главы (passedCount > 0), берем следующую непрочитанную по порядку.
  // Иначе, если у первой главы есть смещение, возобновляем первую главу.
  // Во всех остальных случаях — строго первая глава книги.
  const resumeChapter = useMemo(() => {
    if (!firstChapter) return activeBook.chapters[0];

    if (passedCount > 0) {
      const nextUnread = sortedChapters.find(
        (ch) => progress[ch.id]?.status !== 'PASSED'
      );
      if (nextUnread) return nextUnread;
    }

    if ((progress[firstChapter.id]?.offset ?? 0) > 0) {
      return firstChapter;
    }

    return firstChapter;
  }, [firstChapter, passedCount, progress, sortedChapters, activeBook.chapters]);

  // ==========================================
  // 1. ЭКРАН ОГЛАВЛЕНИЯ КНИГИ ("TOC VIEW")
  // ==========================================
  if (selectedBookId && INTERACTIVE_BOOKS_MAP[selectedBookId]) {

    return (
      <div className="min-h-screen bg-[#faf9f6] text-[#1c1b1f] flex flex-col">
        <CustomScrollbar mode="library" />

        {/* ШАПКА ОГЛАВЛЕНИЯ */}
        <header className="sticky top-0 z-30 bg-[#06392c] text-white shadow-md border-b border-[#04271e]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-4">
            {/* Кнопка «← Каталог книг» и логотип */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => handleSelectBook(null)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/25 text-[#fef3c7] px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 border border-amber-300/20"
                title="Вернуться в каталог всех книг"
              >
                <ArrowLeft className="w-4 h-4 text-amber-300" />
                <span>Каталог книг</span>
              </button>

              <div className="h-5 w-px bg-white/20 hidden sm:block shrink-0" />

              <div
                onClick={() => handleSelectBook(null)}
                className="flex items-center gap-2 cursor-pointer group select-none min-w-0"
              >
                <BookOpen className="w-4 h-4 text-[#fef3c7] shrink-0" />
                <h1 className="font-serif font-bold text-sm sm:text-base text-[#fef3c7] tracking-tight truncate hidden md:inline">
                  Библиотека благодеяний
                </h1>
              </div>
            </div>

            {/* Правая часть: счетчик визитов, Войти и Файлы */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <VisitorCounterBadge stats={visitStats} variant="header" />

              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="border border-[#fef3c7]/30 hover:border-[#fef3c7]/60 bg-transparent hover:bg-white/10 text-[#fef3c7] rounded-lg px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-amber-300" />
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {currentUser ? currentUser : 'Войти'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAmveraModalOpen(true)}
                title="Файлы и сборка приложения"
                className="border border-[#fef3c7]/30 hover:border-[#fef3c7]/60 bg-transparent hover:bg-white/10 text-[#fef3c7] rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Файлы</span>
              </button>
            </div>
          </div>
        </header>

        {/* ХЛЕБНЫЕ КРОШКИ */}
        <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-2.5 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap min-w-0">
              <button
                onClick={() => handleSelectBook(null)}
                className="hover:text-emerald-800 transition cursor-pointer"
              >
                Каталог
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-700 font-medium truncate">
                «{selectedCatalogBook?.title ?? activeBook.title}»
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {selectedGroupSubchapters ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedParentChapterTitle(null)}
                    className="hover:text-emerald-800 transition cursor-pointer font-medium text-slate-700"
                  >
                    Оглавление
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-emerald-900 truncate">
                    Глава {selectedGroupSubchapters.parentNumber}: {selectedGroupSubchapters.parentTitle}
                  </span>
                </>
              ) : (
                <span className="font-semibold text-emerald-900">
                  Оглавление
                </span>
              )}
            </div>

            <div className="text-[11px] font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
              {topLevelChaptersCount === 1
                ? '1 глава'
                : topLevelChaptersCount >= 2 && topLevelChaptersCount <= 4
                ? `${topLevelChaptersCount} главы`
                : `${topLevelChaptersCount} глав`}
            </div>
          </div>
        </div>

        {/* ОСНОВНОЙ КОНТЕНТ ОГЛАВЛЕНИЯ */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* КАРТОЧКА КНИГИ И ПРОГРЕСС ЧТЕНИЯ */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs mb-8">
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-7 items-start">
              {/* Обложка книги с золотистой рамкой */}
              <div className="w-36 sm:w-44 md:w-48 shrink-0 mx-auto sm:mx-0 shadow-lg rounded-xl overflow-hidden border-2 border-amber-300/40">
                <BookCoverRenderer
                  coverType={selectedCatalogBook?.coverType ?? 'image'}
                  title={selectedCatalogBook?.title ?? activeBook.title}
                  author={selectedCatalogBook?.author ?? activeBook.author}
                  coverImageUrl={
                    selectedCatalogBook?.coverImageUrl ??
                    '/assets/aistudio/____________8cd66871.png'
                  }
                />
              </div>

              {/* Данные о книге и прогресс */}
              <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider bg-emerald-100 text-[#06392c] px-2.5 py-0.5 rounded-md">
                      {selectedCatalogBook?.category ??
                        activeBook.genre ??
                        'Издание'}
                    </span>
                    {selectedCatalogBook?.year && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {selectedCatalogBook.year}
                      </span>
                    )}
                    {selectedCatalogBook?.pages && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {selectedCatalogBook.pages} страниц
                      </span>
                    )}
                  </div>

                  <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-1.5">
                    {selectedCatalogBook?.title ?? activeBook.title}
                  </h2>
                  <p className="text-sm sm:text-base font-medium text-emerald-900 mb-3">
                    {activeBook.author}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl mb-5">
                    {activeBook.description}
                  </p>
                </div>

                {/* Блок прогресса и действия */}
                <div className="pt-4 border-t border-slate-100 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">Прогресс чтения:</span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        {passedCount} из {totalChapters} разд. ({ratio}%)
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      {unreadCount > 0
                        ? `Осталось прочитать: ${unreadCount}`
                        : 'Поздравляем! Все главы прочитаны 🎉'}
                    </span>
                  </div>

                  {/* Полоса прогресса */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-emerald-600 to-[#06392c] transition-all duration-500 rounded-full"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>

                  {/* Кнопки действий */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (ratio > 0 && resumeChapter) {
                          onOpenChapter(resumeChapter);
                        } else {
                          onOpenChapter(firstChapter);
                        }
                      }}
                      className="bg-[#06392c] hover:opacity-95 active:scale-[0.99] text-[#fef3c7] font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
                      title={
                        ratio > 0
                          ? `Продолжить: ${resumeChapter?.title}`
                          : `Начать чтение: 1. ${firstChapter?.title}`
                      }
                    >
                      <BookOpen className="w-4 h-4 text-amber-300" />
                      <span>
                        {ratio > 0
                          ? `Продолжить: ${resumeChapter?.title ?? 'Глава 1'}`
                          : 'Начать чтение с первой главы'}
                      </span>
                    </button>

                    {/* Если уже есть прогресс (ratio > 0), даем быстрый переход к 1-й главе */}
                    {ratio > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpenChapter(firstChapter)}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                        title={`Открыть 1-ю главу: ${firstChapter?.title}`}
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                        <span>С первой главы</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(selectedBookId)}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
                    >
                      <Bookmark
                        className={`w-4 h-4 ${
                          bookmarkedIds.has(selectedBookId)
                            ? 'fill-[#06392c] text-[#06392c]'
                            : 'text-slate-400'
                        }`}
                      />
                      <span>
                        {bookmarkedIds.has(selectedBookId)
                          ? 'В закладках'
                          : 'В закладки'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* СЕКЦИЯ: ОГЛАВЛЕНИЕ КНИГИ ИЛИ СПИСОК ПОДГЛАВ ВЫБРАННОЙ ГЛАВЫ */}
          <section className="mb-12">
            {selectedGroupSubchapters ? (
              /* ЭКРАН ПОДГЛАВ ВЫБРАННОЙ ГЛАВЫ */
              <div>
                <div className="mb-5">
                  <button
                    type="button"
                    onClick={() => setSelectedParentChapterTitle(null)}
                    className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-[#06392c] border border-slate-200 hover:border-emerald-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shadow-2xs"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-800" />
                    <span>Назад к списку глав</span>
                  </button>
                </div>

                <div className="bg-white rounded-2xl sm:rounded-3xl border border-emerald-900/20 shadow-xs overflow-hidden">
                  {/* Заголовок выбранной главы */}
                  <div className="bg-linear-to-r from-[#06392c] to-[#0a4f3c] text-white px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-300/20 border border-amber-300/40 text-[#fef3c7] flex items-center justify-center font-mono font-bold text-sm shrink-0">
                        {String(selectedGroupSubchapters.parentNumber).padStart(2, '0')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-300/20 text-amber-200 px-2 py-0.5 rounded-md border border-amber-300/30">
                            Глава {selectedGroupSubchapters.parentNumber} ·{' '}
                            {selectedGroupSubchapters.subchapters.length}{' '}
                            {selectedGroupSubchapters.subchapters.length === 1
                              ? 'подглава'
                              : selectedGroupSubchapters.subchapters.length >= 2 &&
                                selectedGroupSubchapters.subchapters.length <= 4
                              ? 'подглавы'
                              : 'подглав'}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-emerald-100">
                            Прочитано:{' '}
                            {
                              selectedGroupSubchapters.subchapters.filter(
                                (sub) => progress[sub.id]?.status === 'PASSED'
                              ).length
                            }{' '}
                            из {selectedGroupSubchapters.subchapters.length}
                          </span>
                        </div>
                        <h4 className="font-serif font-bold text-base sm:text-lg text-[#fef3c7] leading-snug">
                          {selectedGroupSubchapters.parentTitle}
                        </h4>
                      </div>
                    </div>

                    {selectedGroupSubchapters.subchapters[0] && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenChapter(selectedGroupSubchapters.subchapters[0])
                        }
                        className="bg-[#fef3c7] hover:bg-amber-200 text-[#06392c] px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#06392c]" />
                        <span>Читать с 1-й подглавы</span>
                      </button>
                    )}
                  </div>

                  {/* Список подглав */}
                  <div className="p-4 sm:p-6 bg-[#faf9f6]/60 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedGroupSubchapters.subchapters.map((sub, subIdx) => {
                      const subProg = progress[sub.id];
                      const isPassed = subProg?.status === 'PASSED';
                      const inProgress =
                        (subProg?.offset ?? 0) > 0 && !isPassed;
                      const bestScore = subProg?.bestScore;
                      const subNum = sub.subchapterOrder ?? subIdx + 1;

                      return (
                        <article
                          key={sub.id}
                          onClick={() => onOpenChapter(sub)}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                            isPassed
                              ? 'bg-white border-emerald-200/90 hover:border-emerald-500 hover:shadow-sm'
                              : inProgress
                              ? 'bg-white border-amber-200/90 hover:border-amber-400 hover:shadow-sm'
                              : 'bg-white border-slate-200/90 hover:border-emerald-600/60 hover:shadow-sm'
                          }`}
                        >
                          <div>
                            <div className="flex items-start gap-3 mb-2.5">
                              <div
                                className={`px-2.5 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                                  isPassed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : inProgress
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-950/10 text-[#06392c] group-hover:bg-[#06392c] group-hover:text-[#fef3c7]'
                                }`}
                              >
                                {selectedGroupSubchapters.parentNumber}.{subNum}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-0.5">
                                  Подглава {subNum} из{' '}
                                  {sub.subchapterCount ??
                                    selectedGroupSubchapters.subchapters.length}
                                </div>
                                <h5 className="font-serif font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-900 leading-snug transition-colors">
                                  {sub.title}
                                </h5>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-2 mb-3 text-[11px]">
                              {isPassed ? (
                                <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Прочитано
                                </span>
                              ) : inProgress ? (
                                <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  В процессе
                                </span>
                              ) : (
                                <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  Не прочитано
                                </span>
                              )}

                              {bestScore !== undefined && bestScore > 0 && (
                                <span
                                  className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                                    bestScore >= 80
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  <Sparkles className="w-3 h-3 text-amber-600" />
                                  Тест: {bestScore}%
                                </span>
                              )}

                              {sub.footnotes && sub.footnotes.length > 0 && (
                                <span className="text-slate-400">
                                  · {sub.footnotes.length} сносок
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {sub.quiz && sub.quiz.length > 0 && (
                              <button
                                type="button"
                                onClick={() => onStartQuiz(sub, 'library')}
                                className="bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/80 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                <span>Пройти тест</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onOpenChapter(sub)}
                              className="bg-[#06392c] hover:opacity-95 text-[#fef3c7] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                              <span>Читать подглаву</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                      <span>Оглавление книги</span>
                      <span className="text-xs font-sans font-semibold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                        {topLevelChaptersCount}{' '}
                        {topLevelChaptersCount === 1
                          ? 'глава'
                          : topLevelChaptersCount >= 2 && topLevelChaptersCount <= 4
                          ? 'главы'
                          : 'глав'}
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Выберите главу для чтения или перехода к её подглавам
                    </p>
                  </div>

                  {/* Поиск и фильтры по главам */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {/* Поле поиска по названию главы */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={chapterSearchQuery}
                        onChange={(e) => setChapterSearchQuery(e.target.value)}
                        placeholder="Поиск по главам..."
                        className="w-full sm:w-60 bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                      />
                      {chapterSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setChapterSearchQuery('')}
                          className="w-5 h-5 rounded-full hover:bg-slate-100 absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Очистить"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Переключатели фильтра: Все / Непрочитанные / Пройденные */}
                    <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => setChapterFilter('all')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                          chapterFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Все ({totalChapters})
                      </button>
                      <button
                        type="button"
                        onClick={() => setChapterFilter('unread')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                          chapterFilter === 'unread'
                            ? 'bg-white text-slate-900 shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Осталось ({unreadCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setChapterFilter('passed')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                          chapterFilter === 'passed'
                            ? 'bg-white text-slate-900 shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Пройдено ({passedCount})
                      </button>
                    </div>
                  </div>
                </div>

                {/* СПИСОК ГЛАВ (GRID 1-2 КОЛОНКИ) */}
                {tocItems.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {tocItems.map((item) => {
                      if (item.type === 'group') {
                        const allParentSubs = sortedChapters.filter(
                          (c) => c.parentChapterTitle === item.parentTitle
                        );
                        const totalSubCount =
                          allParentSubs.length || item.subchapters.length;
                        const subCountLabel =
                          totalSubCount === 1
                            ? '1 подглава'
                            : totalSubCount >= 2 && totalSubCount <= 4
                            ? `${totalSubCount} подглавы`
                            : `${totalSubCount} подглав`;

                        return (
                          <article
                            key={`group-${item.parentTitle}`}
                            onClick={() =>
                              setSelectedParentChapterTitle(item.parentTitle)
                            }
                            className="p-4 sm:p-5 rounded-2xl border bg-white border-slate-200/80 hover:border-emerald-600/60 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                          >
                            {/* Верхняя часть карточки главы с подглавами */}
                            <div className="flex items-start gap-3.5 mb-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors bg-slate-100 text-slate-600 group-hover:bg-[#06392c] group-hover:text-[#fef3c7]">
                                {String(item.parentNumber).padStart(2, '0')}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="font-serif font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-900 leading-snug transition-colors line-clamp-2">
                                  {item.parentTitle}
                                </h4>

                                <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                                  <span className="font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>{subCountLabel}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Нижняя часть с кнопкой перехода к подглавам */}
                            <div
                              className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedParentChapterTitle(item.parentTitle)
                                }
                                className="bg-[#06392c] hover:opacity-95 text-[#fef3c7] px-4 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                              >
                                <Layers className="w-3.5 h-3.5 text-amber-300" />
                                <span>К подглавам ({totalSubCount})</span>
                                <ChevronRight className="w-3.5 h-3.5 text-amber-300" />
                              </button>
                            </div>
                          </article>
                        );
                      }

                  const ch = item.chapter;
                  const chProg = progress[ch.id];
                  const isPassed = chProg?.status === 'PASSED';
                  const inProgress = (chProg?.offset ?? 0) > 0 && !isPassed;
                  const bestScore = chProg?.bestScore;
                  const chapterNumber = item.chapterNumber;

                  return (
                    <article
                      key={ch.id}
                      onClick={() => onOpenChapter(ch)}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                        isPassed
                          ? 'bg-white border-emerald-200/80 hover:border-emerald-500 hover:shadow-sm'
                          : inProgress
                          ? 'bg-white border-amber-200/90 hover:border-amber-400 hover:shadow-sm'
                          : 'bg-white border-slate-200/80 hover:border-emerald-600/60 hover:shadow-sm'
                      }`}
                    >
                      {/* Верхняя часть карточки главы */}
                      <div className="flex items-start gap-3.5 mb-3">
                        {/* Номер главы */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                            isPassed
                              ? 'bg-emerald-100 text-emerald-800'
                              : inProgress
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-[#06392c] group-hover:text-[#fef3c7]'
                          }`}
                        >
                          {String(chapterNumber).padStart(2, '0')}
                        </div>

                        {/* Название и мета */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-900 leading-snug transition-colors line-clamp-2">
                            {ch.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                            {/* Статус прочтения */}
                            {isPassed ? (
                              <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Прочитано
                              </span>
                            ) : inProgress ? (
                              <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                В процессе чтения
                              </span>
                            ) : (
                              <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                Не прочитано
                              </span>
                            )}

                            {/* Результат теста, если пройден */}
                            {bestScore !== undefined && bestScore > 0 && (
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                                  bestScore >= 80
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                Тест: {bestScore}%
                              </span>
                            )}

                            {ch.footnotes && ch.footnotes.length > 0 && (
                              <span className="text-slate-400">
                                · {ch.footnotes.length} сносок
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Нижняя часть с кнопками действий */}
                      <div
                        className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Кнопка Тест (если у главы есть вопросы) */}
                        {ch.quiz && ch.quiz.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onStartQuiz(ch, 'library')}
                            className="bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/80 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Пройти тест</span>
                          </button>
                        )}

                        {/* Кнопка Читать */}
                        <button
                          type="button"
                          onClick={() => onOpenChapter(ch)}
                          className="bg-[#06392c] hover:opacity-95 text-[#fef3c7] px-4 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                          <span>Читать главу</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-lg mx-auto">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-600 text-sm">
                      Главы по запросу «<strong>{chapterSearchQuery}</strong>» не найдены.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setChapterSearchQuery('');
                        setChapterFilter('all');
                      }}
                      className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </main>

        {/* ФУТЕР БИБЛИОТЕКИ */}
        <footer className="border-t border-slate-200 bg-white mt-auto py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
            <VisitorCounterBadge stats={visitStats} variant="footer" />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#06392c]" />
                <span className="font-serif font-bold text-slate-800">
                  Библиотека благодеяний
                </span>
                <span>— электронная коллекция полезных книг</span>
              </div>
              <div>
                «Простые благодеяния» · Муфтий Мухаммад Таки Усмани · Интерактивный ридер
              </div>
            </div>
          </div>
        </footer>

        {/* МОДАЛЬНЫЕ ОКНА */}
        <AmveraFilesModal
          isOpen={amveraModalOpen}
          onClose={() => setAmveraModalOpen(false)}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // ==========================================
  // 2. ЭКРАН КАТАЛОГА КНИГ ("CATALOG VIEW")
  // ==========================================
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1b1f] flex flex-col">
      <CustomScrollbar mode="library" />

      {/* ШАПКА САЙТА (HEADER) — темно-зеленый #06392c, логотип слева, кнопки справа */}
      <header className="sticky top-0 z-30 bg-[#06392c] text-white shadow-md border-b border-[#04271e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Логотип: открытая книга и название «Библиотека благодеяний» */}
          <div
            onClick={() => {
              setSearchQuery('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 cursor-pointer group select-none min-w-0"
          >
            <BookOpen className="w-5 h-5 text-[#fef3c7] transition-transform group-hover:scale-105 shrink-0" />
            <h1 className="font-serif font-bold text-base sm:text-lg lg:text-xl text-[#fef3c7] tracking-tight truncate">
              Библиотека благодеяний
            </h1>
          </div>

          {/* Правая часть: счетчик визитов, кнопка «Войти / Регистрация» и кнопка «Файлы» */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <VisitorCounterBadge stats={visitStats} variant="header" />

            {/* Кнопка Войти / Регистрация */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="border border-[#fef3c7]/30 hover:border-[#fef3c7]/60 bg-transparent hover:bg-white/10 text-[#fef3c7] rounded-lg px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-amber-300" />
              <span>{currentUser ? currentUser : 'Войти / Регистрация'}</span>
            </button>

            {/* Кнопка Файлы с иконкой загрузки */}
            <button
              type="button"
              onClick={() => setAmveraModalOpen(true)}
              title="Файлы и сборка приложения"
              className="border border-[#fef3c7]/30 hover:border-[#fef3c7]/60 bg-transparent hover:bg-white/10 text-[#fef3c7] rounded-lg px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Файлы</span>
            </button>
          </div>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {/* КРУПНЫЙ БАННЕР ВО ВСЮ ШИРИНУ НА ТЕМНО-ЗЕЛЕНОМ ФОНЕ С ВОСТОЧНЫМ ОРНАМЕНТОМ */}
        <section className="relative rounded-2xl sm:rounded-3xl bg-[#06392c] text-white overflow-hidden shadow-lg mb-8 sm:mb-10">
          {/* Фоновый восточный/геометрический орнамент */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.09]"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, #fef3c7 2px, transparent 0), radial-gradient(circle at 75px 75px, #fef3c7 2px, transparent 0)`,
              backgroundSize: '100px 100px',
            }}
          />

          {/* Декоративные восточные контуры арок на заднем плане */}
          <div className="absolute -right-12 -bottom-16 w-64 h-64 border-4 border-amber-300/10 rounded-full pointer-events-none" />
          <div className="absolute -left-12 -top-16 w-64 h-64 border-4 border-amber-300/10 rounded-full pointer-events-none" />

          <div className="relative z-10 px-4 sm:px-8 py-8 sm:py-12 md:py-14 text-center max-w-3xl mx-auto">
            {/* Заголовок баннера */}
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-bold text-[#fef3c7] leading-tight mb-2.5 drop-shadow-sm">
              Откройте для себя мир полезных книг
            </h2>

            {/* Короткая приветственная фраза на русском */}
            <p className="text-xs sm:text-sm md:text-base text-emerald-100/90 font-normal mb-6 sm:mb-8 leading-relaxed">
              Приветственный мир для полезных книг Библиотека благодеяний.
            </p>

            {/* Большая заметная поисковая строка с лупой и плейсхолдером */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск книг, авторов, тем..."
                className="w-full bg-white text-slate-900 rounded-full py-3.5 sm:py-4 pl-12 sm:pl-13 pr-11 text-sm sm:text-base outline-none shadow-md placeholder:text-slate-400 focus:ring-2 focus:ring-amber-300/50 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center transition cursor-pointer"
                  title="Очистить поиск"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Статистика читателей и посещений под поисковой строкой */}
            <div className="mt-4 flex justify-center">
              <VisitorCounterBadge stats={visitStats} variant="banner" />
            </div>
          </div>
        </section>

        {/* СЕКЦИЯ КАТАЛОГА КНИГ */}
        <section className="mb-12">
          {/* Заголовок раздела «Каталог книг» */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
            <div className="flex items-center gap-3">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Каталог книг
              </h3>
              <span className="text-xs text-slate-500 font-medium bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                {filteredBooks.length === 1
                  ? '1 книга'
                  : `${filteredBooks.length} книг`}
              </span>
            </div>

            {/* Быстрый доступ к Оглавлению книги «Простые благодеяния» */}
            <button
              type="button"
              onClick={() => handleSelectBook('prostye-blagodeyaniya')}
              className="text-xs font-semibold text-[#06392c] hover:text-emerald-800 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer group"
            >
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>
                Оглавление «Простые благодеяния» ({book.chapters.length} глав)
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* СЕТКА (GRID) КАРТОЧЕК КНИГ */}
          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(240px,280px))] gap-4 sm:gap-6">
              {filteredBooks.map((catBook) => {
                const isBookmarked = bookmarkedIds.has(catBook.id);
                const interactiveBookData = INTERACTIVE_BOOKS_MAP[catBook.id];
                const bookPassedCount = interactiveBookData
                  ? interactiveBookData.chapters.filter(
                      (ch) => progress[ch.id]?.status === 'PASSED'
                    ).length
                  : 0;
                const bookRatio =
                  interactiveBookData && interactiveBookData.chapters.length > 0
                    ? Math.round(
                        (bookPassedCount / interactiveBookData.chapters.length) *
                          100
                      )
                    : 0;
                const currentProgress = catBook.isInteractiveReader
                  ? bookRatio > 0
                    ? bookRatio
                    : undefined
                  : catBook.progressPercent;

                return (
                  <article
                    key={catBook.id}
                    className="w-full max-w-[280px] bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 group"
                  >
                    {/* Верхняя часть карточки: Обложка книги (клик переходит в Оглавление) */}
                    <div
                      className="cursor-pointer"
                      onClick={() => handleActionClick(catBook)}
                      title={`Открыть оглавление книги «${catBook.title}»`}
                    >
                      <BookCoverRenderer
                        coverType={catBook.coverType}
                        title={catBook.title}
                        author={catBook.author}
                        coverImageUrl={catBook.coverImageUrl}
                      />
                    </div>

                    {/* Средняя часть карточки: Автор, Название и Краткое описание */}
                    <div className="mt-2.5 flex-1 flex flex-col">
                      {/* Имя автора мельче */}
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                        {catBook.author}
                      </div>

                      {/* Название книги крупным шрифтом на русском (клик переходит в Оглавление) */}
                      <h4
                        onClick={() => handleActionClick(catBook)}
                        className="font-serif font-bold text-sm sm:text-base text-slate-900 leading-snug line-clamp-1 mt-0.5 cursor-pointer hover:text-emerald-800 transition-colors"
                        title={`Открыть оглавление книги «${catBook.title}»`}
                      >
                        {catBook.title}
                      </h4>

                      {/* Краткое описание (аннотация) на 2-3 строки на русском языке */}
                      <p className="text-[11px] sm:text-xs text-slate-600 line-clamp-2 leading-relaxed mt-1 mb-3">
                        {catBook.annotation}
                      </p>
                    </div>

                    {/* Нижняя часть карточки: Кнопка действия («Читать») и иконка закладки / прогресса */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      {/* Темно-зеленая кнопка «Читать» (переходит в Оглавление книги) */}
                      <button
                        type="button"
                        onClick={() => handleActionClick(catBook)}
                        title={`Открыть оглавление книги «${catBook.title}»`}
                        className="flex-1 bg-[#06392c] hover:opacity-95 active:scale-[0.98] text-[#fef3c7] font-semibold text-xs sm:text-sm py-2 px-2.5 rounded-xl text-center transition cursor-pointer"
                      >
                        {catBook.actionText}
                      </button>

                      {/* Иконка закладки или прогресса чтения */}
                      {currentProgress !== undefined ? (
                        /* Круговой индикатор прогресса (клик переходит в Оглавление) */
                        <div
                          title={`Прогресс чтения: ${currentProgress}% (нажмите для перехода в оглавление)`}
                          className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-emerald-800 shrink-0 cursor-pointer hover:bg-emerald-50/50 transition-colors"
                          onClick={() => handleActionClick(catBook)}
                        >
                          <svg className="w-4 h-4 -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-slate-200"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-[#06392c]"
                              strokeDasharray={`${currentProgress}, 100`}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                        </div>
                      ) : (
                        /* Иконка закладки */
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(catBook.id)}
                          title={
                            isBookmarked
                              ? 'В закладках'
                              : 'Добавить книгу в закладки'
                          }
                          className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 transition cursor-pointer"
                        >
                          <Bookmark
                            className={`w-4 h-4 transition-colors ${
                              isBookmarked
                                ? 'fill-[#06392c] text-[#06392c]'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-lg mx-auto">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">
                По запросу «<strong>{searchQuery}</strong>» ничего не найдено.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Сбросить поиск
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ФУТЕР БИБЛИОТЕКИ */}
      <footer className="border-t border-slate-200 bg-white mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <VisitorCounterBadge stats={visitStats} variant="footer" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#06392c]" />
              <span className="font-serif font-bold text-slate-800">
                Библиотека благодеяний
              </span>
              <span>— электронная коллекция полезных книг</span>
            </div>
            <div>
              «Простые благодеяния» · Муфтий Мухаммад Таки Усмани · Интерактивный ридер
            </div>
          </div>
        </div>
      </footer>

      {/* МОДАЛЬНОЕ ОКНО ФАЙЛОВ AMVERA */}
      <AmveraFilesModal
        isOpen={amveraModalOpen}
        onClose={() => setAmveraModalOpen(false)}
      />

      {/* МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ / РЕГИСТРАЦИИ */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* МОДАЛЬНОЕ ОКНО ПОДРОБНЕЕ О КНИГЕ */}
      <BookDetailsModal
        book={selectedBookForDetails}
        isOpen={Boolean(selectedBookForDetails)}
        onClose={() => setSelectedBookForDetails(null)}
        onRead={(bookToRead) => {
          if (bookToRead.isInteractiveReader) {
            handleSelectBook(bookToRead.id);
          } else {
            setToastMessage(`Книга «${bookToRead.title}» добавлена в список чтения`);
            setTimeout(() => setToastMessage(null), 3000);
          }
        }}
        isBookmarked={
          selectedBookForDetails
            ? bookmarkedIds.has(selectedBookForDetails.id)
            : false
        }
        onToggleBookmark={handleToggleBookmark}
        chapters={
          selectedBookForDetails?.isInteractiveReader ? book.chapters : undefined
        }
        onOpenChapter={onOpenChapter}
      />

      {/* Всплывающее уведомление (Toast) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#06392c] text-amber-100 px-5 py-3 rounded-2xl shadow-xl border border-amber-300/30 text-xs sm:text-sm font-medium flex items-center gap-2 animate-fade-in">
          <BookOpen className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
