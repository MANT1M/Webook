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
    annotation: 'Практическое руководство исламского ученого по совершению благих дел в повседневной жизни.',
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
];
