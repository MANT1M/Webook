import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Smartphone,
  Share,
  PlusSquare,
  Check,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Compass,
  Wifi,
  Battery,
  Download,
  Film,
} from 'lucide-react';

export interface IphoneVideoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VideoStep {
  id: number;
  title: string;
  shortLabel: string;
  subtitle: string;
  voiceText: string;
  startSec: number;
  endSec: number;
}

const VIDEO_STEPS: VideoStep[] = [
  {
    id: 0,
    title: '1. Откройте сайт в браузере Safari',
    shortLabel: '1. Safari',
    subtitle: 'Шаг 1 из 5 · Откройте «Библиотеку благодеяний» в стандартном браузере Safari на вашем iPhone',
    voiceText: 'Шаг первый. Откройте сайт Библиотека благодеяний в браузере Сафари на вашем Айфоне.',
    startSec: 0,
    endSec: 4,
  },
  {
    id: 1,
    title: '2. Нажмите иконку «Поделиться» внизу',
    shortLabel: '2. Поделиться',
    subtitle: 'Шаг 2 из 5 · На нижней панели Safari нажмите квадрат со стрелкой вверх («Поделиться»)',
    voiceText: 'Шаг второй. На нижней панели Сафари нажмите кнопку Поделиться — квадрат со стрелкой вверх.',
    startSec: 4,
    endSec: 8,
  },
  {
    id: 2,
    title: '3. Выберите «На экран „Домой“»',
    shortLabel: '3. На экран «Домой»',
    subtitle: 'Шаг 3 из 5 · Прокрутите открывшееся меню чуть ниже и нажмите «На экран „Домой“»',
    voiceText: 'Шаг третий. Прокрутите меню вниз и выберите пункт На экран Домой со значком плюс.',
    startSec: 8,
    endSec: 12,
  },
  {
    id: 3,
    title: '4. Нажмите «Добавить» в правом верхнем углу',
    shortLabel: '4. Добавить',
    subtitle: 'Шаг 4 из 5 · Проверьте название «Благодеяния» и нажмите синюю кнопку «Добавить» сверху справа',
    voiceText: 'Шаг четвертый. В правом верхнем углу нажмите кнопку Добавить.',
    startSec: 12,
    endSec: 16,
  },
  {
    id: 4,
    title: '5. Готово! Запускайте с экрана iPhone',
    shortLabel: '5. Готово',
    subtitle: 'Шаг 5 из 5 · Иконка появилась на экране «Домой»! Теперь портал открывается в один клик как приложение',
    voiceText: 'Готово! Теперь иконка Библиотеки благодеяний всегда под рукой на домашнем экране вашего Айфона.',
    startSec: 16,
    endSec: 20,
  },
];

const TOTAL_DURATION = 20; // seconds

function formatTime(sec: number): string {
  const clamped = Math.max(0, Math.min(TOTAL_DURATION, Math.floor(sec)));
  const s = clamped.toString().padStart(2, '0');
  return `0:${s}`;
}

export const IphoneVideoGuideModal: React.FC<IphoneVideoGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [mode, setMode] = useState<'mp4' | 'interactive'>('mp4');
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<1 | 0.75>(1);
  const lastSpokenStepRef = useRef<number>(-1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentStepIndex = Math.min(
    VIDEO_STEPS.length - 1,
    Math.floor(currentTime / 4)
  );
  const currentStep = VIDEO_STEPS[currentStepIndex];
  const stepProgress = Math.min(1, Math.max(0, (currentTime - currentStep.startSec) / 4));

  const speakStep = useCallback(
    (stepIdx: number) => {
      if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(VIDEO_STEPS[stepIdx].voiceText);
        utter.lang = 'ru-RU';
        utter.rate = 1.0;
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore speech synthesis errors on unsupported devices
      }
    },
    [voiceEnabled]
  );

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentTime(0);
      setIsPlaying(true);
      lastSpokenStepRef.current = -1;
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isOpen]);

  // Speak when step changes if voiceEnabled
  useEffect(() => {
    if (!isOpen || mode !== 'interactive') return;
    if (voiceEnabled && isPlaying && lastSpokenStepRef.current !== currentStepIndex) {
      lastSpokenStepRef.current = currentStepIndex;
      speakStep(currentStepIndex);
    }
  }, [currentStepIndex, voiceEnabled, isPlaying, isOpen, mode, speakStep]);

  // Animation loop for interactive timeline
  useEffect(() => {
    if (!isOpen || !isPlaying || mode !== 'interactive') return;

    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const deltaSec = ((now - lastTimestamp) / 1000) * playbackRate;
      lastTimestamp = now;

      setCurrentTime((prev) => {
        const next = prev + deltaSec;
        if (next >= TOTAL_DURATION) {
          lastSpokenStepRef.current = -1;
          return 0; // auto-loop video
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isOpen, isPlaying, playbackRate, mode]);

  if (!isOpen) return null;

  const handleSelectStep = (idx: number) => {
    setMode('interactive');
    const targetSec = VIDEO_STEPS[idx].startSec;
    lastSpokenStepRef.current = -1;
    setCurrentTime(targetSec);
    setIsPlaying(true);
    if (scrollContainerRef.current && window.innerWidth < 1024) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    } else if (next) {
      lastSpokenStepRef.current = currentStepIndex;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(VIDEO_STEPS[currentStepIndex].voiceText);
          utter.lang = 'ru-RU';
          window.speechSynthesis.speak(utter);
        } catch {
          // ignore
        }
      }
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    lastSpokenStepRef.current = -1;
    setCurrentTime(val);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="iphone-guide-title"
    >
      <div className="bg-[#faf9f6] border border-slate-200 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Верхняя шапка модального окна */}
        <div className="bg-[#06392c] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-[#04271e] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-300/15 border border-amber-300/30 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-[#fef3c7]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest bg-amber-300/20 text-[#fef3c7] px-2 py-0.5 rounded-md font-bold">
                  Видео-инструкция · MP4
                </span>
              </div>
              <h2
                id="iphone-guide-title"
                className="font-serif text-sm sm:text-lg font-bold text-[#fef3c7] truncate mt-0.5"
              >
                Как сохранить сайт на экран «Домой» iPhone
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/iphone-install-guide.mp4"
              download="Инструкция-iPhone-Библиотека-благодеяний.mp4"
              className="bg-[#fef3c7] hover:bg-amber-200 text-[#06392c] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              title="Скачать MP4 видео"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Скачать MP4</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Прокручиваемый контейнер (отделен от сетки, чтобы исключить наслоение блоков на мобильных) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3.5 sm:p-6"
        >
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
            {/* БЛОК 1: ВИДЕО-ПЛЕЕР (7 колонок на ПК, 100% ширина сверху на телефоне) */}
            <div className="w-full lg:col-span-7 shrink-0 flex flex-col bg-[#071f18] rounded-2xl border border-emerald-900/60 overflow-hidden shadow-xl">
              {/* Переключатель режимов */}
              <div className="bg-[#04271e] p-2 border-b border-white/10 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode('mp4')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === 'mp4'
                      ? 'bg-[#fef3c7] text-[#06392c] shadow-xs'
                      : 'text-emerald-100/80 hover:bg-white/10'
                  }`}
                >
                  <Film className="w-3.5 h-3.5 shrink-0" />
                  <span>Видеоролик (MP4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('interactive')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === 'interactive'
                      ? 'bg-[#fef3c7] text-[#06392c] shadow-xs'
                      : 'text-emerald-100/80 hover:bg-white/10'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 shrink-0" />
                  <span>Пошаговый плеер</span>
                </button>
              </div>

              {mode === 'mp4' ? (
                <div className="w-full flex flex-col items-center justify-center bg-[#041913] p-3 sm:p-4">
                  <div className="w-full max-w-[270px] sm:max-w-[300px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-[#04221a]">
                    <video
                      src="/iphone-install-guide.mp4"
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-contain block"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                    <a
                      href="/iphone-install-guide.mp4"
                      download="Инструкция-iPhone-Библиотека-благодеяний.mp4"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-300/15 hover:bg-amber-300/25 border border-amber-300/40 text-xs font-bold text-[#fef3c7] transition"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-300" />
                      <span>Скачать это видео (.mp4)</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col">
                  {/* Сцена видео (анимированный экран iPhone) */}
                  <div className="relative pt-4 pb-3 px-3 sm:px-6 flex flex-col items-center justify-center bg-radial from-[#0c4a3a] via-[#062d23] to-[#041913] select-none overflow-hidden">
                    {/* Индикатор шага и озвучки в углу видео */}
                    <div className="w-full flex items-center justify-between gap-2 mb-2.5 z-20">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 border border-white/15 text-[11px] font-semibold text-[#fef3c7]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Кадр {currentStepIndex + 1} / 5
                      </span>

                      <button
                        type="button"
                        onClick={handleToggleVoice}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                          voiceEnabled
                            ? 'bg-[#fef3c7] text-[#06392c] border-[#fef3c7]'
                            : 'bg-black/45 text-emerald-100 border-white/15 hover:bg-black/65'
                        }`}
                      >
                        {voiceEnabled ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-[#06392c]" />
                            <span>Озвучка вкл</span>
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-amber-300" />
                            <span>Включить звук</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* КОРПУС IPHONE */}
                    <div className="relative w-[248px] sm:w-[264px] h-[350px] sm:h-[368px] rounded-[36px] bg-[#141416] p-[8px] shadow-2xl border-[2.5px] border-slate-600/80 flex flex-col overflow-hidden shrink-0">
                      {/* Внутренний экран iPhone */}
                      <div className="relative flex-1 w-full rounded-[28px] bg-[#faf9f6] overflow-hidden flex flex-col justify-between text-slate-900">
                        {/* iOS Status Bar + Dynamic Island */}
                        <div className="pt-1.5 px-4 pb-1 flex items-center justify-between text-[10px] font-bold bg-[#06392c] text-white z-20 shrink-0">
                          <span>9:41</span>
                          <div className="w-16 h-3.5 bg-black rounded-full mx-auto" />
                          <div className="flex items-center gap-1">
                            <Wifi className="w-2.5 h-2.5" />
                            <Battery className="w-3 h-3" />
                          </div>
                        </div>

                        {/* СЦЕНА 1 и 2: Сайт открыт в Safari */}
                        {(currentStepIndex === 0 || currentStepIndex === 1) && (
                          <div className="flex-1 flex flex-col justify-between bg-[#faf9f6] overflow-hidden">
                            <div className="bg-[#06392c] text-white px-3 py-2 flex items-center justify-between border-b border-emerald-950">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-md bg-amber-300/20 border border-amber-300/40 flex items-center justify-center">
                                  <BookOpen className="w-3 h-3 text-[#fef3c7]" />
                                </div>
                                <span className="font-serif text-[11px] font-bold text-[#fef3c7]">
                                  Библиотека благодеяний
                                </span>
                              </div>
                            </div>

                            <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-center">
                              <div className="rounded-xl bg-[#06392c] p-2 text-white border border-emerald-900">
                                <div className="text-[8px] uppercase tracking-wider text-amber-300">
                                  Время намаза (Уфа)
                                </div>
                                <div className="grid grid-cols-6 gap-1 mt-1 bg-white rounded-lg p-1 text-center">
                                  {['6:45', '8:25', '13:30', '15:25', '17:38', '19:08'].map((t, i) => (
                                    <div
                                      key={t}
                                      className={`rounded py-0.5 text-[7px] font-bold ${
                                        i === 3
                                          ? 'bg-[#06392c] text-[#fef3c7]'
                                          : 'text-slate-800'
                                      }`}
                                    >
                                      {t}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-xl bg-[#06392c] p-2.5 text-center text-white">
                                <div className="font-serif text-xs font-bold text-[#fef3c7]">
                                  Библиотека благодеяний
                                </div>
                                <div className="text-[8px] text-emerald-100/80 mt-0.5">
                                  1. Тасбих · 2. Дуа · 3. Азкары · 4. Книги
                                </div>
                                <div className="grid grid-cols-2 gap-1 mt-2">
                                  <div className="bg-[#fef3c7] text-[#06392c] rounded-md py-1 text-[8px] font-bold flex items-center justify-center gap-1">
                                    <Compass className="w-2.5 h-2.5" /> 1. Тасбих
                                  </div>
                                  <div className="bg-white/15 text-[#fef3c7] rounded-md py-1 text-[8px] font-semibold flex items-center justify-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" /> 2. Дуа
                                  </div>
                                </div>
                              </div>

                              {currentStepIndex === 0 && (
                                <div className="bg-emerald-950/90 text-[#fef3c7] rounded-xl px-2.5 py-1.5 text-[10px] font-medium text-center border border-amber-300/30 shadow-md">
                                  Сайт открыт в браузере <b>Safari</b>
                                </div>
                              )}
                            </div>

                            <div className="bg-slate-100 border-t border-slate-300 px-2.5 pt-1.5 pb-2 space-y-1.5 relative">
                              <div className="bg-white rounded-lg py-1 px-2.5 text-center text-[9px] text-slate-700 font-medium border border-slate-200 shadow-2xs flex items-center justify-center gap-1">
                                <span className="text-emerald-700">🔒</span>
                                <span className="truncate">библиотека-благодеяний.рф</span>
                              </div>

                              <div className="flex items-center justify-around text-blue-600 pt-0.5 relative">
                                <ChevronLeft className="w-4 h-4 text-slate-400" />
                                <ChevronRight className="w-4 h-4 text-slate-400" />

                                <div className="relative flex flex-col items-center">
                                  {currentStepIndex === 1 && (
                                    <>
                                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-400 text-slate-950 font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-md animate-bounce z-30">
                                        Нажмите сюда ↓
                                      </div>
                                      <span className="absolute -inset-2 rounded-full bg-blue-500/30 animate-ping" />
                                      <span className="absolute -inset-1.5 rounded-full border-2 border-blue-600 bg-blue-500/15" />
                                    </>
                                  )}
                                  <div
                                    className={`p-1 rounded-lg transition ${
                                      currentStepIndex === 1
                                        ? 'bg-blue-600 text-white scale-110 shadow-md'
                                        : 'text-blue-600'
                                    }`}
                                  >
                                    <Share className="w-4 h-4" />
                                  </div>
                                </div>

                                <BookOpen className="w-4 h-4 text-slate-400" />
                                <div className="w-3.5 h-3.5 border border-slate-400 rounded-xs" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* СЦЕНА 3: Меню «Поделиться» и выбор «На экран Домой» */}
                        {currentStepIndex === 2 && (
                          <div className="flex-1 flex flex-col justify-end bg-black/45 relative overflow-hidden">
                            <div className="bg-[#f2f2f7] rounded-t-2xl p-2.5 space-y-2 shadow-2xl border-t border-white">
                              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80">
                                <div className="w-8 h-8 rounded-lg bg-[#06392c] flex items-center justify-center shrink-0">
                                  <BookOpen className="w-4 h-4 text-[#fef3c7]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[10px] font-bold text-slate-900 truncate">
                                    Библиотека благодеяний
                                  </div>
                                  <div className="text-[8px] text-slate-500">Safari · Веб-сайт</div>
                                </div>
                              </div>

                              <div className="bg-white rounded-xl divide-y divide-slate-100 overflow-hidden border border-slate-200/80">
                                <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] text-slate-600">
                                  <span>Скопировать</span>
                                  <span className="text-xs">📋</span>
                                </div>
                                <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] text-slate-600">
                                  <span>Добавить в закладки</span>
                                  <span className="text-xs">📖</span>
                                </div>

                                <div className="relative px-2.5 py-2 flex items-center justify-between bg-blue-50/90 border-y-2 border-blue-500">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                                    <span className="text-[10px] font-extrabold text-blue-700">
                                      На экран «Домой»
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="bg-amber-400 text-slate-950 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full">
                                      Нажмите
                                    </span>
                                    <PlusSquare className="w-4 h-4 text-blue-700 shrink-0" />
                                  </div>
                                </div>

                                <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] text-slate-500">
                                  <span>Найти на странице</span>
                                  <span className="text-xs">🔍</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* СЦЕНА 4: Подтверждение «Добавить» в правом верхнем углу */}
                        {currentStepIndex === 3 && (
                          <div className="flex-1 flex flex-col bg-[#f2f2f7] p-2.5 justify-between">
                            <div className="bg-white rounded-xl px-2.5 py-2 flex items-center justify-between border border-slate-200 shadow-2xs relative">
                              <span className="text-[10px] text-blue-600 font-medium">
                                Отменить
                              </span>
                              <span className="text-[10px] font-bold text-slate-900">
                                На экран «Домой»
                              </span>

                              <div className="relative">
                                <span className="absolute -inset-1.5 rounded-lg bg-blue-500/30 animate-ping" />
                                <span className="relative bg-blue-600 text-white font-extrabold text-[10px] px-2 py-1 rounded-lg shadow-sm inline-block">
                                  Добавить
                                </span>
                                <div className="absolute -bottom-7 right-0 whitespace-nowrap bg-amber-400 text-slate-950 font-extrabold text-[8px] px-2 py-0.5 rounded-full shadow-md animate-bounce z-30">
                                  Нажмите «Добавить» ↑
                                </div>
                              </div>
                            </div>

                            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex items-center gap-3 my-auto">
                              <div className="w-12 h-12 rounded-2xl bg-[#06392c] border-2 border-amber-300/60 flex flex-col items-center justify-center shadow-md shrink-0">
                                <BookOpen className="w-6 h-6 text-[#fef3c7]" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1">
                                  Библиотека благодеяний
                                </div>
                                <div className="text-[9px] text-slate-400 truncate">
                                  библиотека-благодеяний.рф
                                </div>
                              </div>
                            </div>

                            <div className="text-[9px] text-slate-500 text-center px-2 pb-1">
                              На домашнем экране вашего iPhone появится значок для быстрого входа в один клик.
                            </div>
                          </div>
                        )}

                        {/* СЦЕНА 5: Экран Домой iPhone с готовой иконкой */}
                        {currentStepIndex === 4 && (
                          <div className="flex-1 flex flex-col justify-between p-3 bg-linear-to-b from-[#0b3b2e] via-[#062920] to-[#041a14] text-white relative">
                            <div className="grid grid-cols-4 gap-2.5 pt-2">
                              <div className="flex flex-col items-center gap-1 opacity-55">
                                <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-base">
                                  📅
                                </div>
                                <span className="text-[8px]">Календарь</span>
                              </div>
                              <div className="flex flex-col items-center gap-1 opacity-55">
                                <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-base">
                                  🧭
                                </div>
                                <span className="text-[8px]">Safari</span>
                              </div>
                              <div className="flex flex-col items-center gap-1 opacity-55">
                                <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-base">
                                  ⚙️
                                </div>
                                <span className="text-[8px]">Настройки</span>
                              </div>

                              <div className="flex flex-col items-center gap-1 relative">
                                <span className="absolute -inset-1.5 rounded-2xl bg-amber-300/35 animate-ping" />
                                <div className="relative w-11 h-11 rounded-2xl bg-[#06392c] border-2 border-[#fef3c7] flex items-center justify-center shadow-lg scale-105">
                                  <BookOpen className="w-5 h-5 text-[#fef3c7]" />
                                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xs">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </span>
                                </div>
                                <span className="text-[8px] font-bold text-[#fef3c7] text-center leading-tight">
                                  Благодеяния
                                </span>
                              </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-xs border border-amber-300/40 rounded-2xl p-2.5 text-center space-y-1 my-auto">
                              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#fef3c7]">
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Успешно добавлено!</span>
                              </div>
                              <p className="text-[9px] text-emerald-100/90 leading-snug">
                                Теперь время намаза, тасбих, дуа и книги открываются с экрана «Домой» в 1 касание.
                              </p>
                            </div>

                            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-1.5 flex items-center justify-around">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/40 flex items-center justify-center text-xs">
                                📞
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-blue-500/40 flex items-center justify-center text-xs">
                                🧭
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-amber-400/30 border border-amber-300/50 flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-[#fef3c7]" />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="py-1 bg-transparent flex justify-center shrink-0">
                          <div className="w-20 h-1 rounded-full bg-slate-400/70" />
                        </div>
                      </div>
                    </div>

                    {/* Субтитры текущего кадра внизу экрана плеера */}
                    <div className="mt-3 w-full bg-black/55 backdrop-blur-xs border border-white/10 rounded-xl px-3 py-2 text-center">
                      <p className="text-xs sm:text-sm font-medium text-[#fef3c7] leading-snug">
                        {currentStep.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* ПАНЕЛЬ УПРАВЛЕНИЯ ИНТЕРАКТИВНЫМ ПЛЕЕРОМ */}
                  <div className="bg-[#04271e] px-3.5 sm:px-5 py-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-mono text-emerald-200/90 w-9 text-right shrink-0">
                        {formatTime(currentTime)}
                      </span>

                      <div className="relative flex-1 flex items-center">
                        <input
                          type="range"
                          min={0}
                          max={TOTAL_DURATION}
                          step={0.05}
                          value={currentTime}
                          onChange={handleScrub}
                          aria-label="Перемотка видео-инструкции"
                          className="w-full h-1.5 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-[#fef3c7]"
                        />
                      </div>

                      <span className="text-[11px] font-mono text-emerald-200/70 w-9 shrink-0">
                        0:20
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsPlaying((prev) => !prev)}
                          className="px-3 py-1.5 rounded-xl bg-[#fef3c7] hover:bg-amber-200 text-[#06392c] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>Пауза</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Смотреть</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            lastSpokenStepRef.current = -1;
                            setCurrentTime(0);
                            setIsPlaying(true);
                          }}
                          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 transition cursor-pointer"
                          title="Сначала"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleSelectStep(
                              (currentStepIndex - 1 + VIDEO_STEPS.length) % VIDEO_STEPS.length
                            )
                          }
                          className="px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 text-xs font-medium transition cursor-pointer"
                          title="Предыдущий шаг"
                        >
                          ← Шаг
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleSelectStep((currentStepIndex + 1) % VIDEO_STEPS.length)
                          }
                          className="px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 text-xs font-medium transition cursor-pointer"
                          title="Следующий шаг"
                        >
                          Шаг →
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPlaybackRate((prev) => (prev === 1 ? 0.75 : 1))
                        }
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-amber-200 transition cursor-pointer"
                      >
                        Скорость: {playbackRate === 1 ? 'Обычная (1x)' : 'Медленно (0.75x)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* БЛОК 2: 5 КЛИКАБЕЛЬНЫХ ШАГОВ ИНСТРУКЦИИ (5 колонок на ПК, отдельный блок снизу на телефоне) */}
            <div className="w-full lg:col-span-5 shrink-0 flex flex-col justify-between space-y-3 bg-[#faf9f6] rounded-2xl">
              <div>
                <div className="text-xs uppercase tracking-widest text-emerald-800 font-bold mb-1">
                  Пошаговый разбор
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Нажмите на любой шаг ниже для подробного просмотра или скачайте готовый MP4-ролик:
                </p>

                <div className="space-y-2">
                  {VIDEO_STEPS.map((step, idx) => {
                    const isActive = mode === 'interactive' && idx === currentStepIndex;
                    const isDone = mode === 'interactive' && idx < currentStepIndex;

                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => handleSelectStep(idx)}
                        className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
                          isActive
                            ? 'bg-[#06392c] text-white border-[#06392c] shadow-md'
                            : isDone
                            ? 'bg-emerald-50/70 text-slate-800 border-emerald-200 hover:bg-emerald-50'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isActive && (
                          <div
                            className="absolute bottom-0 left-0 h-1 bg-amber-300 transition-all duration-100"
                            style={{ width: `${Math.round(stepProgress * 100)}%` }}
                          />
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <div className="font-serif font-bold text-xs sm:text-sm leading-snug">
                            {step.title}
                          </div>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                              isActive
                                ? 'bg-amber-300/20 text-[#fef3c7]'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {formatTime(step.startSec)}
                          </span>
                        </div>

                        <p
                          className={`text-[11px] mt-1 leading-relaxed ${
                            isActive ? 'text-emerald-100/90' : 'text-slate-600'
                          }`}
                        >
                          {step.subtitle.replace(/^Шаг \d из 5 · /, '')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <a
                href="/iphone-install-guide.mp4"
                download="Инструкция-iPhone-Библиотека-благодеяний.mp4"
                className="w-full py-3 px-4 rounded-2xl bg-[#06392c] hover:bg-[#084d3b] text-[#fef3c7] font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>Скачать видео-инструкцию (.mp4)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface IphoneVideoGuideBannerProps {
  onOpenGuide: () => void;
}

export const IphoneVideoGuideBanner: React.FC<IphoneVideoGuideBannerProps> = ({
  onOpenGuide,
}) => {
  return (
    <section className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 shadow-2xs">
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-center">
        {/* Левая часть: описание, шаги и кнопки */}
        <div className="w-full lg:col-span-7 space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-2">
              <Smartphone className="w-3.5 h-3.5 text-[#06392c]" />
              <span>Видео-инструкция для iPhone (iOS Safari)</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              Как сохранить «Библиотеку благодеяний» на экран «Домой» iPhone
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              Посмотрите короткое видео или скачайте его в формате MP4, чтобы поделиться с близкими:
            </p>
          </div>

          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
            <li className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="font-bold text-[#06392c] block mb-0.5">1. Откройте в Safari</span>
              Откройте сайт в стандартном браузере Safari на iPhone.
            </li>
            <li className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="font-bold text-[#06392c] block mb-0.5">2. Нажмите «Поделиться»</span>
              В нижней панели нажмите иконку квадрата со стрелкой вверх.
            </li>
            <li className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="font-bold text-[#06392c] block mb-0.5">3. «На экран „Домой“»</span>
              Прокрутите меню вниз и выберите пункт «На экран „Домой“» [+].
            </li>
            <li className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="font-bold text-[#06392c] block mb-0.5">4. Нажмите «Добавить»</span>
              Нажмите «Добавить» в правом верхнем углу экрана.
            </li>
          </ol>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenGuide}
              className="bg-[#06392c] hover:bg-[#084d3b] text-[#fef3c7] font-bold text-xs sm:text-sm px-5 py-3 rounded-xl transition cursor-pointer inline-flex items-center gap-2 shadow-xs"
            >
              <Play className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
              <span>Открыть большой плеер</span>
            </button>

            <a
              href="/iphone-install-guide.mp4"
              download="Инструкция-iPhone-Библиотека-благодеяний.mp4"
              className="bg-amber-50 hover:bg-amber-100 text-[#06392c] border border-amber-300 font-bold text-xs sm:text-sm px-4 py-3 rounded-xl transition inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[#06392c] shrink-0" />
              <span>Скачать видео (.mp4)</span>
            </a>
          </div>
        </div>

        {/* Правая часть: встроенный MP4 видео-плеер */}
        <div className="w-full lg:col-span-5 flex flex-col items-center justify-center bg-[#04221a] rounded-2xl p-4 border border-emerald-900/50 shadow-inner">
          <div className="w-full max-w-[230px] aspect-[9/16] rounded-xl overflow-hidden shadow-lg border border-white/15 bg-[#041913]">
            <video
              src="/iphone-install-guide.mp4"
              controls
              loop
              muted
              playsInline
              className="w-full h-full object-contain block"
            />
          </div>
          <span className="text-[11px] text-emerald-100/80 mt-2">
            Видео-инструкция (MP4 · 16 сек · 720×1280)
          </span>
        </div>
      </div>
    </section>
  );
};
