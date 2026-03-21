# Стиль и соглашения (Style and Conventions)

## 🎨 Общие правила стиля
Проект следует стандартным соглашениям для **TypeScript**:
- **Strict Mode** включен (`"strict": true` в `tsconfig.json`).
- Модульная архитектура: код разнесен по пакетам (`packages/`).
- Импорты и структура файлов организуются по пакетам (например, `packages/react-dom`, `packages/react-reconciler`).

## ⚛️ Специфика React (JSX)
- Используется **custom JSX factory**:
  - `React.createElement` для обычных тегов.
  - `React.createFragment` для `<>` и `</>`.
- Фреймворк работает в терминах **Fiber-узлов** (хостов) и **State**.

## 🚀 Написание кода
- Пишите чистый TypeScript без лишних placeholders.
- При изменении кода всегда учитывайте обратную совместимость с другими пакетами.
