# 💻 Модуль 17: Полный Атлас Кода Next.js (Дополнительные примеры)

Этот файл расширяет наши практические знания, добавляя код для **продвинутых паттернов** Next.js (SEO, Параллельные роуты, Кэширование тегами и Ошибки).

---

## 🧭 1. Параллельные и Перехватывающие Роуты (Parallel & Intercepting)

### 📁 Папка: `app/dashboard/@analytics/page.tsx` и `app/dashboard/@feed/page.tsx`

Параллельные роуты позволяют рендерить 2 независимых блока на одном экране с раздельными загрузочными экранами (`loading.tsx`).

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics, // 👈 Приходят как пропсы из папок @analytics
  feed,      // 👈 Приходят как пропсы из папок @feed
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  feed: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">{children}</div>
      <div className="border p-4">{analytics}</div>
      <div className="border p-4">{feed}</div>
    </div>
  );
}
```

---

## 📦 2. Кэширование по Тегам (On-demand Revalidation)

Как заставить Next.js удалить кэш только определенной страницей/запросом при мутации (например, после добавления поста).

```tsx
// 1. В компоненте загрузки:
const res = await fetch('https://api.com/posts', { 
  next: { tags: ['posts-list'] } // 👈 Вешаем бирку (тег) на кэш
});

// 2. В Server Action (после сохранения):
import { revalidateTag } from 'next/cache';

export async function createPost(formData: FormData) {
  "use server";
  
  // Сохраняем в БД...
  await fetch('https://api.com/posts', { method: 'POST' });

  // Удаляем старый кэш по бирке. 
  // При следующем рендере Next.js стянет свежие данные.
  revalidateTag('posts-list'); 
}
```

---

## 📐 3. Динамические SEO Метатеги

Как сделать разные `title` и `description` для товаров из базы данных.

```tsx
// app/products/[id]/page.tsx
import { Metadata } from 'next';

type Props = { params: { id: string } };

// 1. Функция generateMetadata() вызывается Next.js автоматически
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = params.id;
  const product = await fetch(`https://api.com/products/${id}`).then(res => res.json());

  return {
    title: `${product.name} - Купить в Банке`,
    description:product.description,
    openGraph: {
      images: [product.imageUrl], // Картинка для шеринга в Telegram/Slack
    },
  };
}

export default function Product({ params }: Props) {
  return <h1>Товар {params.id}</h1>;
}
```

---

## 🖼️ 4. Тонкости `<Image>` (Правильное масштабирование)

Что делать, если картинка приходит из API и у нее **неизвестная ширина/высота**?

```tsx
// app/products/Card.tsx
import Image from 'next/image';

export default function ProductCard({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="relative w-64 h-64 border"> {/* 1. Обязательно relative у контейнера */}
      
      <Image 
        src={imageUrl} 
        alt="Товар" 
        fill // 2. Занимает 100% ширины и высоты родительского div
        style={{ objectFit: 'cover' }} // 3. Обрезается красиво, сохраняя пропорции файла
        sizes="(max-width: 768px) 100vw, 50vw" // 4. Оптимизирует вес картинки для мобилок
      />
      
    </div>
  );
}
```

---

## 🛠️ 5. Страница Ошибки (`error.tsx`) и Лоадер (`loading.tsx`)

Next.js использует файловую систему для перехвата ошибок. Механизм работает декларативно.

### 📄 Файл: `app/dashboard/loading.tsx`
*Показывается автоматически, пока async функции в `page.tsx` ждут `await fetch`.*

```tsx
export default function Loading() {
  return <div className="animate-spin">Загрузка дашборда...</div>;
}
```

### 📄 Файл: `app/dashboard/error.tsx`
*Показывается, если в `page.tsx` произошел `throw new Error()`.*

```tsx
"use client"; // 👈 Обязательно Клиентский!

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логируем ошибку в Sentry
    console.error(error);
  }, [error]);

  return (
    <div className="p-4 bg-red-100 text-red-800">
      <h2>Что-то пошло не так!</h2>
      <p>{error.message}</p>
      {/* Кнопка сброса пытается срендерить страницу заново */}
      <button onClick={() => reset()} className="mt-2 p-1 bg-red-600 text-white">
        Попробовать еще раз
      </button>
    </div>
  );
}
```

---

🌟 **Вывод:** 
Параллельные роуты, ревалидация по тегам и автоматические `loading/error` файлы — это то, что превращает Next.js из "просто React" в **комбайн для создания отказоустойчивых enterprise систем**.
