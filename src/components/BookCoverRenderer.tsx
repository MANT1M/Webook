import React, { useState } from 'react';
import { CatalogBook } from '../data/catalogBooks';

interface BookCoverRendererProps {
  coverType: CatalogBook['coverType'];
  title: string;
  author: string;
  coverImageUrl?: string;
}

export const BookCoverRenderer: React.FC<BookCoverRendererProps> = ({
  coverType,
  title,
  author,
  coverImageUrl,
}) => {
  const [hasError, setHasError] = useState(false);

  // Если передана ссылка на картинку обложки и нет ошибки загрузки
  if (coverImageUrl && !hasError) {
    const isPageSheetCover = coverImageUrl.includes('abu_hanifa_cover');

    return (
      <div className="w-full relative aspect-[403/493] rounded-lg overflow-hidden shadow-xs hover:shadow-md select-none border border-slate-200/80 bg-[#f4f5f6] flex items-center justify-center transition-all duration-300">
        {isPageSheetCover ? (
          <div className="w-[74%] h-[88%] bg-white rounded-r-[3px] rounded-l-[2px] shadow-[0_8px_18px_rgba(0,0,0,0.13),0_2px_5px_rgba(0,0,0,0.08)] relative overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]">
            {/* Реалистичный корешок книги слева */}
            <div
              className="absolute inset-y-0 left-0 w-3.5 pointer-events-none z-10"
              style={{
                background:
                  'linear-gradient(to right, rgba(0,0,0,0.12) 0%, rgba(255,255,255,0.6) 28%, rgba(0,0,0,0.08) 58%, rgba(0,0,0,0) 100%)',
              }}
            />
            <img
              src={coverImageUrl}
              alt={`${title} — ${author}`}
              className="w-full h-full object-contain pl-1"
              onError={() => setHasError(true)}
              loading="lazy"
            />
          </div>
        ) : (
          <img
            src={coverImageUrl}
            alt={`${title} — ${author}`}
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            onError={() => setHasError(true)}
            loading="lazy"
          />
        )}
      </div>
    );
  }

  // Пропорция 2:3 (вертикальная книжная обложка)
  return (
    <div className="w-full relative aspect-[1/1.42] rounded-lg overflow-hidden shadow-sm select-none border border-black/10">
      {(coverType === 'green-gold' || coverType === 'image') && (
        <div className="w-full h-full bg-[#06372c] relative flex flex-col justify-between p-3.5 text-center text-[#fef3c7]">
          {/* Внешняя золотая рамка */}
          <div className="absolute inset-2 border border-[#d4af37]/60 rounded-sm pointer-events-none" />
          <div className="absolute inset-3 border border-[#d4af37]/40 rounded-sm pointer-events-none" />

          {/* Верхняя часть: Автор */}
          <div className="pt-2.5 z-10">
            <div className="w-12 h-0.5 bg-[#d4af37] mx-auto mb-1.5 opacity-70" />
            <div className="text-[11px] sm:text-xs font-medium tracking-wide text-[#fde68a] leading-tight">
              Муфтий Мухаммад
              <br />
              Таки Усмани
            </div>
          </div>

          {/* Центральная часть: Арка и Название */}
          <div className="my-auto z-10 px-1 py-2 relative">
            {/* Декоративная арка */}
            <div className="absolute inset-0 border border-[#d4af37]/35 rounded-t-full pointer-events-none" />
            <h4 className="font-serif text-[16px] sm:text-[18px] font-bold text-[#fffbeb] leading-tight drop-shadow-sm pt-2">
              Простые
              <br />
              благодеяния
            </h4>
            <div className="mt-2 text-[9px] text-[#fde68a]/70 tracking-widest uppercase">
              • • •
            </div>
            <div className="text-[8px] sm:text-[9px] text-[#d4af37]/90 mt-1 italic font-serif">
              Практическое руководство
            </div>
          </div>

          {/* Нижняя часть: Орнамент */}
          <div className="pb-1.5 z-10 flex flex-col items-center">
            <svg
              className="w-7 h-7 text-[#d4af37]/80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <polygon points="12 2 15 8 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 8 12 2" />
            </svg>
            <div className="text-[7px] tracking-wider text-[#fde68a]/60 uppercase mt-0.5 font-mono">
              ДАРУЛЬ-УЛУМ
            </div>
          </div>
        </div>
      )}

      {coverType === 'parchment-mosque' && (
        <div className="w-full h-full bg-[#52341d] relative flex flex-col justify-between p-2.5 text-center text-[#2b1706]">
          {/* Внешний орнаментальный фон */}
          <div className="absolute inset-1.5 bg-[#f5e6cc] rounded border-2 border-[#8b5a2b] flex flex-col justify-between p-2 shadow-inner">
            <div className="border border-[#b8860b]/40 h-full w-full rounded flex flex-col justify-between p-2">
              {/* Автор */}
              <div className="pt-1">
                <div className="text-[9px] font-bold tracking-widest text-[#6d4c26] uppercase">
                  ИБН КАСИР
                </div>
              </div>

              {/* Название */}
              <div className="my-auto">
                <div className="w-8 h-0.5 bg-[#8b5a2b] mx-auto mb-1.5" />
                <h4 className="font-serif text-[14px] sm:text-[16px] font-extrabold text-[#3a1d08] tracking-tight uppercase leading-tight">
                  ИСТОРИИ
                  <br />
                  О ПРОРОКАХ
                </h4>
                <div className="w-8 h-0.5 bg-[#8b5a2b] mx-auto mt-1.5" />
              </div>

              {/* Силуэт мечети внизу */}
              <div className="w-full h-12 relative flex items-end justify-center overflow-hidden">
                <svg
                  className="w-full h-12 text-[#2c1404]"
                  viewBox="0 0 100 45"
                  fill="currentColor"
                >
                  <path d="M0,45 L100,45 L100,32 L88,32 L88,10 L84,5 L84,32 L68,32 C68,22 62,18 50,18 C38,18 32,22 32,32 L16,32 L16,5 L12,10 L12,32 L0,32 Z" />
                  <circle cx="50" cy="14" r="3" />
                  <path d="M47,7 L53,7 L50,2 Z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {coverType === 'slate-arch' && (
        <div className="w-full h-full bg-[#2a383d] relative flex flex-col justify-between p-3 text-center text-[#e2e8f0]">
          {/* Исламская заостренная арка */}
          <div className="absolute inset-2 border border-[#4ade80]/30 rounded-t-[40px] pointer-events-none" />
          <div className="absolute inset-3 border border-[#cbd5e1]/20 rounded-t-[34px] pointer-events-none" />

          {/* Автор */}
          <div className="pt-2 z-10">
            <span className="text-[9px] text-slate-300 font-medium">
              Абу Хамид аль-Газали
            </span>
          </div>

          {/* Название */}
          <div className="my-auto z-10 px-1">
            <h4 className="font-serif text-[15px] sm:text-[16px] font-bold text-white leading-tight">
              Путь
              <br />к искренности
            </h4>
            <div className="text-[8px] text-emerald-300/80 mt-1.5">
              Ихляс и чистота деяний
            </div>
          </div>

          {/* Силуэт мечети в сумерках */}
          <div className="w-full h-10 relative flex items-end justify-center overflow-hidden z-10 opacity-70">
            <svg
              className="w-full h-10 text-[#0f172a]"
              viewBox="0 0 100 40"
              fill="currentColor"
            >
              <path d="M0,40 L100,40 L100,28 L90,28 L90,14 L87,9 L87,28 L70,28 C70,18 64,15 50,15 C36,15 30,18 30,28 L13,28 L13,9 L10,14 L10,28 L0,28 Z" />
            </svg>
          </div>
        </div>
      )}

      {coverType === 'cream-split' && (
        <div className="w-full h-full bg-[#fdfaf4] relative flex">
          {/* Левая полоса-корешок с восточным орнаментом */}
          <div className="w-[28%] h-full bg-[#4a2e18] flex flex-col items-center justify-between py-3 border-r border-[#8b5a2b]">
            <div className="w-2.5 h-2.5 rotate-45 border border-[#d4af37]" />
            <div className="space-y-2 opacity-60">
              <div className="w-2 h-2 rotate-45 bg-[#d4af37]" />
              <div className="w-2 h-2 rotate-45 bg-[#d4af37]" />
              <div className="w-2 h-2 rotate-45 bg-[#d4af37]" />
            </div>
            <div className="w-2.5 h-2.5 rotate-45 border border-[#d4af37]" />
          </div>

          {/* Правая светлая часть с названием */}
          <div className="flex-1 h-full flex flex-col justify-between p-3 text-center">
            <div className="text-[9px] text-[#6d4c26] font-medium pt-1">
              Абу Хамид аль-Газали
            </div>

            <div className="my-auto">
              {/* Медальон */}
              <div className="w-8 h-8 rounded-full border border-[#b8860b]/60 mx-auto mb-2 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-[#f5e6cc] border border-[#b8860b]/40 flex items-center justify-center text-[#8b5a2b] text-[8px] font-bold">
                  ۞
                </div>
              </div>
              <h4 className="font-serif text-[14px] sm:text-[16px] font-extrabold text-[#3a1d08] tracking-wider leading-tight">
                ОСНОВЫ
                <br />
                ВЕРЫ
              </h4>
              <div className="text-[8px] text-[#78350f] mt-1 font-serif">
                Каваид аль-акаид
              </div>
            </div>

            <div className="pb-1 text-[7px] text-[#8b5a2b] uppercase tracking-wider font-mono">
              МЕДИНА
            </div>
          </div>
        </div>
      )}

      {coverType === 'emerald-dome' && (
        <div className="w-full h-full bg-[#063026] relative flex flex-col justify-between p-3 text-center text-[#fef3c7]">
          {/* Тонкие рамки */}
          <div className="absolute inset-2 border border-[#d4af37]/35 rounded pointer-events-none" />

          <div className="pt-2 z-10">
            <span className="text-[9px] text-[#fde68a] font-medium">
              Абу Хамид аль-Газали
            </span>
          </div>

          <div className="my-auto z-10">
            <h4 className="font-serif text-[15px] sm:text-[17px] font-bold text-white tracking-wide uppercase leading-tight">
              ОСНОВЫ
              <br />
              ВЕРЫ
            </h4>
            <div className="w-10 h-0.5 bg-[#d4af37] mx-auto mt-2 opacity-80" />
            <div className="text-[8px] text-[#fde68a]/70 mt-1">
              Духовное воспитание
            </div>
          </div>

          {/* Золотой силуэт куполов */}
          <div className="w-full h-11 relative flex items-end justify-center overflow-hidden z-10">
            <svg
              className="w-full h-11 text-[#d4af37]/80"
              viewBox="0 0 100 45"
              fill="currentColor"
            >
              <path d="M0,45 L100,45 L100,32 L90,32 L90,8 L86,4 L86,32 L68,32 C68,20 62,16 50,16 C38,16 32,20 32,32 L14,32 L14,4 L10,8 L10,32 L0,32 Z" />
              <circle cx="50" cy="12" r="3" />
            </svg>
          </div>
        </div>
      )}

      {coverType === 'sage-arch' && (
        <div className="w-full h-full bg-[#274944] relative flex flex-col justify-between p-3 text-center text-[#e6f4f1]">
          <div className="absolute inset-2 border-2 border-[#85b5aa]/40 rounded-t-[30px] pointer-events-none" />

          <div className="pt-2 z-10">
            <div className="text-[9px] text-[#a7d3c9] font-medium">
              Муфтий Мухаммад
              <br />
              Таки Усмани
            </div>
          </div>

          <div className="my-auto z-10">
            <h4 className="font-serif text-[15px] sm:text-[17px] font-bold text-white tracking-wider uppercase leading-tight">
              КИЛЕЙН
              <br />
              ВЫРЫ
            </h4>
            <div className="text-[8px] text-[#a7d3c9]/80 mt-1.5 font-serif italic">
              Очищение сердца
            </div>
          </div>

          <div className="pb-1 z-10 text-[8px] text-[#85b5aa] uppercase tracking-widest font-mono">
            КНИГА СОВЕТОВ
          </div>
        </div>
      )}

      {coverType === 'white-gold-swirl' && (
        <div className="w-full h-full bg-[#ffffff] relative flex flex-col justify-between p-3 text-center text-[#1e293b]">
          <div className="absolute inset-2 border border-[#e2e8f0] rounded pointer-events-none" />

          {/* Золотой восточный витиеватый узор вверху */}
          <div className="pt-2 z-10 flex flex-col items-center">
            <svg
              className="w-16 h-12 text-[#c59b27]"
              viewBox="0 0 100 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M10,50 C20,20 40,10 50,30 C60,10 80,20 90,50" />
              <circle cx="50" cy="20" r="4" fill="#c59b27" />
              <path d="M25,50 C35,35 45,30 50,40 C55,30 65,35 75,50" />
            </svg>
            <div className="text-[8px] text-slate-500 font-medium -mt-1">
              Абу Хамид аль-Газали
            </div>
          </div>

          <div className="my-auto z-10">
            <h4 className="font-serif text-[14px] sm:text-[16px] font-extrabold text-slate-900 tracking-tight uppercase leading-tight">
              ИСТОРИИ
              <br />
              О ПРОРОКАХ
            </h4>
            <div className="w-6 h-0.5 bg-[#c59b27] mx-auto mt-2" />
          </div>

          <div className="pb-1 z-10 text-[8px] text-[#c59b27] tracking-widest uppercase font-mono">
            БЕЛЫЙ ВЫПУСК
          </div>
        </div>
      )}

      {coverType === 'sapphire-gold' && (
        <div className="w-full h-full bg-[#142338] relative flex flex-col justify-between p-3 text-center text-[#fef3c7]">
          {/* Золотая декоративная окантовка */}
          <div className="absolute inset-2 border-2 border-[#d4af37]/60 rounded pointer-events-none" />
          <div className="absolute inset-3 border border-[#d4af37]/30 rounded pointer-events-none" />

          <div className="pt-2 z-10">
            <div className="text-[9px] text-[#fde68a] font-medium">
              Абу Хамид аль-Газали
            </div>
          </div>

          <div className="my-auto z-10">
            <h4 className="font-serif text-[15px] sm:text-[17px] font-bold text-white tracking-widest uppercase leading-tight">
              ОСНОВЫ
              <br />
              ВЕРЫ
            </h4>
            <div className="text-[8px] text-[#fde68a]/70 mt-1">
              Сапфировое издание
            </div>
          </div>

          <div className="pb-1 z-10 flex justify-center">
            <div className="w-3 h-3 rotate-45 border border-[#d4af37]" />
          </div>
        </div>
      )}

      {coverType === 'purple-arch' && (
        <div className="w-full h-full bg-[#3d2042] relative flex flex-col justify-between p-2.5 text-center text-[#f5e8f7]">
          {/* Золотая арка и белая плашка */}
          <div className="absolute inset-2 border border-[#d4af37]/50 rounded-t-[36px] pointer-events-none" />

          <div className="pt-2 z-10">
            <div className="text-[9px] text-fuchsia-200/90 font-medium">
              Абу Хамид аль-Газали
            </div>
          </div>

          <div className="my-auto z-10">
            {/* Белая плашка как на скриншоте */}
            <div className="bg-white text-slate-900 rounded py-2 px-1 shadow-sm border border-[#d4af37]/40">
              <div className="text-[8px] text-amber-700 font-bold uppercase tracking-wider">
                ИЛЗНОРИ
              </div>
              <h4 className="font-serif text-[15px] sm:text-[17px] font-black tracking-tight leading-tight uppercase">
                ВЕРЫ
              </h4>
            </div>
          </div>

          <div className="pb-1 z-10 text-[7px] text-[#d4af37] uppercase tracking-wider font-mono">
            ВОЗРОЖДЕНИЕ
          </div>
        </div>
      )}

      {coverType === 'leather-green-gold' && (
        <div className="w-full h-full bg-[#0a3827] relative flex flex-col justify-between p-3 text-center text-[#fef3c7]">
          {/* Кожаное золотое тиснение */}
          <div className="absolute inset-2 border-2 border-[#d4af37]/70 rounded pointer-events-none" />
          <div className="absolute inset-3 border border-[#d4af37]/40 rounded pointer-events-none" />

          <div className="pt-2 z-10">
            <div className="text-[9px] text-[#fde68a] font-medium uppercase tracking-wider">
              ИБН КАСИР
            </div>
          </div>

          <div className="my-auto z-10">
            <div className="border border-[#d4af37]/50 rounded p-1.5 bg-[#06261a]">
              <h4 className="font-serif text-[14px] sm:text-[16px] font-extrabold text-[#fffbeb] uppercase leading-tight tracking-tight">
                ИСТОРИИ
                <br />
                О ПРОРОКАХ
              </h4>
            </div>
            <div className="text-[8px] text-[#fde68a]/70 mt-1 font-serif">
              Золотое тиснение
            </div>
          </div>

          <div className="pb-1 z-10 text-[7px] text-[#d4af37]/90 tracking-widest font-mono">
            ПОЛНЫЙ ТОМ
          </div>
        </div>
      )}
    </div>
  );
};
