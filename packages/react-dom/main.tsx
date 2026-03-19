// packages/react-dom/index.tsx
import React from '../react'
import ReactDOM from '../react-dom'

// Создаем наш первый функциональный компонент!
function Greeting(props: { name: string }) {
	return <h2 style='color: #61dafb; margin: 0;'>Привет, {props.name}! 👋</h2>
}

// Создаем главный компонент App
function App(props: { title: string }) {
	return (
		<div style='font-family: sans-serif; padding: 40px; text-align: center; border: 2px dashed #ccc; border-radius: 10px;'>
			<h1>{props.title}</h1>

			<div style='margin: 20px 0;'>
				{/* Используем другой компонент внутри! */}
				<Greeting name='Senior Frontend Developer' />
				<Greeting name='мир' />
			</div>

			<p>Теперь наш движок понимает функции, а не только HTML-теги.</p>
		</div>
	)
}

const container = document.getElementById('root')
const root = ReactDOM.createRoot(container!)

// Рендерим компонент App, передавая ему пропсы
root.render(<App title='Мой собственный React' />)
