import React, { useState } from 'react';
import { X, Lock, Mail, User, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string | null;
  onLogin: (userName: string) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || email.split('@')[0] || 'Читатель';
    onLogin(finalName);
    setSuccessMsg(isRegister ? 'Регистрация успешна!' : 'Вход выполнен!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 700);
  };

  const handleQuickDemo = () => {
    onLogin('Тимур');
    setSuccessMsg('Вход выполнен как Тимур');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#06392c] text-amber-100 p-5 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-white">
              {currentUser
                ? 'Личный кабинет читателя'
                : isRegister
                ? 'Регистрация читателя'
                : 'Войти в библиотеку'}
            </h3>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              Библиотека благодеяний
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {currentUser ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#06392c] font-serif font-bold text-2xl flex items-center justify-center mx-auto shadow-inner">
                {currentUser[0]?.toUpperCase() ?? 'Ч'}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">{currentUser}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Активный читатель библиотеки
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-left text-xs text-emerald-900">
                <div className="font-semibold mb-1">Сохраненный прогресс:</div>
                <div>• Закладки синхронизированы</div>
                <div>• Результаты проверочных тестов сохраняются локально</div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm font-semibold transition cursor-pointer"
                >
                  Выйти из аккаунта
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#06392c] text-amber-100 hover:opacity-95 text-sm font-semibold transition cursor-pointer"
                >
                  Продолжить чтение
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ваше имя
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Тимур"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#06392c] focus:bg-white"
                      required={isRegister}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Электронная почта
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="reader@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#06392c] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#06392c] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#06392c] text-amber-100 font-semibold rounded-xl hover:opacity-95 text-sm transition shadow-sm cursor-pointer mt-2"
              >
                {isRegister ? 'Зарегистрироваться' : 'Войти'}
              </button>

              {/* Quick Guest / Demo */}
              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs transition cursor-pointer"
              >
                Войти в 1 клик как гость (Тимур)
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-xs text-emerald-800 hover:underline font-medium cursor-pointer"
                >
                  {isRegister
                    ? 'Уже есть аккаунт? Войти'
                    : 'Нет аккаунта? Зарегистрироваться'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
