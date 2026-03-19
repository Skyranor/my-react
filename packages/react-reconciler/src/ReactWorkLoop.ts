// packages/react-reconciler/src/ReactWorkLoop.ts
import { Fiber, ReactElement } from '../../shared/types'
import { commitRoot } from './ReactCommit'

// Глобальные переменные состояния нашего рендерера
let nextUnitOfWork: Fiber | null = null
let wipRoot: Fiber | null = null // Work In Progress Root

// Эта функция запускает процесс. Ее мы будем вызывать из react-dom
export function createWorkInProgressRoot(
	element: ReactElement,
	container: HTMLElement,
) {
	wipRoot = {
		dom: container,
		props: {
			children: [element],
		},
		parent: null,
		child: null,
		sibling: null,
		type: 'ROOT',
	}

	nextUnitOfWork = wipRoot
}

// Тот самый бесконечный цикл, который не блокирует браузер
function workLoop(deadline: IdleDeadline) {
	let shouldYield = false

	// Пока есть работа и браузер не просит вернуть управление
	while (nextUnitOfWork && !shouldYield) {
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
		shouldYield = deadline.timeRemaining() < 1
	}

	// Если мы закончили обходить дерево (nextUnitOfWork === null)
	// и у нас есть wipRoot, значит пришло время вставить всё в DOM!
	if (!nextUnitOfWork && wipRoot) {
		commitRoot(wipRoot)
		wipRoot = null // Очищаем ссылку, чтобы не отрендерить дважды
	}

	// Просим браузер снова вызвать workLoop, когда будет время
	requestIdleCallback(workLoop)
}

// Запускаем цикл (в настоящем React это сложнее, но суть та же)
requestIdleCallback(workLoop)

// Функция, которая выполняет 1 шаг работы и возвращает следующий узел
function performUnitOfWork(fiber: Fiber): Fiber | null {
	// 1. Проверяем тип компонента
	const isFunctionComponent = fiber.type instanceof Function

	if (isFunctionComponent) {
		updateFunctionComponent(fiber)
	} else {
		updateHostComponent(fiber)
	}

	// 2. Возвращаем следующий узел для работы (приоритет: ребенок -> брат -> дядя)
	if (fiber.child) {
		return fiber.child
	}
	let nextFiber: Fiber | null = fiber
	while (nextFiber) {
		if (nextFiber.sibling) {
			return nextFiber.sibling
		}
		nextFiber = nextFiber.parent
	}

	return null
}

// Обработка функциональных компонентов (<App />)
function updateFunctionComponent(fiber: Fiber) {
	// ВНИМАНИЕ: Здесь мы вызываем функцию! fiber.type — это функция компонента.
	// Мы передаем ей пропсы и получаем то, что она возвращает (JSX).
	const children = [(fiber.type as Function)(fiber.props)]

	// Передаем полученных детей на согласование (Reconciliation)
	reconcileChildren(fiber, children)
}

// Обработка обычных тегов (div, h1, text)
function updateHostComponent(fiber: Fiber) {
	if (!fiber.dom && fiber.type !== 'ROOT') {
		fiber.dom =
			fiber.type === 'TEXT_ELEMENT'
				? document.createTextNode('')
				: document.createElement(fiber.type as string)
	}

	const children = fiber.props.children || []
	reconcileChildren(fiber, children)
}

// Логика связывания Fiber-узлов (мы просто вынесли её из старого performUnitOfWork)
function reconcileChildren(wipFiber: Fiber, elements: any[]) {
	let prevSibling: Fiber | null = null

	for (let i = 0; i < elements.length; i++) {
		const element = elements[i]

		// Если функция вернула null или undefined, игнорируем
		if (!element) continue

		const newFiber: Fiber = {
			type: element.type,
			props: element.props,
			parent: wipFiber,
			dom: null, // Изначально DOM пуст
			child: null,
			sibling: null,
		}

		if (i === 0) {
			wipFiber.child = newFiber
		} else if (prevSibling) {
			prevSibling.sibling = newFiber
		}
		prevSibling = newFiber
	}
}
