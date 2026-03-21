import { describe, it, expect, beforeEach } from 'vitest'
import ReactDOM from '../../react-dom/index'
import React from '../../react/index'

describe('React Reconciler - Reconciliation (Diffing & Deletion)', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	it('должен обновлять атрибуты (UPDATE) существующего узла без пересоздания', async () => {
		function App(props: { id: string; className: string }) {
			return React.createElement('div', { id: props.id, className: props.className }, 'Content')
		}

		const root = ReactDOM.createRoot(container)
		
		// 1. Первый рендер
		root.render(React.createElement(App, { id: 'first', className: 'box' }))
		await new Promise(r => setTimeout(r, 10))

		const div = container.querySelector('div')
		expect(div).not.toBeNull()
		expect(div?.id).toBe('first')
		expect(div?.className).toBe('box')

		// Сохраняем ссылку на реальный DOM узел!
		const originalDomNode = div

		// 2. Второй рендер - меняем пропсы
		root.render(React.createElement(App, { id: 'second', className: 'card' }))
		await new Promise(r => setTimeout(r, 10))

		// Проверяем изменения
		expect(div?.id).toBe('second')
		expect(div?.className).toBe('card')

		// --- ВАЖНАЯ ПРОВЕРКА ДЛЯ СОБЕСЕДОВАНИЯ ---
		// DOM-узел должен остаться тем же самым! (Не пересоздаваться)
		expect(container.querySelector('div')).toBe(originalDomNode)
	})

	it('должен обновлять обработчики событий (удалять старые)', async () => {
		let count = 0
		const handler1 = () => { count += 1 }
		const handler2 = () => { count += 10 }

		function App(props: { onClick: () => void }) {
			return React.createElement('button', { id: 'btn', onClick: props.onClick }, 'Click')
		}

		const root = ReactDOM.createRoot(container)
		
		// 1. Рендерим с handler1
		root.render(React.createElement(App, { onClick: handler1 }))
		await new Promise(r => setTimeout(r, 10))

		const btn = container.querySelector('#btn') as HTMLButtonElement
		btn.click()
		expect(count).toBe(1) // Сработал handler1

		// 2. Обновляем на handler2
		root.render(React.createElement(App, { onClick: handler2 }))
		await new Promise(r => setTimeout(r, 10))

		// Кликаем снова
		btn.click()
		
		// Если старый обработчик НЕ удалился, счетчик стал бы 1 + 1 + 10 = 12
		// Если удалился успешно - счетчик станет 1 + 10 = 11
		expect(count).toBe(11) 
	})

	it('должен удалять элементы (DELETION) при уменьшении массива детей', async () => {
		function List(props: { items: string[] }) {
			return React.createElement(
				'ul',
				null,
				...props.items.map(text => React.createElement('li', null, text))
			)
		}

		const root = ReactDOM.createRoot(container)
		
		// 1. Рендерим 3 элемента
		root.render(React.createElement(List, { items: ['A', 'B', 'C'] }))
		await new Promise(r => setTimeout(r, 10))

		expect(container.querySelectorAll('li')).toHaveLength(3)

		// 2. Рендерим 1 элемент (уменьшаем массив)
		root.render(React.createElement(List, { items: ['A'] }))
		await new Promise(r => setTimeout(r, 10))

		// Проверяем, что лишние <li> стерты из DOM
		expect(container.querySelectorAll('li')).toHaveLength(1)
		expect(container.querySelector('li')?.textContent).toBe('A')
	})

	it('должен удалять вложенные функциональные компоненты (commitDeletion recursion)', async () => {
		function Nested() {
			return React.createElement('div', { className: 'nested' }, 'Inside Functional')
		}

		function Wrapper(props: { show: boolean }) {
			return React.createElement(
				'div',
				null,
				props.show ? React.createElement(Nested, null) : 'Empty'
			)
		}

		const root = ReactDOM.createRoot(container)
		
		// 1. Рендерим вложенный компонент
		root.render(React.createElement(Wrapper, { show: true }))
		await new Promise(r => setTimeout(r, 10))

		expect(container.querySelector('.nested')).not.toBeNull()

		// 2. Скрываем вложенный компонент (удаляем из Fiber)
		root.render(React.createElement(Wrapper, { show: false }))
		await new Promise(r => setTimeout(r, 10))

		// Доказывает, что `commitDeletion` заглянул внутрь <Nested /> и нашел <div> узлы!
		expect(container.querySelector('.nested')).toBeNull()
		expect(container.textContent).toBe('Empty')
	})
})
