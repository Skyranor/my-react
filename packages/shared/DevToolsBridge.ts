// DevToolsBridge.ts
import { Fiber } from './types'

export type LogCategory = 'Render' | 'State' | 'Effect' | 'Commit' | 'Warning'

export interface LogEntry {
	id: number
	timestamp: string
	category: LogCategory
	componentName: string
	message: string
}

class DevToolsBridge {
	private slowMode = false
	private slowDelay = 500
	private paused = false
	private stepRequested = false
	private profilerData: any[] = []

	// 1. Конфигурация логов
	private logConfig: Record<LogCategory, boolean> = {
		Render: false, 
		State: false,
		Effect: false,
		Commit: false,
		Warning: false,
	}

	private logsHistory: LogEntry[] = []
	private logCounter = 0

	// Callbacks, которые зарегистрирует FiberInspector UI
	public onRenderTree?: (
		current: Fiber | null,
		wip: Fiber | null,
		active: Fiber | null,
		phase: string,
	) => void
	public onProfilerUpdate?: (data: any[]) => void
	public onLogUpdate?: (logs: LogEntry[]) => void
	public onResume?: () => void

	// 2. Управление конфигурацией из UI
	public setLogCategory(category: LogCategory, isEnabled: boolean) {
		this.logConfig[category] = isEnabled
	}

	public isLogEnabled(category: LogCategory): boolean {
		return this.logConfig[category]
	}

	public clearLogs() {
		this.logsHistory = []
		if (this.onLogUpdate) this.onLogUpdate(this.logsHistory)
	}

	// 3. Метод логирования
	public log(category: LogCategory, componentName: string, message: string) {
		if (!this.logConfig[category]) return

		const entry: LogEntry = {
			id: ++this.logCounter,
			timestamp: new Date().toLocaleTimeString([], {
				hour12: false,
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			}),
			category,
			componentName,
			message,
		}

		this.logsHistory.unshift(entry) // Добавляем в начало

		if (this.logsHistory.length > 500) this.logsHistory.pop()

		if (this.onLogUpdate) this.onLogUpdate(this.logsHistory)
	}

	public setSlowMode(enabled: boolean) {
		this.slowMode = enabled
	}
	public isSlowModeEnabled() {
		return this.slowMode
	}
	public getDelay() {
		return this.slowDelay
	}
	public setDelay(ms: number) {
		this.slowDelay = ms
	}
	public togglePause() {
		this.paused = !this.paused
		if (!this.paused && this.onResume) {
			this.onResume()
		}
	}
	public isPaused() {
		return this.paused
	}
	public requestStep() {
		if (this.paused) {
			this.stepRequested = true
			if (this.onResume) this.onResume()
		}
	}
	public consumeStepRequest(): boolean {
		if (this.stepRequested) {
			this.stepRequested = false
			return true
		}
		return false
	}

	public notifyCommitStep(current: Fiber | null, wip: Fiber | null, activeFiber: Fiber | null) {
		if (this.onRenderTree) {
			this.onRenderTree(current, wip, activeFiber, 'COMMIT (Slow)')
		}
	}

	public recordProfilerEntry(type: string, totalTime: number) {
		const entry = {
			id: this.profilerData.length + 1,
			type,
			totalTime: +totalTime.toFixed(2),
			timestamp: new Date().toLocaleTimeString(),
		}
		this.profilerData.push(entry)
		if (this.onProfilerUpdate) this.onProfilerUpdate(this.profilerData)
	}

	// Хуки жизненного цикла для отрисовки графики
	public notifyRenderStep(
		current: Fiber | null,
		wip: Fiber | null,
		active: Fiber | null,
	) {
		if (this.onRenderTree) this.onRenderTree(current, wip, active, 'RENDER')
	}

	public notifyCommitPrep(current: Fiber | null, wip: Fiber | null) {
		if (this.onRenderTree) this.onRenderTree(current, wip, null, 'COMMIT PREP')
	}

	public notifyIdle(current: Fiber | null) {
		if (this.onRenderTree) this.onRenderTree(current, null, null, 'IDLE')
	}
}

export const devToolsBridge = new DevToolsBridge()
