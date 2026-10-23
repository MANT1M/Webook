import React, { useState } from 'react';
import { Download, Copy, Check, X, FileCode, Server, Settings } from 'lucide-react';

const DOCKERFILE_CONTENT = `# --- ЭТАП 1: Сборка React приложения ---
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем манифесты зависимостей
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Копируем исходный код и собираем production-билд
COPY . .
RUN npm run build

# --- ЭТАП 2: Nginx веб-сервер ---
FROM nginx:alpine

# Удаляем дефолтную директорию html
RUN rm -rf /usr/share/nginx/html

# Копируем собранный проект из этапа сборки
COPY --from=builder /app/dist /usr/share/nginx/html

# Страховка для сборщика Kaniko: если файлы оказались во вложенной папке dist
RUN if [ -d "/usr/share/nginx/html/dist" ]; then cp -r /usr/share/nginx/html/dist/* /usr/share/nginx/html/ && rm -rf /usr/share/nginx/html/dist; fi

# Проверка наличия index.html прямо во время сборки
RUN test -f /usr/share/nginx/html/index.html || (echo "FATAL: index.html not found!" && ls -la /usr/share/nginx/html && exit 1)

# Копируем конфигурацию Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Выставляем права доступа
RUN chmod -R 755 /usr/share/nginx/html && chmod 644 /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;

const NGINX_CONF_CONTENT = `server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    charset utf-8;

    # Gzip сжатие для ускорения загрузки
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss image/svg+xml;

    # Кэширование статичных ассетов Vite (JS, CSS, картинки)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA роутинг: перенаправление всех путей на index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Защита от бесконечного цикла редиректов
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Обработка favicon и robots
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    location = /robots.txt {
        log_not_found off;
        access_log off;
    }

    # Обработка 50x ошибок
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
`;

const AMVERA_YML_CONTENT = `meta:
  environment: docker
  toolchain:
    name: docker
    version: latest
build:
  dockerfile: Dockerfile
run:
  containerPort: 80
`;

interface AmveraFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AmveraFilesModal: React.FC<AmveraFilesModalProps> = ({ isOpen, onClose }) => {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  if (!isOpen) return null;

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = (filename: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const handleDownloadAll = () => {
    downloadTextFile('Dockerfile', DOCKERFILE_CONTENT);
    setTimeout(() => downloadTextFile('nginx.conf', NGINX_CONF_CONTENT), 250);
    setTimeout(() => downloadTextFile('amvera.yml', AMVERA_YML_CONTENT), 500);
  };

  const files = [
    {
      name: 'Dockerfile',
      badge: 'Обязательный',
      desc: 'Инструкция для Amvera по сборке проекта и упаковке в Nginx',
      icon: FileCode,
      content: DOCKERFILE_CONTENT,
    },
    {
      name: 'nginx.conf',
      badge: 'Обязательный',
      desc: 'Конфигурация веб-сервера с поддержкой SPA-маршрутов и сжатия gzip',
      icon: Server,
      content: NGINX_CONF_CONTENT,
    },
    {
      name: 'amvera.yml',
      badge: 'Рекомендуемый',
      desc: 'Параметры для Amvera (порт 80, сборка через Dockerfile)',
      icon: Settings,
      content: AMVERA_YML_CONTENT,
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модального окна */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#0F5132',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Download className="w-5 h-5 text-amber-300" />
              Файлы для загрузки на Amvera Cloud
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#A7F3D0' }}>
              Скачайте файлы и загрузите их в репозиторий Amvera
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Быстрая кнопка скачать все */}
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#166534' }}>
                Скачать все 3 файла сразу
              </div>
              <div style={{ fontSize: '12px', color: '#15803D' }}>
                Dockerfile, nginx.conf и amvera.yml
              </div>
            </div>
            <button
              onClick={handleDownloadAll}
              style={{
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(22,163,74,0.3)',
              }}
            >
              <Download className="w-4 h-4" />
              Скачать всё
            </button>
          </div>

          {/* Список файлов по отдельности */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {files.map((file) => {
              const Icon = file.icon;
              const isCopied = copiedFile === file.name;

              return (
                <div
                  key={file.name}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '14px',
                    backgroundColor: '#F8FAFC',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon className="w-4 h-4 text-emerald-700" />
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '15px',
                          fontFamily: 'monospace',
                          color: '#0F172A',
                        }}
                      >
                        {file.name}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          backgroundColor: file.badge === 'Обязательный' ? '#DC2626' : '#2563EB',
                          color: '#FFFFFF',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontWeight: 600,
                        }}
                      >
                        {file.badge}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleCopy(file.name, file.content)}
                        title="Скопировать содержимое"
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: isCopied ? '#16A34A' : '#475569',
                        }}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Скопировано' : 'Копия'}
                      </button>
                      <button
                        onClick={() => downloadTextFile(file.name, file.content)}
                        title="Скачать файл"
                        style={{
                          backgroundColor: '#0F5132',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Скачать
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{file.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Инструкция как загрузить в Amvera */}
          <div
            style={{
              marginTop: '20px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '12px',
              color: '#92400E',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '6px', color: '#78350F' }}>
              Как загрузить на Amvera:
            </div>
            <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Нажмите кнопку <strong>«Скачать всё»</strong> выше (файлы сохранятся в папку «Загрузки»).</li>
              <li>В панели Amvera во вкладке <strong>«Репозиторий»</strong> нажмите оранжевую кнопку <strong>«Загрузить данные»</strong>.</li>
              <li>Выберите скачанные файлы <code>Dockerfile</code> и <code>nginx.conf</code>.</li>
              <li>Нажмите <strong>«Собрать проект»</strong>.</li>
            </ol>
          </div>
        </div>

        {/* Футер */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#F1F5F9',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#475569',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
