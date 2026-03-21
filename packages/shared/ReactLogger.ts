// ================================================================
// ReactLogger — Централизованная система логирования
// ================================================================
//
// Архитектура:
//   Вместо разбросанных console.log по всему коду, все логи проходят
//   через единую точку. Это позволяет:
//   1. Включать/выключать логи глобально или по категориям
//   2. Менять уровень детализации в рантайме (через DevTools)
//   3. Не замусоривать продакшн-консоль
//
// Использование:
//   import { log } from '../../shared/ReactLogger'
//   log.render('Обработка: <div>')
//   log.commit('Добавление в DOM: <div>')
//   log.effect('Cleanup: <Header>')
//
// Управление из консоли браузера:
//   __REACT_LOG__.enable('render')   — включить категорию
//   __REACT_LOG__.disable('commit')  — выключить категорию
//   __REACT_LOG__.enableAll()        — включить всё
//   __REACT_LOG__.disableAll()       — выключить всё (по умолчанию)
//   __REACT_LOG__.level = 'verbose'  — уровень: 'off' | 'minimal' | 'verbose'
//

export type LogLevel = 'off' | 'minimal' | 'verbose'
export type LogCategory = 'render' | 'diffing' | 'commit' | 'effect' | 'profiler'

interface LogConfig {
	level: LogLevel
	categories: Record<LogCategory, boolean>
	enable: (cat: LogCategory) => void
	disable: (cat: LogCategory) => void
	enableAll: () => void
	disableAll: () => void
}

// Конфигурация — по умолчанию ВСЁ выключено (чистая консоль)
const config: LogConfig = {
	level: 'off',
	categories: {
		render: false,
		diffing: false,
		commit: false,
		effect: false,
		profiler: false,
	},
	enable(cat: LogCategory) {
		this.categories[cat] = true
		if (this.level === 'off') this.level = 'minimal'
		console.log(`%c[ReactLogger] ✅ Категория "${cat}" включена`, 'color: #4CAF50;')
	},
	disable(cat: LogCategory) {
		this.categories[cat] = false
		console.log(`%c[ReactLogger] ❌ Категория "${cat}" выключена`, 'color: #F44336;')
	},
	enableAll() {
		Object.keys(this.categories).forEach(k => (this.categories as any)[k] = true)
		this.level = 'verbose'
		console.log('%c[ReactLogger] ✅ Все категории включены (verbose mode)', 'color: #4CAF50; font-weight: bold;')
	},
	disableAll() {
		Object.keys(this.categories).forEach(k => (this.categories as any)[k] = false)
		this.level = 'off'
		console.log('%c[ReactLogger] 🔇 Все логи выключены', 'color: #888;')
	},
}

// Выносим в window для управления из DevTools
if (typeof window !== 'undefined') {
	;(window as any).__REACT_LOG__ = config
}

// --- Внутренняя функция вывода ---
function emit(category: LogCategory, message: string, style: string) {
	if (config.level === 'off') return
	if (!config.categories[category]) return
	console.log(`%c${message}`, style)
}

function emitVerbose(category: LogCategory, message: string, style: string) {
	if (config.level !== 'verbose') return
	if (!config.categories[category]) return
	console.log(`%c${message}`, style)
}

// --- Публичный API ---
export const log = {
	// Render Phase
	render(nodeName: string) {
		emit('render', `[Render] 🌳 Обработка: ${nodeName}`, 'color: #4CAF50; font-weight: bold;')
	},

	// Diffing (Reconciliation) — только в verbose
	diffUpdate(type: string) {
		emitVerbose('diffing', `  [Diffing] 🔄 Обновление: ${type}`, 'color: #888;')
	},
	diffPlace(type: string) {
		emitVerbose('diffing', `  [Diffing] ➕ Размещение: ${type}`, 'color: #888;')
	},
	diffDelete(type: string) {
		emitVerbose('diffing', `  [Diffing] ❌ Удаление: ${type}`, 'color: #888;')
	},

	// Commit Phase
	commitStart() {
		emit('commit', '[Commit] 🚀 Начало фазы Commit', 'color: #2196F3; font-weight: bold; font-size: 11px;')
	},
	commitStartSlow() {
		emit('commit', '[Commit] 🐌 Начало фазы Commit (SLOW MOTION)', 'color: #E91E63; font-weight: bold; font-size: 11px;')
	},
	commitPlace(type: any) {
		emitVerbose('commit', `  [Commit] ➕ Добавление в DOM: <${type}>`, 'color: #90CAF9;')
	},
	commitUpdate(type: any) {
		emitVerbose('commit', `  [Commit] 🔄 Обновление DOM: <${type}>`, 'color: #90CAF9;')
	},
	commitDelete(type: any) {
		emitVerbose('commit', `  [Commit] ❌ Удаление из DOM: <${type}>`, 'color: #90CAF9;')
	},

	// Effects
	effectCleanup(componentName: string) {
		emit('effect', `  [Effect] 🧹 Cleanup: <${componentName}>`, 'color: #FF9800;')
	},
	effectRun(componentName: string) {
		emit('effect', `  [Effect] ⚡ Запуск: <${componentName}>`, 'color: #E040FB;')
	},
	effectUnmount(componentName: string) {
		emit('effect', `  [Effect] 🗑️ Unmount cleanup: <${componentName}>`, 'color: #F44336;')
	},

	// Profiler
	profilerCommit(id: number, type: string, renderTime: number, commitTime: number, totalTime: number) {
		emit('profiler', `[Profiler] ⏱️ Commit #${id} (${type}): Render ${renderTime}ms | Commit ${commitTime}ms | Total ${totalTime}ms`, 'color: #00BCD4; font-weight: bold;')
	},
}
