// packages/react-reconciler/src/ReactCommit.ts
import { Fiber } from '../../shared/types'

export function commitRoot(wipRoot: Fiber) {
	// Начинаем с первого ребенка (потому что сам wipRoot — это контейнер div#root, он уже в DOM)
	commitWork(wipRoot.child)
}

function commitWork(fiber: Fiber | null) {
	if (!fiber) {
		return
	}

	// 1. Находим ближайшего родителя, у которого есть реальный DOM-узел
	// (В будущем, когда добавим функциональные компоненты, у них не будет своего DOM-узла)
	let domParentFiber = fiber.parent
	while (!domParentFiber?.dom) {
		domParentFiber = domParentFiber?.parent || null
	}
	const domParent = domParentFiber.dom

	// 2. Если у текущего Fiber есть DOM-узел, добавляем его к родителю
	if (fiber.dom) {
		// Навешиваем пропсы (атрибуты, стили, обработчики)
		updateDom(fiber.dom, fiber.props)

		// Вставляем в реальный DOM
		domParent.appendChild(fiber.dom)
	}

	// 3. Рекурсивно идем по детям и соседям
	commitWork(fiber.child)
	commitWork(fiber.sibling)
}

// Вспомогательная функция для добавления пропсов
function updateDom(dom: HTMLElement | Text, props: Record<string, any>) {
	const isEvent = (key: string) => key.startsWith('on')
	const isProperty = (key: string) => key !== 'children' && !isEvent(key)

	// Добавляем события (например, onClick)
	Object.keys(props)
		.filter(isEvent)
		.forEach(name => {
			const eventType = name.toLowerCase().substring(2)
			dom.addEventListener(eventType, props[name])
		})

	// Добавляем обычные атрибуты (id, style, href и т.д.)
	Object.keys(props)
		.filter(isProperty)
		.forEach(name => {
			// @ts-ignore
			dom[name] = props[name]
		})
}
