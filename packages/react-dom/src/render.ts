// packages/react-dom/src/render.ts
import { ReactElement } from '../../shared/types'

export function render(element: ReactElement, container: HTMLElement | Text) {
	// 1. Создаем DOM-узел
	// Если это наш специальный текстовый элемент - создаем TextNode, иначе обычный HTML-тег
	const dom =
		element.type === 'TEXT_ELEMENT'
			? document.createTextNode('')
			: document.createElement(element.type as string)

	// 2. Переносим пропсы (атрибуты) из объекта в реальный DOM-узел
	// Игнорируем свойство 'children', так как это не HTML-атрибут
	const isProperty = (key: string) => key !== 'children'

	Object.keys(element.props)
		.filter(isProperty)
		.forEach(name => {
			// @ts-ignore - упрощаем типизацию для учебного проекта
			dom[name] = element.props[name]
		})

	// 3. Рекурсивно вызываем render для всех детей
	element.props.children.forEach(child => render(child, dom as HTMLElement))

	// 4. Вставляем готовый узел в контейнер на странице
	container.appendChild(dom)
}
