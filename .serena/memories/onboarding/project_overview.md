# Обзор проекта (Project Overview)

`my-react` — это кастомная реализация React-фреймворка, созданная для изучения и визуализации внутренних механизмов (Fiber, Reconciler, Render/Commit фазы).

## 🚀 Стек технологий (Tech Stack)
- **Язык**: TypeScript
- **Сборщик / Dev Сервер**: Vite
- **Тестирование**: Vitest + JSDOM
- **JSX**: Используются кастомные функции:
  - `React.createElement` для элементов
  - `React.createFragment` для фрагментов

## 📂 Структура кодовой базы (Codebase Structure)
Проект организован как монорепозиторий (Monorepo) с пакетами в папке `packages/`:
- **`packages/react`**: Базовый API (создание элементов, хуки).
- **`packages/react-dom`**: Рендерер для браузера (DOM).
- **`packages/react-reconciler`**: Логика Fiber-дерева и реконсиляции (обнолвения).
- **`packages/shared`**: Общие типы и утилиты (включая DevTools/Inspector).

## 🛠️ Инспектор (Fiber Inspector)
В проект встроен `Fiber Inspector` — панель инструментов для отладки.
- Позволяет смотреть `CURRENT DOM TREE` и `WORK-IN-PROGRESS`.
- Отображает счетчики рендеров (`x2`) и пропусков/bailout (`Skip: N`).
- Подсвечивает фазы: `PLACEMENT`, `UPDATE`, `DELETION`.
- Позволяет искусственно замедлять рендер (`Slow Motion`) для отладки.
