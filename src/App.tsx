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

type ScreenType = 'library' | 'reader' | 'quiz';

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
    window.history.pushState({ tag }, '', '#' + tag);
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

  const [screen, setScreen] = useState<ScreenType>('library');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<ChapterData | null>(() => {
    return (
      EASY_GOOD_DEEDS_BOOK.chapters.find((c) => c.chapterOrder === 1) ||
      EASY_GOOD_DEEDS_BOOK.chapters[0] ||
      null
    );
  });
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

  // Обработка начального URL-хэша (#settings, #toc, #reader-xxx, #quiz-xxx)
  useEffect(() => {
    try {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;

      if (hash === 'settings') {
        setSelectedBookId('prostye-blagodeyaniya');
        setScreen('reader');
        setSettingsOpen(true);
      } else if (hash === 'toc' || hash === 'contents') {
        setSelectedBookId('prostye-blagodeyaniya');
        setScreen('library');
      } else if (hash.startsWith('reader-')) {
        const chapterId = Number(hash.replace('reader-', ''));
        const found = findBookEntryByChapterId(chapterId);
        if (found) {
          setActiveChapter(found.chapter);
          setSelectedBookId(found.catalogId);
          setScreen('reader');
        }
      } else if (hash.startsWith('quiz-')) {
        const chapterId = Number(hash.replace('quiz-', ''));
        const found = findBookEntryByChapterId(chapterId);
        if (found) {
          setActiveChapter(found.chapter);
          setSelectedBookId(found.catalogId);
          setScreen('quiz');
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  // Обработчик выбора книги (переход в оглавление или возврат в каталог)
  const handleSelectBook = useCallback((bookId: string | null) => {
    setSelectedBookId(bookId);
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

    // 3) Иначе если открыт экран теста (screen === 'quiz') -> вернуть на экран quizOrigin ('reader' или 'library')
    if (screen === 'quiz') {
      setScreen(quizOrigin);
      return true;
    }

    // 4) Иначе если открыт экран чтения (screen === 'reader') -> вернуться в оглавление (screen = 'library')
    if (screen === 'reader') {
      setScreen('library');
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

    return false;
  }, [activeFnId, settingsOpen, screen, quizOrigin, selectedBookId, searchQuery]);

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

  if (screen === 'library' || !activeChapter) {
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
          setScreen('library');
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
      onBackToLibrary={() => setScreen('library')}
      onOpenNextChapter={(nextCh) => {
        updateChapterOffset(nextCh.id, 0);
        handleOpenChapter(nextCh);
      }}
    />
  );
}
