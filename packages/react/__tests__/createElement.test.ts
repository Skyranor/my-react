import { describe, it, expect } from 'vitest'
import React from '../index'

describe('React.createElement', () => {
	it('должен создавать базовый элемент Virtual DOM', () => {
		// --- ТЕСТ (ДЛЯ СОБЕСЕДОВАНИЯ) ---
		// Проверяем, что JSX-тег превращается в обычный JS-объект (Virtual DOM)
		// Это доказывает, что React на этапе парсинга JSX ничего не рендерит в DOM!
		
		const element = React.createElement('div', { id: 'test-id', className: 'box' }, 'Hello World')

		expect(element).toEqual({
			type: 'div',
			props: {
				id: 'test-id',
				className: 'box',
				children: [
					{
						type: 'TEXT_ELEMENT',
						props: {
							nodeValue: 'Hello World',
							children: []
						}
					}
				]
			}
		})
	})

	it('должен корректно обрабатывать вложенные элементы', () => {
		const element = React.createElement(
			'div',
			null,
			React.createElement('h1', null, 'Title'),
			React.createElement('p', null, 'Text')
		)

		// Проверяем структуру дерева (рекурсивный проход)
		expect(element.props.children).toHaveLength(2)
		expect(element.props.children[0].type).toBe('h1')
		expect(element.props.children[1].type).toBe('p')
	})
})
