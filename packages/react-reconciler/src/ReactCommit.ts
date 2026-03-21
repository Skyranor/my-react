import { Fiber } from '../../shared/types'
import { devToolsBridge } from '../../shared/DevToolsBridge'

// Вспомогательные функции для сравнения старых и новых пропсов
const isEvent = (key: string) => key.startsWith('on')
const isProperty = (key: string) => key !== 'children' && !isEvent(key)
const isNew =
	(prev: Record<string, any>, next: Record<string, any>) => (key: string) =>
		prev[key] !== next[key]
const isGone =
	(prev: Record<string, any>, next: Record<string, any>) => (key: string) =>
		!(key in next)

/**
 * ТОЧКА ВХОДА В ФАЗУ КОММИТА
 * Вызывается, когда построено всё wipRoot дерево.
 */
export function commitRoot(wipRoot: Fiber, deletions: Fiber[]) {
	devToolsBridge.log('Commit', 'ROOT', '--- COMMIT PHASE STARTED ---')

	// ШАГ 1: Удаляем узлы, которых больше нет (и чистим их эффекты)
	deletions.forEach(fiber => {
		const name = typeof fiber.type === 'function' ? fiber.type.name : String(fiber.type)
		devToolsBridge.log('Commit', name, 'Node marked for deletion')
		runCleanupEffects(fiber)
		commitWork(fiber)
	})

	// ШАГ 2: Рекурсивно коммитим новые и обновленные узлы
	commitWork(wipRoot.child)

	// ШАГ 3: Запускаем хуки useEffect (ПОСЛЕ того как DOM обновился)
	devToolsBridge.log('Effect', 'ROOT', 'Running effects after DOM mutations')
	commitEffects(wipRoot)

	devToolsBridge.log('Commit', 'ROOT', '--- COMMIT PHASE FINISHED ---')
}

/**
 * РЕКУРСИВНЫЙ ОБХОД ДЛЯ МУТАЦИИ DOM
 */
function commitWork(fiber: Fiber | null) {
	if (!fiber) {
		return
	}

	let domParentFiber = fiber.parent
	while (!domParentFiber?.dom) {
		domParentFiber = domParentFiber?.parent || null
	}
	const domParent = domParentFiber.dom

	const componentName = typeof fiber.type === 'function' ? fiber.type.name : String(fiber.type)

	if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
		devToolsBridge.log(
			'Commit',
			componentName,
			`Appended to DOM parent <${
				typeof domParentFiber.type === 'function'
					? domParentFiber.type.name
					: String(domParentFiber.type)
			}>`,
		)
		updateDom(fiber.dom, {}, fiber.props)
		domParent.appendChild(fiber.dom)
	} else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
		devToolsBridge.log('Commit', componentName, 'Updated DOM attributes')
		updateDom(fiber.dom, fiber.alternate?.props || {}, fiber.props)
	} else if (fiber.effectTag === 'DELETION') {
		devToolsBridge.log('Commit', componentName, 'Removed from DOM')
		commitDeletion(fiber, domParent)
		return
	}

	commitWork(fiber.child)
	commitWork(fiber.sibling)
}

/**
 * БЕЗОПАСНОЕ УДАЛЕНИЕ (Учитывает функциональные компоненты)
 */
function commitDeletion(fiber: Fiber, domParent: HTMLElement | Text) {
	if (fiber.dom) {
		// Если это обычный HTML-тег, просто удаляем его из родителя
		domParent.removeChild(fiber.dom)
	} else if (fiber.child) {
		// Если узел не имеет DOM (компонент или фрагмент), рекурсивно удаляем всех детей
		let child: Fiber | null = fiber.child
		while (child) {
			commitDeletion(child, domParent)
			child = child.sibling
		}
	}
}

/**
 * ЮВЕЛИРНОЕ ОБНОВЛЕНИЕ DOM (Diffing атрибутов)
 */
export function updateDom(
	dom: HTMLElement | Text,
	prevProps: Record<string, any>,
	nextProps: Record<string, any>,
) {
	// Шаг 1: Удаляем старые или изменившиеся слушатели событий
	Object.keys(prevProps)
		.filter(isEvent)
		.filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
		.forEach(name => {
			const eventType = name.toLowerCase().substring(2)
			// Обязательно удаляем старую функцию, иначе будет утечка памяти!
			dom.removeEventListener(eventType, prevProps[name])
		})

	// Шаг 2: Очищаем старые атрибуты (например, если раньше был style="color: red", а теперь его нет)
	Object.keys(prevProps)
		.filter(isProperty)
		.filter(isGone(prevProps, nextProps))
		.forEach(name => {
			// @ts-ignore
			dom[name] = ''
		})

	// Шаг 3: Добавляем новые или изменившиеся атрибуты
	Object.keys(nextProps)
		.filter(isProperty)
		.filter(isNew(prevProps, nextProps))
		.forEach(name => {
			// @ts-ignore
			dom[name] = nextProps[name]
		})

	// Шаг 4: Навешиваем новые слушатели событий
	Object.keys(nextProps)
		.filter(isEvent)
		.filter(isNew(prevProps, nextProps))
		.forEach(name => {
			const eventType = name.toLowerCase().substring(2)
			dom.addEventListener(eventType, nextProps[name])
		})
}

// --- СПЕЦИАЛЬНЫЕ ФУНКЦИИ ДЛЯ ИНТЕРАКТИВНОГО ДЕБАГГЕРА ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * ЗАМЕДЛЕННАЯ ФАЗА КОММИТА (Только для отладки в DevTools)
 */
export async function commitRootSlow(wipRoot: Fiber, deletions: Fiber[], currentRoot: Fiber | null) {
	devToolsBridge.log('Commit', 'ROOT', '--- SLOW COMMIT PHASE STARTED ---')
	const delay = devToolsBridge.getDelay()

	// 1. Медленно удаляем узлы
	for (const fiber of deletions) {
		const name = typeof fiber.type === 'function' ? fiber.type.name : String(fiber.type)
		devToolsBridge.log('Commit', name, 'Slow deletion')
		await commitWorkSlow(fiber, delay, currentRoot, wipRoot)
	}

	// 2. Медленно строим новое дерево
	await commitWorkSlow(wipRoot.child, delay, currentRoot, wipRoot)

	// 3. Эффекты запускаем синхронно в конце
	commitEffects(wipRoot)
	devToolsBridge.log('Commit', 'ROOT', '--- SLOW COMMIT PHASE FINISHED ---')
}

async function commitWorkSlow(fiber: Fiber | null, delay: number, currentRoot: Fiber | null, wipRoot: Fiber | null) {
	if (!fiber) return

	// Пауза / Шаг для Фазы Коммита
	while (devToolsBridge.isPaused() && !devToolsBridge.consumeStepRequest()) {
		await sleep(50)
	}

	let domParentFiber = fiber.parent
	while (!domParentFiber?.dom) {
		domParentFiber = domParentFiber?.parent || null
	}
	const domParent = domParentFiber.dom
	const componentName = typeof fiber.type === 'function' ? fiber.type.name : String(fiber.type)

	let didMutateDOM = false

	if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
		devToolsBridge.log('Commit', componentName, 'Appended to DOM')
		updateDom(fiber.dom, {}, fiber.props)
		domParent.appendChild(fiber.dom)
		didMutateDOM = true
	} else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
		devToolsBridge.log('Commit', componentName, 'Updated DOM attributes')
		updateDom(fiber.dom, fiber.alternate?.props || {}, fiber.props)
		didMutateDOM = true
	} else if (fiber.effectTag === 'DELETION') {
		devToolsBridge.log('Commit', componentName, 'Removed from DOM')
		commitDeletion(fiber, domParent)
		didMutateDOM = true
		
		devToolsBridge.notifyCommitStep(currentRoot, wipRoot, fiber)
		
		// Динамическая задержка реального времени
		let elapsed = 0
		const tick = 20
		while (elapsed < devToolsBridge.getDelay() && devToolsBridge.isSlowModeEnabled()) {
			await sleep(tick)
			elapsed += tick
		}
		return 
	}

	if (didMutateDOM) {
		devToolsBridge.notifyCommitStep(currentRoot, wipRoot, fiber)

		// Динамическая задержка реального времени
		let elapsedFooter = 0
		const tickFooter = 20
		while (elapsedFooter < devToolsBridge.getDelay() && devToolsBridge.isSlowModeEnabled()) {
			await sleep(tickFooter)
			elapsedFooter += tickFooter
		}
	}

	await commitWorkSlow(fiber.child, delay, currentRoot, wipRoot)
	await commitWorkSlow(fiber.sibling, delay, currentRoot, wipRoot)
}

// ================================================================
// ДВИЖОК useEffect — ВЫПОЛНЕНИЕ ПОБОЧНЫХ ЭФФЕКТОВ
// ================================================================
// В реальном React эффекты (useEffect) выполняются ПОСЛЕ фазы Commit,
// когда DOM уже обновлен. Это гарантирует, что эффекты видят актуальный DOM.
//
// Порядок вызова (точно как в React):
// 1. Все cleanup-функции от ПРЕДЫДУЩЕГО рендера (в порядке обхода дерева)
// 2. Все новые effect-функции текущего рендера (в порядке обхода дерева)

/**
 * ДВИЖОК ЭФФЕКТОВ (useEffect)
 */
function commitEffects(fiber: Fiber | null) {
	if (!fiber) return

	if (fiber.hooks) {
		const componentName = typeof fiber.type === 'function' ? fiber.type.name : String(fiber.type)
		
		fiber.hooks.forEach((hook: any) => {
			if (hook.tag === 'effect' && hook.effect) {
				if (hook.cleanup && typeof hook.cleanup === 'function') {
					devToolsBridge.log('Effect', componentName, 'Cleanup executed (deps changed)')
					hook.cleanup()
				}

				devToolsBridge.log('Effect', componentName, 'Effect executed')
				const cleanup = hook.effect()
				hook.cleanup = typeof cleanup === 'function' ? cleanup : null
			}
		})
	}

	// Рекурсивно идем по дереву
	commitEffects(fiber.child)
	commitEffects(fiber.sibling)
}

// Вызываем cleanup для ВСЕХ эффектов при удалении компонента (unmount)
function runCleanupEffects(fiber: Fiber | null) {
	if (!fiber) return

	if (fiber.hooks) {
		const componentName = typeof fiber.type === 'function' ? fiber.type.name : String(fiber.type)
		fiber.hooks.forEach((hook: any) => {
			if (hook.tag === 'effect' && hook.cleanup && typeof hook.cleanup === 'function') {
				devToolsBridge.log('Effect', componentName, 'Unmount cleanup executed')
				hook.cleanup()
			}
		})
	}

	runCleanupEffects(fiber.child)
	runCleanupEffects(fiber.sibling)
}
