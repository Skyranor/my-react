# 💻 Модуль 16: Next.js в Коде (Разбор с Примерами для Изучения)

Если вы раньше не писали на Next.js (App Router), этот файл — ваш **быстрый старт**. Здесь собраны основные сценарии с реальным кодом, который вы сможете представить в голове.

---

## 🟢 1. Server Components vs Client Components

**Главное правило:** В App Router все компоненты по умолчанию — Серверные (Server Components). Они выполняются один раз на сервере.

### 📄 Серверный Компонент (Доставка данных без JS)
```tsx
// app/users/page.tsx
// ⚠️ НЕ требует "use client" в начале

export default async function UsersPage() {
  // 1. Прямой вызов fetch прямо в async-функции (без useEffect!)
  const res = await fetch('https://api.example.com/users');
  const users = await res.json();

  return (
    <main>
      <h1>Список пользователей (Рендеринг на сервере)</h1>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </main>
  );
}
```

### 📄 Клиентский Компонент (Интерактивность)
Если вам нужен `useState`, `onClick`, `useEffect` — ставим директиву `"use client"`.

```tsx
// app/counter/page.tsx
"use client"; // 👈 Обязательно на первой строчке!

import { useState } from 'react';

export default function CounterPage() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Счетчик кликов: {count}</p>
      <button onClick={() => setCount(count + 1)}>Увеличить</button>
    </div>
  );
}
```

---

## 📡 2. Кэширование данных (fetch)

В Next.js вызовы `fetch` расширены. Вы управляете кэшем прямо в аргументах.

### ⏳ A. Бесконечный Кэш (Аналог SSG)
```tsx
const res = await fetch('https://api.com/posts', { 
  cache: 'force-cache' // Страница замерзнет с этими данными намертво
});
```

### 🔁 Б. Без Кэша (Аналог SSR / Динамика)
```tsx
const res = await fetch('https://api.com/balance', { 
  cache: 'no-store' // Всегда делать запрос к бэкенду на каждый рефреш
});
```

### 🕰️ В. Регенерация (Аналог ISR)
```tsx
const res = await fetch('https://api.com/news', { 
  next: { revalidate: 60 } // Кэш обновится в фоне через 60 секунд
});
```

---

## 🌊 3. Потоковый рендеринг (Streaming) + Suspense

Что делать, если список транзакций грузится 3 секунды? 

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';
import TransactionList from './TransactionList';

export default async function Dashboard() {
  return (
    <main className="p-4">
      <h1>Ваш Кошелек</h1>
      
      {/* 1. Шапка покажется мгновенно. 
          2. Пока TransactionList качает данные, покажется Loader.
          3. Как только данные придут — список «прогрузится» плавно. */}
      <Suspense fallback={<p>Загрузка транзакций...</p>}>
        <TransactionList />
      </Suspense>
    </main>
  );
}
```

---

## 🧭 4. Динамические роуты и Параметры

### 📁 Структура папок: `app/cards/[id]/page.tsx`

При переходе на `/cards/visa-gold` Next.js передаст аргумент в функцию страницы.

```tsx
// app/cards/[id]/page.tsx

type Props = {
  params: { id: string }
};

export default async function CardPage({ params }: Props) {
  // Достаем id из параметров роута
  const { id } = params; 
  const res = await fetch(`https://api.bank.com/cards/${id}`, { cache: 'no-store' });
  const card = await res.json();

  return (
    <div>
      <h2>Карта: {id}</h2>
      <p>Баланс: {card.balance} BYN</p>
    </div>
  );
}
```

---

## 🛡️ 5. Защита страниц (Middleware)

Как в банке перехватить пользователя, если у него нет токена авторизации?

```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Достаем токен из куки HttpOnly
  const token = request.cookies.get('auth_token')?.value;

  // 2. Если мы ломимся в /dashboard и токена нет — редирект на логин
  if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// 3. Указываем, какие страницы слушать (чтобы не тормозить картинки и статику)
export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
};
```

---

## 📝 6. Мутации данных (Server Actions)

Замена старым API контроллерам на бэкенде.

```tsx
// app/transfer/page.tsx

export default function TransferPage() {
  // 1. Функция выполняется СТРОГО НА СЕРВЕРЕ Node.js
  async function performTransfer(formData: FormData) {
    "use server"; // 👈 Указывает Next.js, что это Server Action

    const amount = formData.get('amount');
    const toCard = formData.get('toCard');

    // Делаем вызов к реальному банковскому бэку
    await fetch('https://api.bank.com/transfer', {
      method: 'POST',
      body: JSON.stringify({ amount, toCard })
    });

    // Очищаем кэш страницы дашборда, чтобы баланс обновился
    // import { revalidatePath } from 'next/cache';
    // revalidatePath('/dashboard');
  }

  return (
    <form action={performTransfer} className="flex flex-col gap-2">
      <input name="amount" type="number" placeholder="Сумма" />
      <input name="toCard" type="text" placeholder="Номер карты" />
      <button type="submit">Перевести</button>
    </form>
  );
}
```

---

🌟 **Вывод для изучения:**
Next.js — это как обычный React, только вызовы к базе/API пишутся **прямо в компонентах** (если они асинхронные на сервере), а интерактивность выносится в отдельные файлы с `"use client"`.
