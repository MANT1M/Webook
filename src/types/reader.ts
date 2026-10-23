export type ThemeMode = 'LIGHT' | 'SEPIA' | 'NIGHT';

export type ChapterStatus = 'AVAILABLE' | 'PASSED';

export interface ChapterFootnote {
  id: number; // номера сносок от 1 до 135
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string; // обязательное пояснение, которое показывается после проверки ответа
}

export interface ChapterData {
  id: number; // 501..581
  bookId: number; // 5
  chapterOrder: number; // 1..81
  title: string;
  content: string;
  footnotes?: ChapterFootnote[];
  quiz: QuizQuestion[];
}

export interface BookData {
  id: number; // 5
  title: string; // 'Простые благодеяния'
  author: string; // 'Шейх Мухаммад Салих аль-Мунаджид'
  year: string; // '1440 г.х.'
  genre: string;
  description: string;
  coverPalette: {
    bg: string;
    accent: string;
    text: string;
  };
  chapters: ChapterData[];
}

export interface ChapterProgress {
  status: ChapterStatus; // 'AVAILABLE' | 'PASSED'
  offset: number; // символьный индекс начала текущей страницы чтения
  bestScore: number; // 0..100
}

export interface ReaderPersistedState {
  theme: ThemeMode;
  fontSize: number;
  arabicScale: number;
  progress: Record<number, ChapterProgress>;
}
