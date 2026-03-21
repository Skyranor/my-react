// src/core/Core.ts

import { devToolsBridge } from '../../shared/DevToolsBridge'
import { Fiber, ReactElement } from '../../shared/types'
import { commitRoot, commitRootSlow } from './ReactCommit'

// --- ВНУТРЕННЕЕ СОСТОЯНИЕ ДВИЖКА ---
let nextUnitOfWork: Fiber | null = null
let wipRoot: Fiber | null = null // Work-in-Progress дерево (собирается в памяти)
let deletions: Fiber[] = [] // Очередь узлов на удаление
let isCommitting = false // Флаг предотвращения повторного коммита на Resume

// Экспортируем для хуков (useState, useEffect)
export let currentRoot: Fiber | null = null // Текущее дерево, отображаемое на экране
export let wipFiber: Fiber | null = null // Компонент, который рендерится прямо сейчас

/**
 * Инициализация первичного рендера (Mount)
 */
export function createWorkInProgressRoot(
	element: ReactElement,
	container: HTMLElement,
) {
	wipRoot = {
		dom: container,
		props: { children: [element] },
		alternate: currentRoot,
		parent: null,
		child: null,
		sibling: null,
		type: 'ROOT',
	}
	deletions = []
	nextUnitOfWork = wipRoot

	// Сообщаем инспектору, что мы начали строить новое дерево
	devToolsBridge.notifyRenderStep(currentRoot, wipRoot, nextUnitOfWork)
}

/**
 * Планирование ре-рендера (Update), вызывается из setState
 */
export function setNextUnitOfWork(fiber: Fiber) {
	// Защита: если включен Slow Mode и рендер уже идет, игнорируем новые апдейты
	if (devToolsBridge.isSlowModeEnabled() && nextUnitOfWork) {
		console.warn('[React] Update skipped due to Slow Mode rendering')
		return
	}

	wipRoot = fiber
	nextUnitOfWork = fiber
	deletions = []

	devToolsBridge.notifyRenderStep(currentRoot, wipRoot, nextUnitOfWork)
}

// --- КОНКУРЕНТНЫЙ ЦИКЛ (CONCURRENT LOOP) ---

function workLoop(deadline: IdleDeadline) {
	const isSlowMode = devToolsBridge.isSlowModeEnabled()
	let shouldYield = false

	// ФАЗА 1: РЕНДЕР (Pre-commit). Можно прервать, если браузеру нужно отрисовать кадр.
	while (nextUnitOfWork && !shouldYield) {
		const isPaused = devToolsBridge.isPaused()
		const hasStep = devToolsBridge.consumeStepRequest()

		if (isPaused && !hasStep) {
			break // Прерываем цикл, если на паузе и нет запроса шага
		}

		nextUnitOfWork = performUnitOfWork(nextUnitOfWork)

		if (isSlowMode) {
			devToolsBridge.notifyRenderStep(currentRoot, wipRoot, nextUnitOfWork)
			
			// Динамическая задержка реального времени
			let elapsed = 0
			const tick = 20 // Шаг проверки 20мс
			const timer = setInterval(() => {
				elapsed += tick
				const currentDelay = devToolsBridge.getDelay()
				if (elapsed >= currentDelay || !devToolsBridge.isSlowModeEnabled()) {
					clearInterval(timer)
					requestIdleCallback(workLoop)
				}
			}, tick)
			return
		}

		// В обычном режиме прерываемся только если закончилось свободное время (< 1ms)
		shouldYield = deadline.timeRemaining() < 1
	}

	// ФАЗА 2: КОММИТ (Sync). Дерево построено, переносим изменения в DOM.
	if (!nextUnitOfWork && wipRoot && !isCommitting) {
		isCommitting = true
		devToolsBridge.notifyCommitPrep(currentRoot, wipRoot) // Сигнал инспектору: "Готовлюсь к коммиту"

		if (isSlowMode) {
			// Даем пользователю посмотреть на готовое WIP-дерево перед мутацией DOM
			setTimeout(() => executeCommitPhase(), devToolsBridge.getDelay())
		} else {
			executeCommitPhase() // В проде коммитим моментально
		}
		return
	}

	// Ждем следующего свободного окна браузера
	if (!devToolsBridge.isPaused()) {
		requestIdleCallback(workLoop)
	}
}

devToolsBridge.onResume = () => {
	requestIdleCallback(workLoop)
}

// Запускаем бесконечный цикл прослушивания задач
requestIdleCallback(workLoop)

/**
 * Изолированная фаза коммита с замером производительности для Профайлера
 */
function executeCommitPhase() {
	const isSlowMode = devToolsBridge.isSlowModeEnabled()
	const t0 = performance.now()

	if (isSlowMode) {
		// АСИНХРОННЫЙ КОММИТ (Для визуализации в Slow Motion)
		commitRootSlow(wipRoot!, deletions, currentRoot).then(() => {
			finishCommitPhase(performance.now() - t0, 'Slow Update')
		})
	} else {
		// СИНХРОННЫЙ КОММИТ (Стандартный режим)
		commitRoot(wipRoot!, deletions)
		finishCommitPhase(performance.now() - t0, currentRoot ? 'Update' : 'Mount')
	}
}

function finishCommitPhase(commitTime: number, type: string) {
	devToolsBridge.recordProfilerEntry(type, commitTime)

	currentRoot = wipRoot
	wipRoot = null
	deletions = []
	isCommitting = false // Сбрасываем флаг

	devToolsBridge.notifyIdle(currentRoot)
	requestIdleCallback(workLoop)
}

// --- АЛГОРИТМ ОБХОДА И СОГЛАСОВАНИЯ (RECONCILIATION) ---

function performUnitOfWork(fiber: Fiber): Fiber | null {
	const isFunctionComponent = fiber.type instanceof Function

	if (isFunctionComponent) {
		updateFunctionComponent(fiber)
	} else {
		updateHostComponent(fiber)
	}

	// Поиск следующего узла: сначала ребенок, потом брат, потом брат родителя (дядя)
	if (fiber.child) return fiber.child

	let nextFiber: Fiber | null = fiber
	while (nextFiber) {
		if (nextFiber.sibling) return nextFiber.sibling
		nextFiber = nextFiber.parent
	}
	return null
}

function hasPropsChanged(props1: any, props2: any) {
	if (props1 === props2) return false
	if (!props1 || !props2) return true
	const keys1 = Object.keys(props1).filter(k => k !== 'children')
	const keys2 = Object.keys(props2).filter(k => k !== 'children')
	if (keys1.length !== keys2.length) return true
	return !keys1.every(k => props1[k] === props2[k])
}

function hasScheduledUpdates(fiber: Fiber) {
	const oldFiber = fiber.alternate
	if (!oldFiber || !oldFiber.hooks) return false
	return oldFiber.hooks.some((h: any) => h.tag === 'state' && h.queue && h.queue.length > 0)
}

function cloneChildFibers(wipFiber: Fiber) {
	const current = wipFiber.alternate
	if (!current || !current.child) return
	
	let oldChild: Fiber | null = current.child
	let prevChild: Fiber | null = null
	
	while (oldChild) {
		const newChild: Fiber = {
			type: oldChild.type,
			props: oldChild.props,
			dom: oldChild.dom,
			parent: wipFiber,
			alternate: oldChild,
			child: null,
			sibling: null,
			hooks: oldChild.hooks ? oldChild.hooks.map((h: any) => h.tag === 'effect' ? { ...h, effect: null } : h) : [],
			renderCount: oldChild.renderCount,
			skippedCount: oldChild.skippedCount,
			wasSkipped: oldChild.wasSkipped,
		}
		
		if (!prevChild) {
			wipFiber.child = newChild
		} else {
			prevChild.sibling = newChild
		}
		
		prevChild = newChild
		oldChild = oldChild.sibling
	}
}

function updateFunctionComponent(fiber: Fiber) {
	const oldFiber = fiber.alternate
	if (oldFiber) {
		const propsChanged = hasPropsChanged(fiber.props, oldFiber.props)
		const stateChanged = hasScheduledUpdates(fiber)
		
		if (!propsChanged && !stateChanged) {
			const name = typeof fiber.type === 'function' ? (fiber.type as any).name : String(fiber.type)
			devToolsBridge.log('Render', name, 'Skipped render (props & state unchanged)')
			fiber.hooks = oldFiber.hooks
			fiber.effectTag = undefined
			fiber.wasSkipped = true
			fiber.skippedCount = (oldFiber.skippedCount || 0) + 1 // Инкремент пропусков
			fiber.renderCount = oldFiber.renderCount // Сохраняем запуски
			cloneChildFibers(fiber)
			return
		}
	}

	wipFiber = fiber
	wipFiber.hooks = []

	// Инкремент счетчика рендеров (только при реальном запуске)
	fiber.renderCount = (oldFiber?.renderCount || 0) + 1
	fiber.skippedCount = oldFiber?.skippedCount // Сохраняем пропуски

	// Вызов компонента: здесь выполнятся все useState/useEffect внутри функции
	const children = [(fiber.type as Function)(fiber.props)]
	reconcileChildren(fiber, children.flat())
}

function updateHostComponent(fiber: Fiber) {
	if (!fiber.dom && fiber.type !== 'ROOT' && fiber.type !== 'FRAGMENT') {
		fiber.dom =
			fiber.type === 'TEXT_ELEMENT'
				? document.createTextNode('')
				: document.createElement(fiber.type as string)
	}

	const children = fiber.props.children || []
	reconcileChildren(fiber, children.flat())
}

function reconcileChildren(wipFiber: Fiber, elements: any[]) {
	// 1. Собираем старые фиберы в Map по ключу (или индексу как fallback)
	const oldFibers = new Map<string | number, Fiber>()
	let oldFiber = wipFiber.alternate?.child || null
	let oldIndex = 0

	while (oldFiber) {
		const key = oldFiber.props?.key !== undefined ? oldFiber.props.key : oldIndex
		oldFibers.set(key, oldFiber)
		oldFiber = oldFiber.sibling
		oldIndex++
	}

	let prevSibling: Fiber | null = null
	let isFirstChild = true

	// 2. Идем по новым элементам и сопоставляем их со старым деревом
	for (let index = 0; index < elements.length; index++) {
		const element = elements[index]
		if (!element) continue // Пропускаем null, false (условный рендеринг)

		const key = element.props?.key !== undefined ? element.props.key : index
		const matchedFiber = oldFibers.get(key)
		const sameType = matchedFiber && element.type === matchedFiber.type

		let newFiber: Fiber | null = null

		if (sameType) {
			// UPDATE: переиспользуем старый Fiber и его State (через alternate)
			oldFibers.delete(key) // Убираем из словаря, т.к. найден
			newFiber = {
				type: matchedFiber!.type,
				props: element.props,
				dom: matchedFiber!.dom,
				parent: wipFiber,
				alternate: matchedFiber,
				child: null,
				sibling: null,
				effectTag: 'UPDATE',
			}
		} else {
			// PLACEMENT: Создаем новый узел
			newFiber = {
				type: element.type,
				props: element.props,
				dom: null,
				parent: wipFiber,
				alternate: null,
				child: null,
				sibling: null,
				effectTag: 'PLACEMENT',
			}
		}

		// Выстраиваем связи parent -> child и sibling -> sibling
		if (isFirstChild) {
			wipFiber.child = newFiber
			isFirstChild = false
		} else if (prevSibling) {
			prevSibling.sibling = newFiber
		}

		prevSibling = newFiber
	}

	// 3. Фиберы, которые остались в Map (нет совпадений) -> удаляем из DOM
	for (const oldFiberToDelete of oldFibers.values()) {
		oldFiberToDelete.effectTag = 'DELETION'
		deletions.push(oldFiberToDelete)
	}
}
