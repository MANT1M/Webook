import React from 'react';
import { X, BookOpen, Bookmark, Check, Calendar, Layers, Share2 } from 'lucide-react';
import { CatalogBook } from '../data/catalogBooks';
import { BookCoverRenderer } from './BookCoverRenderer';
import { ChapterData } from '../types/reader';

interface BookDetailsModalProps {
  book: CatalogBook | null;
  isOpen: boolean;
  onClose: () => void;
  onRead: (book: CatalogBook) => void;
  isBookmarked: boolean;
  onToggleBookmark: (bookId: string) => void;
  chapters?: ChapterData[];
  onOpenChapter?: (chapter: ChapterData) => void;
}

export const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  book,
  isOpen,
  onClose,
  onRead,
  isBookmarked,
  onToggleBookmark,
  chapters,
  onOpenChapter,
}) => {
  if (!isOpen || !book) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="bg-[#06392c] text-amber-100 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-300" />
            <span className="font-serif font-bold text-base sm:text-lg text-white">
              {book.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Book Cover */}
            <div className="w-36 sm:w-44 shrink-0 mx-auto sm:mx-0 shadow-md rounded-lg overflow-hidden">
              <BookCoverRenderer
                coverType={book.coverType}
                title={book.title}
                author={book.author}
                coverImageUrl={book.coverImageUrl}
              />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div>
                <span className="inline-block text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-emerald-100 text-[#06392c] mb-1.5">
                  {book.category}
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                  {book.title}
                </h3>
                <p className="text-sm text-slate-600 font-medium mt-1">
                  {book.author}
                </p>
              </div>

              {/* Meta pills */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
                {book.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {book.year}
                  </span>
                )}
                {book.pages && (
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    {book.pages} страниц
                  </span>
                )}
                {book.isInteractiveReader && (
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                    40 глав · Сноски · Тесты
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onRead(book);
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-5 bg-[#06392c] hover:opacity-95 text-amber-100 font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-amber-300" />
                  <span>{book.isInteractiveReader ? 'Читать интерактивно' : 'Начать чтение'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleBookmark(book.id)}
                  title={isBookmarked ? 'В закладках' : 'Добавить в закладки'}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    isBookmarked
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark
                    className={`w-5 h-5 ${isBookmarked ? 'fill-[#06392c] text-[#06392c]' : ''}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Synopsis */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-serif font-bold text-base text-slate-900">
              Об издании
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              {book.fullSynopsis}
            </p>
          </div>

          {/* Chapters table if interactive reader */}
          {book.isInteractiveReader && chapters && chapters.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-base text-slate-900">
                  Содержание книги ({chapters.length} глав)
                </h4>
                <span className="text-xs text-emerald-800 font-semibold">
                  Интерактивный формат
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {chapters.map((ch, idx) => (
                  <div
                    key={ch.id}
                    onClick={() => {
                      if (onOpenChapter) {
                        onOpenChapter(ch);
                        onClose();
                      }
                    }}
                    className="pt-1.5 pb-1.5 px-2 hover:bg-white rounded-lg cursor-pointer transition flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="font-mono text-slate-400 font-semibold w-5 shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="font-medium text-slate-800 truncate">
                        {ch.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0 font-medium">
                      Читать
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
