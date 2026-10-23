# --- ЭТАП 1: Сборка React приложения ---
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем манифесты зависимостей
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Копируем исходный код и собираем проект
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
