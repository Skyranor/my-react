import { describe, it, expect, beforeEach, vi } from 'vitest'
import ReactDOM from '../../react-dom/index'
import React from '../../react/index'

describe('React Reconciler & Hooks', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		// Создаем чистый контейнер перед каждым тестом
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	it('должен отрендерить базовый HTML-элемент', async () => {
		const element = React.createElement('h1', { id: 'title' }, 'Hello Custom React')
		
		const root = ReactDOM.createRoot(container)
		root.render(element)

		// Ждем, пока асинхронный requestIdleCallback отработает
		await new Promise(r => setTimeout(r, 10))

		// Проверяем, что нода появилась в DOM
		const h1 = container.querySelector('#title')
		expect(h1).not.toBeNull()
		expect(h1?.textContent).toBe('Hello Custom React')
	})

	it('должен отрендерить функциональный компонент', async () => {
		function App(props: { name: string }) {
			return React.createElement('div', { className: 'app' }, 'User: ', props.name)
		}

		const root = ReactDOM.createRoot(container)
		root.render(React.createElement(App, { name: 'Dzmitry' }))

		// Ждем асинхронный рендер
		await new Promise(r => setTimeout(r, 10))

		const appDiv = container.querySelector('.app')
		expect(appDiv).not.toBeNull()
		expect(appDiv?.textContent).toBe('User: Dzmitry')
	})

	it('должен обновлять состояние через useState', async () => {
		let forceRender: () => void = () => {}

		function Counter() {
			const [count, setCount] = React.useState(0)
			
			// Сохраняем ссылку на setCount для симуляции клика снаружи компонента
			// В реальности мы бы повесили onClick
			forceRender = () => setCount((c: number) => c + 1)

			return React.createElement('span', { id: 'count' }, count)
		}

		const root = ReactDOM.createRoot(container)
		root.render(React.createElement(Counter, null))

		// Ждем начальный рендер
		await new Promise(r => setTimeout(r, 10))

		const span = container.querySelector('#count')
		expect(span?.textContent).toBe('0') // Начальное значение

		// Симулируем "клик" - вызываем setCount
		forceRender()

		// Ждем асинхронный цикл (requestIdleCallback)
		await new Promise(r => setTimeout(r, 100)) // Чуть больше для динамического импорта

		expect(span?.textContent).toBe('1') // Значение должно обновиться!
	})
})
