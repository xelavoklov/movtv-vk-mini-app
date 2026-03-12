# movtv VK Mini App

Отдельный репозиторий для публикации VK Mini App с архивной лентой канала movtv.

Приложение собрано на React, Vite, VKUI и vk-mini-apps-router. Данные постов читаются из public/channel.json, а медиа и аватарки загружаются по публичным URL.

## Локальный запуск

```sh
npm install
npm run dev
```

Приложение стартует локально на http://localhost:5173.

## Сборка

```sh
npm run build
```

Готовая production-сборка появляется в папке build.

## Публикация на GitHub Pages

Репозиторий рассчитан на публикацию через GitHub Pages.

В репозиторий уже добавлен workflow GitHub Actions. После push в main GitHub автоматически:

1. Установит зависимости.
2. Прогонит lint.
3. Соберёт проект.
4. Опубликует папку build на GitHub Pages.

Тебе достаточно включить GitHub Pages в настройках репозитория и выбрать GitHub Actions как источник публикации.

## Настройка в VK Developers

В личном кабинете VK Developers в поле ссылки приложения укажи публичный URL, который открывает именно собранную версию мини-приложения.

Пример:

```text
https://xelavoklov.github.io/movtv-vk-mini-app/
```

или, если опубликована подпапка:

```text
https://xelavoklov.github.io/movtv-vk-mini-app/build/
```

Главное условие: по этому адресу должен открываться VK Mini App, а не произвольная архивная страница.

## Полезные команды

```sh
npm run lint
npm run build
```
