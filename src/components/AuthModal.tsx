import React, { useState } from 'react';
import { X, Lock, Mail, User, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuthUser } from '../hooks/useAuthUser';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: string | null;
  onLogin?: (userName: string, userEmail?: string) => void;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onLogout,
}) => {
  const {
    userName,
    userEmail,
    isStatsAdmin,
    loginWithEmail,
    loginWithGoogle,
    logout,
  } = useAuthUser();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const normalizedEmail = email.trim().toLowerCase();
    const finalName = name.trim() || normalizedEmail.split('@')[0] || 'Читатель';

    loginWithEmail(finalName, normalizedEmail);
    if (onLogin) {
      onLogin(finalName, normalizedEmail);
    }

    setSuccessMsg(isRegister ? 'Регистрация успешна!' : 'Вход выполнен!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 700);
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (onLogin) {
        onLogin(result.name, result.email);
      }
      setSuccessMsg(`Вход выполнен: ${result.email}`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(
        err instanceof Error && err.message.includes('popup-closed-by-user')
          ? 'Окно входа через Google было закрыто.'
          : 'Не удалось войти через Google. Вы также можете войти по электронной почте ниже.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
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
              {userName
                ? 'Личный кабинет читателя'
                : isRegister
                  ? 'Регистрация читателя'
                  : 'Войти в библиотеку'}
            </h3>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              Благие дела
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {userName ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#06392c] font-serif font-bold text-2xl flex items-center justify-center mx-auto shadow-inner">
                {userName[0]?.toUpperCase() ?? 'Ч'}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">{userName}</h4>
                {userEmail && (
                  <p className="text-xs font-medium text-emerald-800 mt-0.5">
                    {userEmail}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-0.5">
                  Активный читатель библиотеки
                </p>
              </div>

              {isStatsAdmin && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left text-xs text-amber-950 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Доступ администратора активен</div>
                    <div className="text-amber-800 mt-0.5">
                      Панель статистики посещений и онлайн-читателей отображается для вашего аккаунта ({userEmail}).
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-left text-xs text-emerald-900">
                <div className="font-semibold mb-1">Сохраненный прогресс:</div>
                <div>• Закладки синхронизированы</div>
                <div>• Результаты проверочных тестов сохраняются локально</div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleLogoutClick}
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
            <div className="space-y-4">
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Вход через Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2.5 shadow-2xs disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>
                  {googleLoading ? 'Вход через Google...' : 'Войти через Google'}
                </span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider">
                  или по почте
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
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
                        placeholder="Ваше имя"
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

                <div className="text-center pt-1">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
