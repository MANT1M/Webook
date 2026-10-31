/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { EASY_GOOD_DEEDS_BOOK } from './data/easyGoodDeedsData';
import { INTERACTIVE_BOOKS_MAP } from './data/catalogBooks';
import { useReaderState } from './hooks/useReaderState';
import { BookData, ChapterData } from './types/reader';
import { LibraryScreen, QuizOrigin } from './components/LibraryScreen';
import { ReaderScreen } from './components/ReaderScreen';
import { QuizScreen } from './components/QuizScreen';
import { HomeScreen } from './components/HomeScreen';
import { DuaScreen } from './components/DuaScreen';
import { AdhkarScreen } from './components/AdhkarScreen';
import { TasbihScreen } from './components/TasbihScreen';
import { PortalSection } from './components/PortalHeader';

type ScreenType = 'portal' | 'reader' | 'quiz';

function findBookEntryByChapterId(
  chapterId: number
): { catalogId: string; book: BookData; chapter: ChapterData } | null {
  for (const [catalogId, book] of Object.entries(INTERACTIVE_BOOKS_MAP)) {
    const chapter = book.chapters.find((c) => c.id === chapterId);
    if (chapter) {
      return { catalogId, book, chapter };
    }
  }
  return null;
}

function pushHistoryTag(tag: string) {
  try {
    window.history.pushState({ tag }, '', window.location.pathname + window.location.search);
  } catch {
    // Ignore history API restrictions in sandboxed environments
  }
}

export default function App() {
  const {
    theme,
    fontSize,
    arabicScale,
    progress,
    setTheme,
    setFontSize,
    setArabicScale,
    updateChapterOffset,
    recordQuizResult,
    getChapterProgress,
  } = useReaderState();

  const [screen, setScreen] = useState<ScreenType>('portal');
  const [portalSection, setPortalSection] = useState<PortalSection>('home');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<ChapterData | null>(null);
  const [quizOrigin, setQuizOrigin] = useState<QuizOrigin>('library');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFnId, setActiveFnId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const searchPushedRef = useRef<boolean>(false);

  const activeBook = useMemo(() => {
    if (selectedBookId && INTERACTIVE_BOOKS_MAP[selectedBookId]) {
      return INTERACTIVE_BOOKS_MAP[selectedBookId];
    }
    if (activeChapter) {
      const found = findBookEntryByChapterId(activeChapter.id);
      if (found) return found.book;
    }
    return EASY_GOOD_DEEDS_BOOK;
  }, [selectedBookId, activeChapter]);

  // При загрузке и обновлении сайта открываем Главную страницу и очищаем остаточный URL-хэш
  useEffect(() => {
    try {
      setScreen('portal');
      setPortalSection('home');
      setSelectedBookId(null);
      if (window.location.hash) {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search
        );
      }
    } catch {
      // Ignore URL / history errors in sandboxed environments
    }
  }, []);

  // Переключение между разделами портала (Главная, 1. Библиотека, 2. Дуа, 3. Азкары, 4. Тасбих)
  const handleSelectPortalSection = useCallback((section: PortalSection) => {
    setScreen('portal');
    setPortalSection(section);
    if (section !== 'library') {
      setSelectedBookId(null);
    }
    pushHistoryTag(`section-${section}`);
  }, []);

  // Обработчик выбора книги (переход в оглавление или возврат в каталог)
  const handleSelectBook = useCallback((bookId: string | null) => {
    setSelectedBookId(bookId);
    setScreen('portal');
    setPortalSection('library');
    if (bookId) {
      pushHistoryTag('toc');
    }
  }, []);

  // Обработчик изменения поискового запроса с пушем в History API при начале поиска
  const handleSearchQueryChange = useCallback((nextQuery: string) => {
    setSearchQuery((prev) => {
      if (prev === '' && nextQuery.trim() !== '' && !searchPushedRef.current) {
        pushHistoryTag('search');
        searchPushedRef.current = true;
      } else if (nextQuery === '') {
        searchPushedRef.current = false;
      }
      return nextQuery;
    });
  }, []);

  // Открытие главы
  const handleOpenChapter = useCallback((chapter: ChapterData) => {
    const found = findBookEntryByChapterId(chapter.id);
    setActiveChapter(chapter);
    setActiveFnId(null);
    setSettingsOpen(false);
    setSelectedBookId(found ? found.catalogId : 'prostye-blagodeyaniya');
    setScreen('reader');
    pushHistoryTag(`reader-${chapter.id}`);
  }, []);

  // Открытие главы книги «Простые благодеяния» по её номеру (например, из разделов Дуа / Азкары / Тасбих)
  const handleOpenEasyDeedsChapterNumber = useCallback(
    (chapterNumber: number) => {
      const targetChapter =
        EASY_GOOD_DEEDS_BOOK.chapters.find((ch) =>
          ch.title.trim().startsWith(`${chapterNumber}.`)
        ) ||
        EASY_GOOD_DEEDS_BOOK.chapters.find(
          (ch) => ch.id === 503 + chapterNumber
        );
      if (targetChapter) {
        handleOpenChapter(targetChapter);
      } else {
        setSelectedBookId('prostye-blagodeyaniya');
        setPortalSection('library');
        setScreen('portal');
      }
    },
    [handleOpenChapter]
  );

  // Открытие/закрытие сноски
  const handleChangeActiveFnId = useCallback(
    (action: number | null | ((prev: number | null) => number | null)) => {
      setActiveFnId((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        if (prev === null && next !== null) {
          pushHistoryTag(`fn-${next}`);
        }
        return next;
      });
    },
    []
  );

  // Открытие/закрытие настроек
  const handleChangeSettingsOpen = useCallback((open: boolean) => {
    setSettingsOpen((prev) => {
      if (!prev && open) {
        pushHistoryTag('settings');
      }
      return open;
    });
  }, []);

  // Запуск теста с сохранением quizOrigin ('library' | 'reader')
  const handleStartQuiz = useCallback(
    (chapter: ChapterData, origin: QuizOrigin) => {
      const found = findBookEntryByChapterId(chapter.id);
      setActiveChapter(chapter);
      setQuizOrigin(origin);
      setActiveFnId(null);
      setSettingsOpen(false);
      setSelectedBookId(found ? found.catalogId : 'prostye-blagodeyaniya');
      setScreen('quiz');
      pushHistoryTag(`quiz-${chapter.id}`);
    },
    []
  );

  // Приоритетная многоуровневая обработка возврата («Назад» / popstate / Escape)
  const handlePriorityBack = useCallback((): boolean => {
    // 1) Если открыта сноска (activeFnId !== null) -> закрыть сноску
    if (activeFnId !== null) {
      setActiveFnId(null);
      return true;
    }

    // 2) Иначе если открыта шторка настроек (settingsOpen === true) -> закрыть настройки
    if (settingsOpen) {
      setSettingsOpen(false);
      return true;
    }

    // 3) Иначе если открыт экран теста (screen === 'quiz') -> вернуть на экран quizOrigin ('reader' или 'portal')
    if (screen === 'quiz') {
      setScreen(quizOrigin === 'reader' ? 'reader' : 'portal');
      return true;
    }

    // 4) Иначе если открыт экран чтения (screen === 'reader') -> вернуться в оглавление (screen = 'portal', portalSection = 'library')
    if (screen === 'reader') {
      setScreen('portal');
      setPortalSection('library');
      return true;
    }

    // 5) Иначе если открыто оглавление книги (selectedBookId !== null) -> вернуться в каталог
    if (selectedBookId !== null) {
      setSelectedBookId(null);
      return true;
    }

    // 6) Иначе если в каталоге активен поисковый запрос (searchQuery !== '') -> очистить строку поиска
    if (searchQuery !== '') {
      setSearchQuery('');
      searchPushedRef.current = false;
      return true;
    }

    // 7) Иначе если открыт один из подразделов портала (library, dua, adhkar, tasbih) -> вернуться на Главную ('home')
    if (portalSection !== 'home') {
      setPortalSection('home');
      return true;
    }

    return false;
  }, [
    activeFnId,
    settingsOpen,
    screen,
    quizOrigin,
    selectedBookId,
    searchQuery,
    portalSection,
  ]);

  // Слушатели popstate и клавиши Escape
  useEffect(() => {
    const onPopState = () => {
      handlePriorityBack();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const handled = handlePriorityBack();
        if (handled) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handlePriorityBack]);

  if (screen === 'portal' || !activeChapter) {
    if (portalSection === 'home') {
      return (
        <HomeScreen
          progress={progress}
          onSelectSection={handleSelectPortalSection}
          onOpenBookToc={(bookId) => handleSelectBook(bookId)}
          onOpenChapter={handleOpenChapter}
          onOpenEasyDeedsChapterNumber={handleOpenEasyDeedsChapterNumber}
        />
      );
    }

    if (portalSection === 'dua') {
      return (
        <DuaScreen
          onSelectSection={handleSelectPortalSection}
          onOpenBookChapter={handleOpenEasyDeedsChapterNumber}
        />
      );
    }

    if (portalSection === 'adhkar') {
      return (
        <AdhkarScreen
          onSelectSection={handleSelectPortalSection}
          onOpenBookChapter={handleOpenEasyDeedsChapterNumber}
        />
      );
    }

    if (portalSection === 'tasbih') {
      return (
        <TasbihScreen
          onSelectSection={handleSelectPortalSection}
          onOpenBookChapter={handleOpenEasyDeedsChapterNumber}
        />
      );
    }

    return (
      <LibraryScreen
        book={activeBook}
        progress={progress}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        onOpenChapter={handleOpenChapter}
        onStartQuiz={handleStartQuiz}
        selectedBookId={selectedBookId}
        onSelectBook={handleSelectBook}
        onSelectPortalSection={handleSelectPortalSection}
      />
    );
  }

  const currentIndex = activeBook.chapters.findIndex(
    (ch) => ch.id === activeChapter.id
  );
  const previousChapter =
    currentIndex > 0 ? activeBook.chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex + 1 < activeBook.chapters.length
      ? activeBook.chapters[currentIndex + 1]
      : null;

  const siblingSubchapters = activeChapter.parentChapterTitle
    ? activeBook.chapters.filter(
        (ch) => ch.parentChapterTitle === activeChapter.parentChapterTitle
      )
    : [];

  const chapterProg = getChapterProgress(activeChapter.id);

  if (screen === 'reader') {
    return (
      <ReaderScreen
        chapter={activeChapter}
        previousChapter={previousChapter}
        nextChapter={nextChapter}
        siblingSubchapters={siblingSubchapters}
        onSelectSubchapter={(subCh) => {
          handleOpenChapter(subCh);
        }}
        initialOffset={chapterProg.offset}
        theme={theme}
        fontSize={fontSize}
        arabicScale={arabicScale}
        activeFnId={activeFnId}
        onChangeActiveFnId={handleChangeActiveFnId}
        settingsOpen={settingsOpen}
        onChangeSettingsOpen={handleChangeSettingsOpen}
        onChangeTheme={setTheme}
        onChangeFontSize={setFontSize}
        onChangeArabicScale={setArabicScale}
        onUpdateOffset={updateChapterOffset}
        onRecordQuizResult={recordQuizResult}
        onBackToLibrary={() => {
          setActiveFnId(null);
          setSettingsOpen(false);
          setScreen('portal');
          setPortalSection('library');
        }}
        onStartQuiz={handleStartQuiz}
        onOpenPreviousChapter={(prevCh) => {
          updateChapterOffset(prevCh.id, 0);
          handleOpenChapter(prevCh);
        }}
        onOpenNextChapter={(nextCh) => {
          updateChapterOffset(nextCh.id, 0);
          handleOpenChapter(nextCh);
        }}
      />
    );
  }

  return (
    <QuizScreen
      book={activeBook}
      chapter={activeChapter}
      nextChapter={nextChapter}
      arabicScale={arabicScale}
      onRecordQuizResult={recordQuizResult}
      onBackToChapter={(resetToFirstPage = false) => {
        if (resetToFirstPage) {
          updateChapterOffset(activeChapter.id, 0);
        }
        setScreen('reader');
      }}
      onBackToLibrary={() => {
        setScreen('portal');
        setPortalSection('library');
      }}
      onOpenNextChapter={(nextCh) => {
        updateChapterOffset(nextCh.id, 0);
        handleOpenChapter(nextCh);
      }}
    />
  );
}
