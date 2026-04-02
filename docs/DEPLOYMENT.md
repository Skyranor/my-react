# 🚀 Деплой проекта

Ваш кастомный React собирается с помощью **Vite**. Сборка прошла успешно, файлы находятся в папке `dist/`.

Вот несколько простых способов опубликовать ваш проект, чтобы его увидели другие:

---

### ⚛️ Вариант 1: Vercel (Самый быстрый и простой)

Vercel — идеальный хостинг для статических сайтов и Vite.

1.  Зарегистрируйтесь на сайте [Vercel](https://vercel.com).
2.  Подключите ваш аккаунт GitHub/GitLab.
3.  Нажмите **"Add New"** -> **"Project"** и выберите ваш репозиторий.
4.  В настройках сборки (**Build and Output Settings**):
    *   **Framework Preset:** Vite (определится автоматически).
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `dist`
5.  Нажмите **Deploy**. Через 30 секунд у вас будет живая ссылка!

---

### 🐙 Вариант 2: GitHub Pages (Бесплатно для опенсорс)

Если ваш проект лежит на GitHub, вы можете настроить деплой через **GitHub Actions**:

1. Создайте файл `.github/workflows/deploy.yml` со следующим содержимым:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
```

2. В настройках репозитория на GitHub:
   *   Перейдите в **Settings** -> **Pages**.
   *   В поле **Source** выберите **GitHub Actions**.
3. При каждом `git push` сайт будет обновляться автоматически.

> ⚠️ **Важно для GitHub Pages:** 
> Если проект развернется на поддомене (например, `username.github.io/my-react/`), вам нужно заменить в `index.html` путь `/packages/react-dom/main.tsx` на относительный `./packages/react-dom/main.tsx`, иначе ресурсы не загрузятся.

---

### 🌐 Вариант 3: Netlify

1. Зарегистрируйтесь на [Netlify](https://www.netlify.com).
2. Выберите **"Import from Git"**.
3. Настройки те же: `npm run build` и папка `dist`.

> 💡 **Рекомендация:** Начните с **Vercel** — это займет буквально 2 минуты кликами в браузере.
