import { describe, it, expect, beforeEach } from 'vitest'
import ReactDOM from '../../react-dom/index'
import React from '../../react/index'

describe('React Reconciler - Advanced Edge Cases', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	it('должен поддерживать несколько useState в одном компоненте', async () => {
		let forceCount: () => void = () => {}
		let forceText: () => void = () => {}

		function MultiCounter() {
			const [count, setCount] = React.useState(0)
			const [text, setText] = React.useState('A')

			forceCount = () => setCount((c: number) => c + 1)
			forceText = () => setText((t: string) => t + 'B')

			return React.createElement('div', { id: 'output' }, `${count}-${text}`)
		}

		const root = ReactDOM.createRoot(container)
		root.render(React.createElement(MultiCounter, null))
		await new Promise(r => setTimeout(r, 10))

		const div = container.querySelector('#output')
		expect(div?.textContent).toBe('0-A')

		// 1. Обновляем счетчик
		forceCount()
		await new Promise(r => setTimeout(r, 100))
		expect(div?.textContent).toBe('1-A')

		// 2. Обновляем текст
		forceText()
		await new Promise(r => setTimeout(r, 100))
		expect(div?.textContent).toBe('1-AB')

		// 3. Обновляем оба по очереди
		forceCount()
		forceText()
		await new Promise(r => setTimeout(r, 100))
		expect(div?.textContent).toBe('2-ABB')
	})

	it('должен группировать (батчить) обновления из очереди hook.queue', async () => {
		let triggerBatchedUpdate: () => void = () => {}

		function Counter() {
			const [count, setCount] = React.useState(0)

			triggerBatchedUpdate = () => {
				// Вызываем дважды подряд
				setCount((c: number) => c + 1)
				setCount((c: number) => c + 1)
			}

			return React.createElement('span', { id: 'count' }, count)
		}

		const root = ReactDOM.createRoot(container)
		root.render(React.createElement(Counter, null))
		await new Promise(r => setTimeout(r, 10))

		const span = container.querySelector('#count')
		expect(span?.textContent).toBe('0')

		// Нажимаем "клик" (вызываем батчинг)
		triggerBatchedUpdate()
		
		// Наш полифилл `requestIdleCallback` в setup отрабатывает один раз асинхронно
		await new Promise(r => setTimeout(r, 100))

		// --- ВАЖНАЯ ПРОВЕРКА ДЛЯ СОБЕСЕДОВАНИЯ ---
		// Если батчинг работает через хуки (очередь `queue` в `ReactHooks.ts`),
		// оба вызова `setCount` должны выполниться перед рендером! Итог должен быть 2.
		expect(span?.textContent).toBe('2')
	})

	it('должен заменять узел на другой тип (PLACEMENT + DELETION)', async () => {
		function App(props: { isButton: boolean }) {
			return props.isButton 
				? React.createElement('button', { id: 'element' }, 'Button')
				: React.createElement('div', { id: 'element' }, 'Div')
		}

		const root = ReactDOM.createRoot(container)
		
		// 1. Рендерим div
		root.render(React.createElement(App, { isButton: false }))
		await new Promise(r => setTimeout(r, 10))

		expect(container.querySelector('div')).not.toBeNull()
		expect(container.querySelector('button')).toBeNull()

		// 2. Переключаем на button
		root.render(React.createElement(App, { isButton: true }))
		await new Promise(r => setTimeout(r, 10))

		// Доказывает, что nodeType изменился, сработал Placement нового и Deletion старого
		expect(container.querySelector('button')).not.toBeNull()
		expect(container.querySelector('div')).toBeNull()
	})

	it('должен очищать атрибуты при их удалении из пропсов', async () => {
		function App(props: { className?: string }) {
			const config = props.className ? { className: props.className } : {}
			return React.createElement('div', config, 'Content')
		}

		const root = ReactDOM.createRoot(container)
		
		// 1. Рендерим с className
		root.render(React.createElement(App, { className: 'active' }))
		await new Promise(r => setTimeout(r, 10))

		const div = container.querySelector('div')
		expect(div?.className).toBe('active')

		// 2. Рендерим БЕЗ className
		root.render(React.createElement(App, {}))
		await new Promise(r => setTimeout(r, 10))

		// Доказывает, что `updateDom` сработал по фильтру `isGone` и затер `dom[name] = ''`
		expect(div?.className).toBe('')
	})
})
