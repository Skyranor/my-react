# 🗺️ Карта 100 Вопросов для Собеседования (Middle/Senior Frontend)

Этот индекс содержит 100 ключевых вопросов, разбитых по категориям. Мы будем раскрывать их детально (с официальными ответами и формулировками) порциями.

---

## 🟡 Блок 1: JavaScript & TypeScript Core (20 Вопросов)
1. Как работает **Event Loop**? Разница между Microtasks и Macrotasks?
2. Что такое **Замыкание (Closure)**? Приведите пример утечки памяти из-за него.
3. Разница между `__proto__` и `prototype`? Как устроено прототипное наследование?
4. Как работают `Promise.all`, `Promise.allSettled`, `Promise.race`, `Promise.any`?
5. Что происходит под капотом `async/await`? (Генераторы).
6. Разница между `var`, `let`, `const` на уровне движка V8 (Hoisting, Temporal Dead Zone).
7. Как работает `this` в стрелочных функциях vs обычных?
8. Что такое Каррирование (Currying) и Частичное применение?
9. Как работает `garbage collector` в JS? (Алгоритм Mark-and-Sweep).
10. Разница между `==` и `===`? Как работает `Object.is`?
11. Что такое `WeakMap` и `WeakSet`? В чем их практичекая польза?
12. Как сделать глубокое копирование объекта без `JSON.parse(JSON.stringify)`?
13. Что такое `Debounce` и `Throttle`? Реализация руками.
14. Как работает `new` под капотом (4 шага выполнения).
15. TypeScript: Разница между `type` и `interface`?
16. Как работают `Utility Types`: `Pick`, `Omit`, `Partial`, `Record`?
17. Что такое `Mapped Types` и `Conditional Types` в TS?
18. Разница между `unknown` и `any`? В каких случаях использовать `never`?
19. Как устроен `Module Federation` или просто ES Modules под капотом?
20. Что такое `Strict Mode` в JS и какие оптимизации V8 он отключает?

---

## 🔵 Блок 2: React Basics (20 Вопросов)
21. Что такое **JSX**? Во что он компилируется (v16 vs v17+)?
22. Разница между **Props** и **State**? Почему Props Immutable?
23. Зачем нужен `key` в списках детально?
24. Разница между классовыми и функциональными компонентами?
25. Что такое **Controlled** и **Uncontrolled** компоненты?
26. Как работает `useRef` для сохранения состояний без рендера?
27. Что такое **Error Boundary**? Почему его нет для функциональных компонентов?
28. Что такое **Portals**? Когда их использовать (Modals, Tooltips)?
29. Как работает `React.lazy` и `Suspense` под капотом?
30. Разница между `React.Component` и `React.PureComponent`?
31. Что такое **High-Order Components (HOC)**? Устарели ли они?
32. Как работает паттерн **Render Props**?
33. Как устроена валидация `PropTypes` в рантайме?
34. Что такое **Fragments**? Зачем они нужны кроме чистой разметки?
35. Как обрабатывать ошибки внутри `useEffect` асинхронно?
36. Разница между событийной моделью React и нативной (SyntheticEvent).
37. Как передать `ref` дочернему компоненту (`forwardRef`)?
38. Что такое `server-side rendering (SSR)` в контексте React?
39. Разница между `Hydration` и обычным рендером?
40. Как устроен `React Сontext` и почему он не заменяет Redux?

---

## 🟢 Блок 3: React Hooks Deep Dive (20 Вопросов)
41. Как устроен `useState` (связный список хуков)?
42. Почему важен порядок вызова хуков (Rules of Hooks)?
43. Как работает `useEffect` (Cleanup и сборщик мусора)?
44. Разница между `useEffect` и `useLayoutEffect` синхронно?
45. Что такое `useMemo`? Как он сохраняет ссылку?
46. Разница между `useMemo` и `useCallback`?
47. Как создать кастомный хук (`Custom Hook`) и когда это нужно?
48. Как избежать **Stale Closures** (устаревших замыканий) в `useEffect`?
49. Как работает `useReducer`? Когда он лучше `useState`?
50. Что такое `useContext`? Как он вызывает перерисовку?
51. Как работает `useTransition` в React 18+ (Конкурентный стейт)?
52. Зачем нужен `useDeferredValue`? Разница с `Debounce`?
53. Что делает `useId` и почему он важен для SSR?
54. Как работает `useSyncExternalStore`? (Связывание с внешними стейтами).
55. Как отменить асинхронный запрос в `useEffect` при размонтировании?
56. Можно ли вызывать хуки условно (`if (condition)`) с помощью хаков?
57. Каков алгоритм инвалидации кэша в `useMemo`?
58. Как работает `useInsertionEffect` (для CSS-in-JS)?
59. Что такое `Dependency Array` под капотом (сравнение по ссылке)?
60. Можно ли хранить тяжелые вычисления в `useState` инициализаторе?

---

## 🟣 Блок 4: Fiber & Reconciliation (20 Вопросов)
61. Что такое **Fiber Node**? Из чего состоит его структура?
62. Как устроен итеративный обход в глубину (**DFS**) в `WorkLoop`?
63. Разница между `Current` и `Work-In-Progress` деревьями?
64. Что такое **Bailout** (Пропуск рендеринга)? Как он срабатывает?
65. Зачем React разделил рендеринг на **Render** и **Commit** фазы?
66. Как работает **Scheduler**? Что такое фреймрейт бюджет (Frame budget)?
67. Что такое **Lanes (Приоритеты)**? Как они вытесняют задачи?
68. Как работает `reconcileChildren` для одиночных элементов?
69. Алгоритм диффинга для списков (Diffing algorithms).
70. Какую роль играет `alternate` при сопоставлении узлов?
71. Зачем React ушел от рекурсивного Virtual DOM к Fiber?
72. Какие флаги эффектов (`flags` / `effectTag`) бывают у нод?
73. Что такое **Time Slicing** (нарезка времени)?
74. Как работает `setState` батчинг (Batching) на уровне очереди?
75. Как React понимает, какой родитель запустил обновление?
76. Как Fiber очищает память уничтоженных компонентов?
77. Почему React собирает изменения в памяти, а не в DOM напрямую?
78. Что такое **HostComponent** и **FunctionComponent** в терминах Fiber?
79. Как реализовано всплытие событий в Synthetic Events?
80. Как работает `React DevTools` со скрытым хуком `__REACT_DEVTOOLS_GLOBAL_HOOK__`?

---

## 🔴 Блок 5: Стейт, Оптимизация и Архитектура (20 Вопросов)
81. Разница между Redux / MobX / Zustand / Recoil?
82. Что такое **Immutable Data**? Зачем использовать `Immer`?
83. Как работает **Redux Thunk** и **Redux Saga**?
84. Почему `connect` в Redux часто быстрее, чем `useSelector`?
85. Как оптимизировать большой список (Виртуализация / `react-window`)?
86. Что такое **Code Splitting**? (Динамические импорты).
87. Как работает кэширование в браузерах (ETag, Cache-Control, Service Workers)?
88. Разница между **Monolithic** и **Microfrontends**?
89. Как устроена архитектура **Next.js** (App Router vs Pages Router)?
90. Что такое **Server Components (RSC)**? Отличия от SSR.
91. Разница между `Static Site Generation (SSG)` и `Incremental Static Regeneration (ISR)`?
92. Как бороться с утечками памяти (Memory Leaks) во фронтенде?
93. Что такое критический CSS (Critical CSS) и как его вырезать?
94. Как работают сборщики (Webpack vs Vite vs Turbo)?
95. Что такое **Tree Shaking**? Как настроить его в Webpack?
96. Разница между `Babel` и `esbuild`?
97. Что такое **CORS** и способы его обхода (Proxy, Headers)?
98. Как устроен **Websocket** и чем он отличается от HTTP Long Polling?
99. Что такое **Docker** и зачем он фронтендеру в CI/CD?
100. Как вы настраиваете метрики **Core Web Vitals** (LCP, FID, CLS, INP)?
