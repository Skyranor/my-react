// 🚀 HYPER-FRAMEWORK (Compiled Signals Demo)
// Этот файл демонстрирует, КАК работает фреймворк без Virtual DOM (по типу SolidJS)
// На базе мелкой реактивности (Signals) и прямой привязки к нодам.

// ==========================================
// 🧠 1. ЯДРО (Runtime - всего 20 строк)
// ==========================================

let currentEffect = null;

function createSignal(value) {
    const subscribers = new Set();
    
    const getter = () => {
        // Если мы сейчас внутри эффекта, подписываем его на этот сигнал
        if (currentEffect) {
            subscribers.add(currentEffect);
        }
        return value;
    };
    
    const setter = (newValue) => {
        if (value === newValue) return;
        value = newValue;
        // Уведомляем всех подписчиков
        subscribers.forEach(effectFn => effectFn());
    };
    
    return [getter, setter];
}

function createEffect(fn) {
    currentEffect = fn;
    fn(); // Запускаем первый раз для сбора зависимостей
    currentEffect = null;
}

// ==========================================
// 💻 2. ИСХОДНЫЙ КОД (Как пишет разработчик)
// ==========================================
/*
function Counter() {
    const [count, setCount] = createSignal(0);
    const [name] = createSignal("Пользователь");

    return (
        <div>
            <h1>Привет, {name()}!</h1>
            <p>Счетчик: {count()}</p>
            <button onClick={() => setCount(count() + 1)}>Добавить</button>
        </div>
    );
}
*/

// ==========================================
// 🛠️ 3. РЕЗУЛЬТАТ КОМПИЛЯЦИИ (Что под капотом)
// ==========================================

// Имитация DOM-нод для запуска в чистом Node.js
class MockElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.textContent = '';
        this.onclick = null;
    }
    appendChild(child) {
        this.children.push(child);
    }
}

function Counter_Compiled() {
    console.log("\n[Render] Функция компонента вызвана 1 РАЗ для инициализации.");
    const [count, setCount] = createSignal(0);

    // 1. Компилятор создает скелет (Static Templates)
    const div = new MockElement('DIV');
    const h1 = new MockElement('H1');
    const p = new MockElement('P');
    const button = new MockElement('BUTTON');

    div.appendChild(h1);
    div.appendChild(p);
    div.appendChild(button);

    h1.textContent = "Привет, Пользователь!";
    button.textContent = "Добавить";

    // 2. Биндинг событий (Events)
    button.onclick = () => {
        console.log("\n👉 [User Action] Клик по кнопке");
        setCount(count() + 1);
    };

    // 3. ⚡ МАГИЯ: Прямая привязка Эффекта к DOM-ноде
    createEffect(() => {
        // Эта функция вызовется ТОЛЬКО при изменении count!
        // Она вызывает count() -> count регистрирует этот эффект в subscribers
        p.textContent = `Счетчик: ${count()}`;
        console.log(`⚡ [Update Node] Отработал эффект. Обновлена только нода <P>. Текст: "${p.textContent}"`);
    });

    return { div, button }; // Возвращаем для тестов
}

// ==========================================
// 🏃‍♂️ 4. ЗАПУСК И ЭМУЛЯЦИЯ
// ==========================================

console.log("=== СТАРТ ПРИЛОЖЕНИЯ ===");
const { div, button } = Counter_Compiled();

console.log("\n=== ИМИТАЦИЯ ДЕЙСТВИЙ ПОЛЬЗОВАТЕЛЯ ===");
button.onclick(); 
button.onclick(); 
button.onclick();

console.log("\n=== ИТОГОВОЕ СОСТОЯНИЕ MOCK-DOM ===");
console.log(JSON.stringify(div, null, 2));
