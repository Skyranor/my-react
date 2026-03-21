import React from '../react'
import ReactDOM from '../react-dom'
import { useEffect, useState } from '../react/src/ReactHooks'
import { Header } from './src/components/Header'
import { TodoDashboard } from './src/components/TodoDashboard'
import { initFiberInspector } from '../shared/FiberInspector'

// Инициализируем Инспектор ДО запуска React
initFiberInspector()

function Counter() {
	const [count, setCount] = useState(0)
	const [seconds, setSeconds] = useState(0)
	const [isRunning, setIsRunning] = useState(false) // По умолчанию выключен

	// Эффект Таймера (Запуск и Очистка)
	useEffect(() => {
		if (!isRunning) return

		console.log('%c[Effect] ⏱️ Таймер запущен!', 'color: #00BCD4; font-weight: bold;')
		
		const timer = setInterval(() => {
			setSeconds(prev => prev + 1)
		}, 1000)

		return () => {
			console.log('%c[Effect] 🛑 Таймер очищен (Cleanup)!', 'color: #FF5722; font-weight: bold;')
			clearInterval(timer)
		}
	}, [isRunning]) // Зависимость от положения переключателя

	return (
		<div style="background: rgba(255, 255, 255, 0.04); padding: 15px; border-radius: 12px; margin-top: 20px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
			<p style="margin: 0 0 8px; font-size: 13px; color: rgba(255, 255, 255, 0.6); font-weight: 500;">
				🛠️ Кастомный Счетчик & ⏱️ Таймер
			</p>
			
			<div style="font-size: 12px; color: #4CAF50; margin-bottom: 12px; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 10px;">
				<span>Прошло секунд: <span style="font-size: 14px; color: #00BCD4;">{seconds}</span></span>
				<button 
					onClick={() => setIsRunning(!isRunning)}
					style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 3px 8px; border-radius: 6px; color: white; font-size: 11px; cursor: pointer; transition: all 0.2s;"
				>
					{isRunning ? '⏸️ Пауза' : '▶️ Старт'}
				</button>
			</div>

			<div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
				<button 
					onClick={() => setCount(count - 1)}
					style="background: rgba(255, 255, 255, 0.1); border: none; color: white; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; font-size: 18px; font-weight: bold;"
				>-</button>
				<span style="font-size: 24px; font-weight: 800; color: #0070f3; min-width: 40px; text-align: center;">{count}</span>
				<button 
					onClick={() => setCount(count + 1)}
					style="background: #0070f3; border: none; color: white; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; font-size: 18px; font-weight: bold;"
				>+</button>
			</div>
		</div>
	)
}

// --- СЕКЦИЯ СЧЕТЧИКА (Управление локальным стейтом) ---
function CounterSection() {
	const [showCounter, setShowCounter] = useState(true)

	return (
		<React.Fragment>
			<button 
				onClick={() => setShowCounter(!showCounter)}
				style="margin-top: 20px; width: 100%; padding: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 13px; font-weight: 500;"
			>
				{showCounter ? '🔴 Размонтировать (Очистить Таймер)' : '🟢 Смонтировать Таймер'}
			</button>

			{showCounter && <Counter />}
		</React.Fragment>
	)
}

// --- ГЛАВНОЕ ПРИЛОЖЕНИЕ (Чистая композиция) ---
function App() {
	return (
		<div
			style="
			max-width: 480px; margin: 0 auto; padding: 40px 25px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			min-height: 100vh;
		"
		>
			<Header />

			<TodoDashboard />

			<CounterSection />

			<div style='margin-top: 40px; padding: 20px 15px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;'>
				<p style='color: rgba(255,255,255,0.5); font-size: 13px; margin: 0 0 12px;'>
					Crafted with 🧠 by <strong style="color: #61dafb;">@Skyranor</strong>
				</p>
				<div style="display: flex; gap: 15px; justify-content: center; font-size: 12px;">
					<a href="https://github.com/Skyranor" target="_blank" style="color: rgba(255,255,255,0.6); text-decoration: none; display: flex; align-items: center; gap: 4px;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.6)'">
						GitHub
					</a>
					<span style="color: rgba(255,255,255,0.15);">|</span>
					<a href="https://www.linkedin.com/in/dzmitrybaryshau/" target="_blank" style="color: rgba(255,255,255,0.6); text-decoration: none;" onmouseover="this.style.color='#0077b5'" onmouseout="this.style.color='rgba(255,255,255,0.6)'">
						LinkedIn
					</a>
				</div>
				<p style='color: rgba(255,255,255,0.2); font-size: 10px; margin-top: 15px;'>
					Самописный React & Fiber Engine с нуля 🔥
				</p>
			</div>
		</div>
	)
}

const container = document.getElementById('root')
const root = ReactDOM.createRoot(container!)

root.render(<App title='Мой собственный React' />)
