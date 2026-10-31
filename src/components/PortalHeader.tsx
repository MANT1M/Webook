import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Sun,
  Compass,
  Home,
  User,
  Download,
} from 'lucide-react';
import { useVisitCounter } from '../hooks/useVisitCounter';
import { VisitorCounterBadge } from './VisitorCounterBadge';
import { AuthModal } from './AuthModal';
import { AmveraFilesModal } from './AmveraFilesModal';

export type PortalSection = 'home' | 'library' | 'dua' | 'adhkar' | 'tasbih';

export interface PortalHeaderProps {
  activeSection: PortalSection;
  onSelectSection: (section: PortalSection) => void;
}

const NAV_ITEMS: {
  id: PortalSection;
  label: string;
  num?: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'library', label: 'Библиотека', num: '1', icon: BookOpen },
  { id: 'dua', label: 'Дуа', num: '2', icon: Sparkles },
  { id: 'adhkar', label: 'Азкары', num: '3', icon: Sun },
  { id: 'tasbih', label: 'Тасбих', num: '4', icon: Compass },
];

export const PortalHeader: React.FC<PortalHeaderProps> = ({
  activeSection,
  onSelectSection,
}) => {
  const visitStats = useVisitCounter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [amveraModalOpen, setAmveraModalOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    try {
      return localStorage.getItem('library_user') || null;
    } catch {
      return null;
    }
  });

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

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#06392c] text-white shadow-md border-b border-[#04271e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Верхний ряд: логотип, навигация разделов на десктопе, счетчик и кнопки */}
          <div className="py-3 flex items-center justify-between gap-3">
            {/* Логотип — переход на Главную страницу */}
            <button
              type="button"
              onClick={() => {
                onSelectSection('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 cursor-pointer group select-none min-w-0 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-300/15 border border-amber-300/30 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-[#fef3c7] transition-transform group-hover:scale-105" />
              </div>
              <div className="min-w-0">
                <span className="block font-serif font-bold text-base sm:text-lg text-[#fef3c7] tracking-tight truncate leading-tight">
                  Библиотека благодеяний
                </span>
                <span className="hidden sm:block text-[11px] text-emerald-200/80 tracking-wide">
                  Книги · Дуа · Азкары · Тасбих
                </span>
              </div>
            </button>

            {/* Центральная навигация по 5 разделам (Desktop) */}
            <nav
              aria-label="Основная навигация"
              className="hidden lg:flex items-center gap-1 bg-[#04271e]/70 p-1 rounded-xl border border-white/10"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#fef3c7] text-[#06392c] shadow-xs'
                        : 'text-emerald-100/90 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive ? 'text-[#06392c]' : 'text-amber-300/90'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Правая часть: счетчик визитов, Войти и Файлы */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <VisitorCounterBadge stats={visitStats} variant="header" />

              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="border border-[#fef3c7]/30 hover:border-[#fef3c7]/60 bg-transparent hover:bg-white/10 text-[#fef3c7] rounded-lg px-2.5 sm:px-3.5 py-1.5 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-amber-300" />
                <span className="truncate max-w-[100px] sm:max-w-[140px]">
                  {currentUser ? currentUser : 'Войти'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAmveraModalOpen(true)}
                title="Файлы и сборка приложения"
                className="border border-[#fef3c7]/30 hover:border-[#fef3c7]/60 bg-transparent hover:bg-white/10 text-[#fef3c7] rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Файлы</span>
              </button>
            </div>
          </div>

          {/* Нижний ряд навигации для мобильных и планшетов */}
          <nav
            aria-label="Мобильная навигация"
            className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-2.5 pt-0.5 border-t border-white/10"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectSection(item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#fef3c7] text-[#06392c] shadow-xs'
                      : 'bg-white/5 text-emerald-100/90 hover:bg-white/10'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? 'text-[#06392c]' : 'text-amber-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

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
    </>
  );
};
