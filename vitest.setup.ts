import { vi } from 'vitest'

// --- ГЛОБАЛЬНЫЙ ПОЛИФИЛЛ ДЛЯ ТЕСТОВ ---
// В JSDom нет requestIdleCallback, а `ReactWorkLoop.ts` вызывает его сразу после импорта!
// Поэтому этот файл настроен как setupFile, который выполняется ДО импортов в тестах.

// @ts-ignore
globalThis.requestIdleCallback = vi.fn((cb) => {
	return setTimeout(() => {
		cb({
			timeRemaining: () => 50, // "Времени вагон"
			didTimeout: false,
		})
	}, 0)
})

// @ts-ignore
globalThis.cancelIdleCallback = vi.fn((id) => clearTimeout(id))
