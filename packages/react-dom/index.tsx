// packages/react-dom/index.tsx
// import React from '../react' // Импортируем наше ядро
import { createElement } from '../react/src/createElement'

// Пишем привычный JSX
const element = (
	<div id='foo'>
		<a>Привет</a>
		<b />
	</div>
)

// Выводим результат в консоль, чтобы увидеть структуру объекта
console.log('React Element:', element)
