// packages/react/src/ReactHooks.ts
import { wipFiber } from '../../react-reconciler/src/ReactWorkLoop'
import { devToolsBridge } from '../../shared/DevToolsBridge'


export function useState<T>(
	initial: T,
): [T, (action: T | ((prevState: T) => T)) => void] {
	// 1. Ищем старый хук (из предыдущего рендера)
	const oldHook =
		wipFiber?.alternate &&
		wipFiber.alternate.hooks &&
		wipFiber.alternate.hooks[wipFiber.hooks!.length]

	// 2. Инициализируем новый хук
	// Реиспользуем массив 'queue' от старого хука! Траектория ссылки остается живой,
	// и любые вызовы setState (даже из замыканий старого рендера) будут пушить в тот же массив.
	const hook = {
		tag: 'state' as const,
		state: oldHook ? oldHook.state : initial,
		queue: oldHook ? oldHook.queue : [] as any[], 
	}

	// 3. Применяем все отложенные действия к состоянию (если они есть)
	const actions = [...hook.queue]
	if (actions.length > 0) {
		const oldState = hook.state
		actions.forEach((action: any) => {
			hook.state = typeof action === 'function' ? action(hook.state) : action
		})
		const name = typeof wipFiber?.type === 'function' ? wipFiber.type.name : String(wipFiber?.type)
		devToolsBridge.log('State', name, `changed from ${JSON.stringify(oldState)} to ${JSON.stringify(hook.state)}`)
	}
	
	// Очищаем примененные действия
	hook.queue.length = 0

	// 4. Функция setState, которую мы возвращаем пользователю
	const setState = (action: any) => {
		// Кладем новое действие в очередь
		hook.queue.push(action)

		// САМОЕ ВАЖНОЕ: Сообщаем движку, что нужно начать новый рендер!
		// Мы берем текущее дерево (currentRoot) и назначаем его как Work In Progress
		import('../../react-reconciler/src/ReactWorkLoop').then(
			({ setNextUnitOfWork, currentRoot }) => {
				const newWipRoot = {
					dom: currentRoot!.dom,
					props: currentRoot!.props,
					alternate: currentRoot,
					type: 'ROOT',
				}
				setNextUnitOfWork(newWipRoot as any)
			},
		)
	}

	// 5. Сохраняем хук в текущий Fiber-узел и сдвигаем индекс
	wipFiber!.hooks!.push(hook)
	// Индекс увеличивается автоматически благодаря push в wipFiber.hooks

	return [hook.state, setState]
}

// ================================================================
// useEffect — Хук побочных эффектов
// ================================================================
// В реальном React эффекты выполняются ПОСЛЕ фазы Commit (после того как DOM обновлен).
// Это позволяет безопасно работать с DOM, делать fetch-запросы и подписываться на события.
//
// Алгоритм:
// 1. При вызове useEffect(callback, deps) мы сохраняем конфигурацию в массив hooks текущего Fiber.
// 2. После commitRoot движок проходит по всем Fiber-ам и сравнивает deps из текущего рендера
//    с deps из предыдущего рендера, используя Object.is() (поэлементно).
// 3. Если deps изменились (или это первый рендер) — вызываем callback.
// 4. Если callback вернул функцию (cleanup) — сохраняем её. Она будет вызвана
//    ПЕРЕД следующим выполнением эффекта или при размонтировании компонента.
//
// Пример:
//   useEffect(() => {
//     const id = setInterval(() => console.log('tick'), 1000)
//     return () => clearInterval(id) // cleanup — вызывается при unmount или при смене deps
//   }, [count])
//
export function useEffect(callback: () => void | (() => void), deps?: any[]) {
	// 1. Ищем старый хук (из предыдущего рендера)
	const oldHook =
		wipFiber?.alternate &&
		wipFiber.alternate.hooks &&
		wipFiber.alternate.hooks[wipFiber.hooks!.length]

	// 2. Определяем, изменились ли зависимости
	let changedDepIndex = -1
	const hasChanged = oldHook
		? !deps || !oldHook.deps || deps.some((dep: any, i: number) => {
				const changed = !Object.is(dep, oldHook.deps[i])
				if (changed && changedDepIndex === -1) changedDepIndex = i
				return changed
		  })
		: true // Первый рендер — всегда запускаем эффект

	if (hasChanged) {
		const name = typeof wipFiber?.type === 'function' ? wipFiber.type.name : String(wipFiber?.type)
		const reason = oldHook 
			? `fired because dependency index ${changedDepIndex} changed`
			: 'fired on mount'
		devToolsBridge.log('Effect', name, reason)
	}

	// 3. Создаём хук-запись
	const hook: any = {
		tag: 'effect' as const,
		effect: hasChanged ? callback : null,     // callback (или null если deps не изменились)
		cleanup: oldHook ? oldHook.cleanup : null, // cleanup-функция от предыдущего запуска
		deps,                                       // Текущие зависимости для сравнения в следующем рендере
	}

	// 4. Сохраняем в массив хуков текущего Fiber
	wipFiber!.hooks!.push(hook)
}

