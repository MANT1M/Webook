import { BookData } from '../types/reader';
import { EASY_GOOD_DEEDS_BOOK } from './easyGoodDeedsData';
import { ABU_HANIFA_WORKS_BOOK } from './abuHanifaWorksData';

export interface CatalogBook {
  id: string;
  title: string;
  author: string;
  annotation: string;
  coverType:
    | 'image'
    | 'green-gold'
    | 'parchment-mosque'
    | 'slate-arch'
    | 'cream-split'
    | 'emerald-dome'
    | 'sage-arch'
    | 'white-gold-swirl'
    | 'sapphire-gold'
    | 'purple-arch'
    | 'leather-green-gold';
  coverImageUrl?: string;
  actionText: 'Читать' | 'Подробнее';
  progressPercent?: number;
  isBookmarked?: boolean;
  year?: string;
  pages?: number;
  category: string;
  fullSynopsis: string;
  isInteractiveReader?: boolean;
}

export const CATALOG_BOOKS: CatalogBook[] = [
  {
    id: 'prostye-blagodeyaniya',
    title: 'Простые благодеяния',
    author: 'Муфтий Мухаммад Таки Усмани',
    annotation:
      'Практическое руководство исламского ученого по совершению благих дел в повседневной жизни.',
    coverType: 'image',
    coverImageUrl: '/assets/aistudio/____________8cd66871.png',
    actionText: 'Читать',
    isInteractiveReader: true,
    isBookmarked: false,
    year: '1440 г.х.',
    pages: 184,
    category: 'Практика',
    fullSynopsis:
      'Книга всемирно признанного исламского ученого и правоведа Муфтия Мухаммада Таки Усмани посвящена простым повседневным делам, зикрам и благим поступкам, которые не требуют больших усилий, но несут в себе колоссальную награду от Всевышнего Аллаха. В приложении доступно полное интерактивное чтение 40 глав, интерактивные сноски и проверочные тесты.',
  },
  {
    id: 'kanonicheskie-trudy-abu-hanify',
    title: 'Канонические труды Величайшего имама Абу Ханифы по вероучению',
    author: 'Фарид Салман',
    annotation:
      'Хрестоматия известных канонических текстов по вероучению Величайшего имама Абу Ханифы ан-Ну‘мана аль-Куфи и классических трудов матуридитской школы.',
    coverType: 'image',
    coverImageUrl: '/assets/aistudio/abu_hanifa_cover.png',
    actionText: 'Читать',
    isInteractiveReader: true,
    isBookmarked: false,
    year: 'Болгар-2020',
    pages: 228,
    category: 'Вероучение · Хрестоматия',
    fullSynopsis:
      'Хрестоматия, подготовленная в Болгарской исламской академии, включает в себя известные канонические тексты по вероучению, имеющие отношение к Величайшему имаму Абу Ханифе ан-Ну‘ману аль-Куфи (да пребудет с ним милость Аллаха!): «Величайшее знание» («аль-Фикх аль-Акбар»), «Учитель и ученик» («Аль-‘Алим ва аль-Мута‘аллим»), «Послание к ‘Усману аль-Батти», «Завещание своему ученику Абу Йусуфу аль-Кадый», «Завещание всей умме» («аль-Васыйя»), «Простейшее знание» («аль-Фикх аль-Абсат»), а также комментарий Абу аль-Мунтаха и «Совершенные основы» («аль-Усуль аль-Мунифа») имама Камаля ад-Дина Ахмада аль-Байады.',
  },
];

export const INTERACTIVE_BOOKS_MAP: Record<string, BookData> = {
  'prostye-blagodeyaniya': EASY_GOOD_DEEDS_BOOK,
  'kanonicheskie-trudy-abu-hanify': ABU_HANIFA_WORKS_BOOK,
};

