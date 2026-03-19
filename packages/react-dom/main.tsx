// packages/react-dom/index.tsx
import React from '../react'
import ReactDOM from '../react-dom'

// 1. Описываем UI с помощью JSX
const App = (
	<div style='font-family: sans-serif; padding: 20px; text-align: center;'>
		<h1 style='color: #61dafb;'>Привет, я твой Mini-React! ⚛️</h1>
		<p>Если ты видишь этот текст, значит рендерер работает.</p>
		<a href='https://react.dev' target='_blank'>
			Читать настоящую доку
		</a>
	</div>
)

// 2. Находим контейнер в index.html
const container = document.getElementById('root')

// 3. Рендерим!
const root = ReactDOM.createRoot(container!)
root.render(App)
