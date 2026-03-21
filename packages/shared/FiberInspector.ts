// src/dev-tools/FiberInspector.ts

import { Fiber } from '../shared/types'
import { devToolsBridge, LogCategory, LogEntry } from './DevToolsBridge'

/**
 * Главный класс UI Инспектора.
 * Инкапсулирует состояние, стили (через Shadow DOM) и логику рендеринга.
 */
class InspectorUI {
	private container: HTMLElement | null = null
	private shadowRoot: ShadowRoot | null = null

	// Внутреннее состояние DevTools
	private activeTab: 'trees' | 'profiler' | 'logs' | 'docs' = 'trees'
	private searchQuery: string = ''
	private collapsedNodes: Set<string> = new Set()
	private renderCounts: Map<string, number> = new Map()
	private skippedCounts: Map<string, number> = new Map()

	// Маппинг для стабильных ID нод
	private fiberIds: Map<Fiber, number> = new Map()
	private nextId: number = 1

	private getFiberId(fiber: Fiber | null): string {
		if (!fiber) return 'none'
		if (!this.fiberIds.has(fiber)) {
			this.fiberIds.set(fiber, this.nextId++)
		}
		return `#${this.fiberIds.get(fiber)}`
	}

	// Кешированные ссылки на DOM-элементы внутри Shadow DOM
	private refs = {
		treesPanel: null as HTMLElement | null,
		currentTreeRoot: null as HTMLElement | null,
		wipTreeRoot: null as HTMLElement | null,
		profilerPanel: null as HTMLElement | null,
		logsPanel: null as HTMLElement | null,
		docsPanel: null as HTMLElement | null,
		statusBadge: null as HTMLElement | null,
		highlighter: null as HTMLElement | null,
	}
	private lastRenderState = {
		currentRoot: null as any,
		wipRoot: null as any,
		activeFiber: null as any,
		phase: 'IDLE',
	}
	private lastProfilerData: any[] = []
	private lastLogsData: any[] = []

	/**
	 * Инициализация UI. Вызывается один раз при старте приложения.
	 */
	public mount() {
		if (
			typeof window === 'undefined' ||
			document.getElementById('react-dev-tools-root')
		)
			return

		// 1. Создаем хост-элемент и привязываем Shadow DOM
		this.container = document.createElement('div')
		this.container.id = 'react-dev-tools-root'
		// Защита от z-index войн с основным приложением
		this.container.style.cssText =
			'position: fixed; top: 0; right: 0; z-index: 2147483647; pointer-events: none;'

		this.shadowRoot = this.container.attachShadow({ mode: 'open' })

		// 2. Инжектируем изолированные стили (Дизайн в стиле React Team / Dan Abramov)
		const style = document.createElement('style')
		style.textContent = `
      :host {
        --bg-main: #282c34;
        --bg-header: #20232a;
        --bg-panel: #21252b;
        --border: #3e4451;
        --text-main: #abb2bf;
        --text-muted: #5c6370;
        --accent: #61dafb;
        --accent-hover: #4fa8c7;
        --success: #98c379;
        --warning: #e5c07b;
        --danger: #e06c75;
        --hook-effect: #c678dd;
        --hook-state: #d19a66;
        
        all: initial; /* Сбрасываем все унаследованные стили страницы */
        font-family: 'Fira Code', 'Courier New', monospace;
        font-size: 12px;
      }
      .panel {
        position: fixed; bottom: 0; right: 0;
        width: 45vw; height: 100vh;
        background: var(--bg-main); color: var(--text-main);
        display: flex; flex-direction: column;
        border-left: 1px solid var(--border);
        box-shadow: -10px 0 30px rgba(0,0,0,0.5);
        pointer-events: auto;
      }
      .header {
        background: rgba(18, 20, 24, 0.95);
        backdrop-filter: blur(20px);
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 2;
        position: sticky; top: 0;
      }
      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.02);
      }
      .header-bottom {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 0 20px;
        background: rgba(0, 0, 0, 0.15);
        height: 0; opacity: 0; overflow: hidden;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        border-top: 1px solid transparent;
      }
      .header-bottom.visible {
        height: 38px;
        opacity: 1;
        border-top-color: rgba(255, 255, 255, 0.02);
      }

      .header-logo {
        display: flex; align-items: center; gap: 8px;
        font-size: 14px; font-weight: 800;
        letter-spacing: 0.5px;
        flex: 1;
      }
      .logo-icon { font-size: 16px; }
      .logo-text {
        background: linear-gradient(135deg, #61dafb 0%, #c678dd 50%, #e06c75 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        font-weight: bold;
      }
      
      .tabs { 
        display: flex; gap: 4px; 
        background: rgba(0, 0, 0, 0.2); 
        padding: 4px; border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.03);
      }
      .tabs button {
        background: transparent; border: none;
        color: #7f848e; padding: 5px 14px; border-radius: 6px;
        cursor: pointer; font-family: inherit; font-size: 11px;
        font-weight: 600;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .tabs button:hover:not(.active) {
        color: var(--text-main);
        background: rgba(255, 255, 255, 0.04);
      }
      .tabs button.active {
        background: var(--accent); color: #1c1e22;
        box-shadow: 0 4px 10px rgba(97, 218, 251, 0.25);
        transform: translateY(-1px);
        font-weight: bold;
      }

      .header-actions {
        display: flex; align-items: center; gap: 12px;
        flex: 1;
        justify-content: flex-end;
      }

      /* Custom iOS-style Switch */
      .toggle-switch {
        display: flex; align-items: center; gap: 8px; cursor: pointer;
        background: rgba(229, 192, 123, 0.04); 
        padding: 4px 10px; border-radius: 6px;
        border: 1px solid rgba(229, 192, 123, 0.12);
        transition: all 0.2s ease;
      }
      .toggle-switch:hover { background: rgba(229, 192, 123, 0.08); }
      .toggle-track {
        width: 26px; height: 13px; background: #3e4451;
        border-radius: 7px; position: relative;
        transition: background 0.3s;
      }
      .toggle-knob {
        width: 9px; height: 9px; background: #fff;
        border-radius: 50%; position: absolute; top: 2px; left: 2px;
        transition: transform 0.3s;
      }
      input[type="checkbox"] { display: none; }
      input[type="checkbox"]:checked + .toggle-track { background: var(--warning); }
      input[type="checkbox"]:checked + .toggle-track .toggle-knob { transform: translateX(13px); }

      #slow-delay-slider {
        -webkit-appearance: none;
        background: #3e4451;
        outline: none;
        border-radius: 2px;
        height: 3px;
      }
      #slow-delay-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 10px; height: 10px;
        border-radius: 50%;
        background: var(--warning);
        cursor: pointer;
      }
      
      .content-area { display: flex; flex: 1; overflow: hidden; min-height: 0; }
      .split-pane { flex: 1; padding: 16px; overflow-y: auto; }
      .split-pane:first-child { border-right: 1px solid var(--border); }
      .wip-pane { background: rgba(33, 37, 43, 0.5); }

      /* Side Drawer для инспектора */
      .side-drawer {
        position: absolute; top: 0; right: 0; bottom: 0;
        width: 300px; background: rgba(33, 37, 43, 0.98);
        border-left: 1px solid var(--border);
        box-shadow: -5px 0 15px rgba(0,0,0,0.4);
        display: flex; flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 5;
        backdrop-filter: blur(10px);
      }
      .side-drawer.open { transform: translateX(0); }
      .drawer-header {
        padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);
        display: flex; justify-content: space-between; align-items: center;
        background: rgba(0,0,0,0.15);
      }
      .drawer-content {
        padding: 16px; overflow-y: auto; flex: 1;
        display: flex; flex-direction: column; gap: 12px;
      }
      
      .status-badge {
        padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 10px;
        text-transform: uppercase; background: var(--bg-panel); border: 1px solid var(--border);
      }
      .status-IDLE { color: var(--success); }
      .status-RENDER { color: var(--warning); animation: pulse 1.5s infinite; }
      .status-COMMIT { color: var(--danger); }
      
      .search-bar {
        width: 100%; box-sizing: border-box; background: var(--bg-panel);
        border: 1px solid var(--border); color: var(--text-main);
        padding: 6px 10px; border-radius: 4px; margin-bottom: 12px; outline: none;
      }
      .search-bar:focus { border-color: var(--accent); }
      
      ul { list-style: none; padding: 0; margin: 0; }
      
      /* Направляющие линии дерева */
      ul ul {
        margin-left: 12px;
        padding-left: 4px;
        border-left: 1px dashed rgba(255, 255, 255, 0.08);
      }

      .fiber-node {
        display: flex; align-items: center; gap: 6px; padding: 3px 6px;
        border-left: 2px solid transparent; cursor: default;
        transition: background 0.15s ease;
      }
      .fiber-node:hover { background: rgba(255,255,255,0.04); }
      .fiber-active { 
        background: rgba(229, 192, 123, 0.15); 
        color: #fff;
        border-left: 3px solid var(--warning) !important; 
        border-radius: 2px;
      }
      
      .tag-bracket { color: var(--text-muted); }
      .tag-name-fn { color: var(--accent); font-weight: bold; }
      .tag-name-host { color: var(--success); }
      .tag-name-text { color: var(--text-muted); }
      
      .prop-key { color: var(--warning); font-size: 11px; }
      .prop-val { color: var(--danger); font-size: 11px; }
      
      /* Дополнительные стили для логов */
      /* Дополнительные стили для логов */
      .log-controls {
        display: flex; gap: 6px; padding: 10px 16px; 
        background: rgba(0, 0, 0, 0.15);
        border-bottom: 1px solid rgba(255, 255, 255, 0.03); 
        flex-wrap: wrap; align-items: center;
      }
      .log-checkbox {
        display: inline-flex; align-items: center; cursor: pointer;
      }
      .log-checkbox input { display: none; }
      .log-checkbox span {
        padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700;
        letter-spacing: 0.3px; text-transform: uppercase;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.04);
        color: #a0aab8;
      }
      .log-checkbox:hover span {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-main);
      }
      
      /* Цвета при :checked */
      #log-toggle-State:checked + span { background: rgba(209, 154, 102, 0.12); color: var(--hook-state); border-color: rgba(209, 154, 102, 0.3); }
      #log-toggle-Effect:checked + span { background: rgba(198, 120, 221, 0.12); color: var(--hook-effect); border-color: rgba(198, 120, 221, 0.3); }
      #log-toggle-Render:checked + span { background: rgba(97, 218, 251, 0.12); color: var(--accent); border-color: rgba(97, 218, 251, 0.3); }
      #log-toggle-Commit:checked + span { background: rgba(152, 195, 121, 0.12); color: var(--success); border-color: rgba(152, 195, 121, 0.3); }
      #log-toggle-Warning:checked + span { background: rgba(224, 108, 117, 0.12); color: var(--danger); border-color: rgba(224, 108, 117, 0.3); }

      #log-clear-btn {
        margin-left: auto; padding: 4px 12px; border-radius: 12px; font-size: 10px; 
        font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; 
        cursor: pointer; background: rgba(224, 108, 117, 0.04); 
        border: 1px solid rgba(224, 108, 117, 0.15); color: var(--danger); 
        transition: all 0.2s ease;
      }
      #log-clear-btn:hover {
        background: rgba(224, 108, 117, 0.1);
        border-color: rgba(224, 108, 117, 0.3);
      }

      .log-entry {
        padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,0.05);
        font-family: 'Courier New', monospace; font-size: 11px; display: flex; gap: 8px;
        align-items: center;
      }
      .log-entry:hover { background: rgba(255,255,255,0.02); }
      .log-time { color: var(--text-muted); min-width: 85px; }
      .log-cat { font-weight: bold; min-width: 65px; }
      .log-comp { color: var(--warning); min-width: 100px; }
      
      @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
    `
		this.shadowRoot.appendChild(style)

		// 3. Создаем структуру UI
		const panel = document.createElement('div')
		panel.className = 'panel'
		panel.innerHTML = `
      <div class="header">
        <!-- ВЕРХНИЙ РЯД -->
        <div class="header-top">
          <div class="header-logo">
            <span class="logo-icon">⚛️</span>
            <span class="logo-text">DevTools</span>
          </div>
          
          <div class="tabs">
            <button id="tab-trees" class="active">Trees</button>
            <button id="tab-profiler">Profiler</button>
            <button id="tab-logs">Logs</button>
            <button id="tab-docs">Docs</button>
          </div>

          <div class="header-actions">
            <label class="toggle-switch">
              <input type="checkbox" id="slow-mode-toggle">
              <div class="toggle-track"><div class="toggle-knob"></div></div>
              <span style="color: var(--warning); font-size: 11px; font-weight: 600;">🐢 Slow</span>
            </label>
            <div id="status-badge" class="status-badge status-IDLE">IDLE</div>
          </div>
        </div>

        <!-- НИЖНИЙ РЯД (Тулбар) -->
        <div class="header-bottom">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted);">
            <span>Delay:</span>
            <input type="range" id="slow-delay-slider" min="50" max="2000" step="50" value="500" style="width: 70px;">
            <span id="slow-delay-val" style="color: var(--warning); font-size: 11px;">500ms</span>
          </div>
          
          <div style="height: 12px; width: 1px; background: rgba(255,255,255,0.06);"></div>
          
          <button id="btn-pause" style="padding: 3px 10px; border-radius: 6px; color: var(--warning); font-size: 11px; font-weight: 600; cursor: pointer; background: rgba(229, 192, 123, 0.05); border: 1px solid rgba(229, 192, 123, 0.12);">⏸️ Pause</button>
          <button id="btn-step" style="padding: 3px 10px; border-radius: 6px; color: var(--accent); font-size: 11px; font-weight: 600; cursor: pointer; background: rgba(97, 218, 251, 0.05); border: 1px solid rgba(97, 218, 251, 0.12); display: none;">⏭️ Step</button>
        </div>
      </div>
      
      <div id="panel-trees" class="content-area" style="position: relative;">
        <div class="split-pane">
          <div style="color: var(--text-muted); margin-bottom: 10px; font-weight: bold;">CURRENT DOM TREE</div>
          <input type="text" id="search-current" class="search-bar" placeholder="Filter components...">
          <div id="tree-current-root"></div>
        </div>
        <div class="split-pane wip-pane">
          <div style="color: var(--text-muted); margin-bottom: 10px; font-weight: bold;">WORK-IN-PROGRESS</div>
          <input type="text" id="search-wip" class="search-bar" placeholder="Filter components...">
          <div id="tree-wip-root"></div>
        </div>

        <!-- Side Drawer Details -->
        <div id="node-inspector" class="side-drawer">
          <div class="drawer-header">
            <span id="inspect-title" style="font-weight: bold; color: var(--accent); font-size: 12px;">Inspect Node</span>
            <button id="close-drawer" style="padding: 2px 6px; font-size: 10px; cursor: pointer; background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: var(--text-muted);">Close</button>
          </div>
          <div id="inspect-content" class="drawer-content"></div>
        </div>
      </div>

      <div id="panel-profiler" class="content-area" style="display: none; padding: 16px; flex-direction: column;">
        <div style="color: var(--accent); margin-bottom: 16px; font-weight: bold;">PERFORMANCE TIMELINE</div>
        <div id="profiler-root" style="display: flex; flex-direction: column; gap: 8px; overflow-y: auto;"></div>
      </div>

      <div id="panel-docs" class="content-area" style="display: none; padding: 20px; flex-direction: column; overflow-y: auto; gap: 16px; max-width: 100%;">
        <div style="color: var(--accent); font-weight: bold; font-size: 16px; margin-bottom: 8px;">📚 Документация (Help)</div>
        <div style="line-height: 1.6; font-size: 12px; color: var(--text-main);">
          <h3 style="color: #fff; margin-top: 0;">🌳 Вкладка Trees</h3>
          <p>Отображает структуру элементов. <br>
             <span style="color: var(--success); font-weight: bold;">Зеленый</span> - DOM-элементы, <br>
             <span style="color: var(--accent); font-weight: bold;">Голубой</span> - Функциональные компоненты.</p>
          <h4 style="color: var(--warning); margin-bottom: 8px;">🔢 Бейджи и счетчики:</h4>
          <ul style="padding-left: 16px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
            <li><b style="color: var(--warning);">x2, x3...</b> - Количество реальных запусков (вызовов) функции компонента.</li>
            <li><b style="color: var(--text-muted);">(Skip: N)</b> - Счётчик пропусков (Bailout). Показывает, сколько раз рендер был пропущен.</li>
            <li><b style="color: var(--success);">+</b> - PLACEMENT: элемент только что создан.</li>
            <li><b style="color: var(--accent);">↻</b> - UPDATE: обновились Props или State.</li>
            <li><b style="color: var(--danger);">-</b> - DELETION: элемент удален.</li>
          </ul>
          <h3 style="color: #fff; margin-top: 16px;">⏱️ Вкладка Profiler</h3>
          <p>Показывает список коммитов и время работы WorkLoop в миллисекундах. Помогает находить медленные рендеры.</p>
          <h3 style="color: #fff; margin-top: 16px;">🐢 Дополнительно</h3>
          <p><b>Slow Motion:</b> Позволяет искусственно замедлить проход по дереву (Commit), чтобы увидеть порядок вставок.</p>
        </div>
      </div>

      <div id="panel-logs" class="content-area" style="display: none; flex-direction: column;">
        <div class="log-controls">
          <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.5px; color: var(--text-muted); margin-right: 8px;">FILTERS:</div>
          <label class="log-checkbox"><input type="checkbox" id="log-toggle-State"> <span>State</span></label>
          <label class="log-checkbox"><input type="checkbox" id="log-toggle-Effect"> <span>Effect</span></label>
          <label class="log-checkbox"><input type="checkbox" id="log-toggle-Render"> <span>Render</span></label>
          <label class="log-checkbox"><input type="checkbox" id="log-toggle-Commit"> <span>Commit</span></label>
          <label class="log-checkbox"><input type="checkbox" id="log-toggle-Warning"> <span>Warning</span></label>
          <button id="log-clear-btn">Clear</button>
        </div>
        <div id="logs-root" style="flex: 1; overflow-y: auto; background: var(--bg-main);">
          <div style="color: var(--text-muted); padding: 16px; font-style: italic;">No logs yet...</div>
        </div>
      </div>
    `
		this.shadowRoot.appendChild(panel)
		document.body.appendChild(this.container)

		// 4. Инициализируем Хайлайтер (Он должен жить в light DOM, чтобы позиционироваться поверх элементов)
		this.initHighlighter()

		// 5. Кэшируем узлы и вешаем слушатели
		this.bindEvents()
	}

	private initHighlighter() {
		this.refs.highlighter = document.createElement('div')
		this.refs.highlighter.style.cssText = `
      position: absolute; background: rgba(97, 218, 251, 0.3);
      border: 1px solid #61dafb; pointer-events: none;
      z-index: 2147483646; display: none; transition: all 0.1s ease;
    `
		document.body.appendChild(this.refs.highlighter)
	}

	private bindEvents() {
		if (!this.shadowRoot) return
		const sr = this.shadowRoot

		this.refs.treesPanel = sr.getElementById('panel-trees')
		this.refs.profilerPanel = sr.getElementById('panel-profiler')
		this.refs.docsPanel = sr.getElementById('panel-docs')
		this.refs.logsPanel = sr.getElementById('panel-logs')
		this.refs.currentTreeRoot = sr.getElementById('tree-current-root')
		this.refs.wipTreeRoot = sr.getElementById('tree-wip-root')
		this.refs.statusBadge = sr.getElementById('status-badge')

		// Кнопка закрытия инспектора ноды
		sr.getElementById('close-drawer')?.addEventListener('click', () => {
			sr.getElementById('node-inspector')?.classList.remove('open')
		})

		// Вкладки
		sr.getElementById('tab-trees')?.addEventListener('click', e =>
			this.switchTab('trees', e.target as HTMLButtonElement),
		)
		sr.getElementById('tab-profiler')?.addEventListener('click', e =>
			this.switchTab('profiler', e.target as HTMLButtonElement),
		)
		sr.getElementById('tab-docs')?.addEventListener('click', e =>
			this.switchTab('docs', e.target as HTMLButtonElement),
		)
		sr.getElementById('tab-logs')?.addEventListener('click', e =>
			this.switchTab('logs', e.target as HTMLButtonElement),
		)

		// Поиск
		const handleSearch = (e: Event) => {
			this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase()
			// Перерисовка деревьев будет вызвана движком на следующем шаге, или мы можем кэшировать последние данные
		}
		sr.getElementById('search-current')?.addEventListener('input', handleSearch)
		sr.getElementById('search-wip')?.addEventListener('input', handleSearch)

		// Slow Mode Toggle связываем с Bridge
		const toggle = sr.getElementById('slow-mode-toggle') as HTMLInputElement
		const headerBottom = sr.querySelector('.header-bottom') as HTMLElement
		const btnPause = sr.getElementById('btn-pause') as HTMLButtonElement
		const btnStep = sr.getElementById('btn-step') as HTMLButtonElement
		const delaySlider = sr.getElementById('slow-delay-slider') as HTMLInputElement
		const delayVal = sr.getElementById('slow-delay-val') as HTMLElement

		toggle.addEventListener('change', () => {
			devToolsBridge.setSlowMode(toggle.checked)
			if (headerBottom) {
				if (toggle.checked) headerBottom.classList.add('visible')
				else headerBottom.classList.remove('visible')
			}
		})

		btnPause.addEventListener('click', () => {
			devToolsBridge.togglePause()
			const isPaused = devToolsBridge.isPaused()
			btnPause.innerHTML = isPaused ? '▶️ Resume' : '⏸️ Pause'
			btnStep.style.display = isPaused ? 'block' : 'none'
		})

		btnStep.addEventListener('click', () => {
			devToolsBridge.requestStep()
		})

		delaySlider.addEventListener('input', () => {
			const ms = parseInt(delaySlider.value)
			devToolsBridge.setDelay(ms)
			delayVal.textContent = `${ms}ms`
		})

		// Привязка тогглов логов к Bridge
		const logCategories: LogCategory[] = ['State', 'Effect', 'Render', 'Commit', 'Warning']
		logCategories.forEach(cat => {
			const checkbox = sr.getElementById(`log-toggle-${cat}`) as HTMLInputElement
			if (checkbox) {
				checkbox.checked = devToolsBridge.isLogEnabled(cat)
				checkbox.addEventListener('change', () => {
					devToolsBridge.setLogCategory(cat, checkbox.checked)
				})
			}
		})

		sr.getElementById('log-clear-btn')?.addEventListener('click', () => {
			devToolsBridge.clearLogs()
		})
	}

	private switchTab(
		tab: 'trees' | 'profiler' | 'logs' | 'docs',
		btn: HTMLButtonElement,
	) {
		this.activeTab = tab
		if (!this.shadowRoot) return

		this.shadowRoot
			.querySelectorAll('.tabs button')
			.forEach(b => b.classList.remove('active'))
		btn.classList.add('active')

		if (this.refs.treesPanel)
			this.refs.treesPanel.style.display = tab === 'trees' ? 'flex' : 'none'
		if (this.refs.profilerPanel)
			this.refs.profilerPanel.style.display = tab === 'profiler' ? 'flex' : 'none'
		if (this.refs.docsPanel)
			this.refs.docsPanel.style.display = tab === 'docs' ? 'flex' : 'none'
		if (this.refs.logsPanel)
			this.refs.logsPanel.style.display = tab === 'logs' ? 'flex' : 'none'

		// Рендерим задержанные данные при переключении вкладки
		if (tab === 'trees') {
			const { currentRoot, wipRoot, activeFiber, phase } = this.lastRenderState
			if (this.refs.currentTreeRoot) this.renderTree(currentRoot, this.refs.currentTreeRoot, activeFiber, phase)
			if (this.refs.wipTreeRoot) this.renderTree(wipRoot, this.refs.wipTreeRoot, activeFiber, phase)
		} else if (tab === 'profiler') {
			this.updateProfiler(this.lastProfilerData)
		} else if (tab === 'logs') {
			this.updateLogs(this.lastLogsData)
		}
	}

	// ==========================================
	// API ДЛЯ ВЗАИМОДЕЙСТВИЯ С REACT ДВИЖКОМ
	// ==========================================

	/**
	 * Обновляет UI деревьев. Вызывается из DevToolsBridge.
	 */
	public updateRenderState(
		currentRoot: Fiber | null,
		wipRoot: Fiber | null,
		activeFiber: Fiber | null,
		phase: string,
	) {
		this.lastRenderState = { currentRoot, wipRoot, activeFiber, phase }

		if (this.refs.statusBadge) {
			this.refs.statusBadge.textContent = phase
			this.refs.statusBadge.className = `status-badge status-${phase.replace(' PREP', '')}`
		}

		if (this.activeTab !== 'trees') return

		if (this.refs.currentTreeRoot)
			this.renderTree(currentRoot, this.refs.currentTreeRoot, activeFiber, phase)
		if (this.refs.wipTreeRoot)
			this.renderTree(wipRoot, this.refs.wipTreeRoot, activeFiber, phase)
	}

	public updateProfiler(data: any[]) {
		this.lastProfilerData = data
		if (this.activeTab !== 'profiler') return

		const root = this.shadowRoot?.getElementById('profiler-root')
		if (!root) return

		if (data.length === 0) {
			root.innerHTML = `<div style="color: var(--text-muted); font-style: italic;">No commits recorded yet.</div>`
			return
		}

		const maxTime = Math.max(...data.map(d => d.totalTime), 1)

		root.innerHTML = data
			.map(e => {
				const barWidth = Math.max((e.totalTime / maxTime) * 100, 2)
				const color = e.type === 'Mount' ? 'var(--success)' : 'var(--accent)'
				return `
        <div style="background: var(--bg-header); padding: 10px; border-radius: 6px; border: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: ${color}; font-weight: bold;">Commit #${e.id} [${e.type}]</span>
            <span style="color: var(--text-muted);">${e.timestamp}</span>
          </div>
          <div style="background: var(--bg-main); border-radius: 4px; height: 12px; width: 100%; overflow: hidden;">
            <div style="height: 100%; width: ${barWidth}%; background: ${color};"></div>
          </div>
          <div style="margin-top: 6px; font-size: 10px; color: var(--text-muted);">Total: ${e.totalTime}ms</div>
        </div>
      `
			})
			.reverse()
			.join('') // Показываем свежие сверху
	}

	public updateLogs(logs: LogEntry[]) {
		this.lastLogsData = logs
		if (this.activeTab !== 'logs') return

		const root = this.shadowRoot?.getElementById('logs-root')
		if (!root) return

		if (logs.length === 0) {
			root.innerHTML = `<div style="color: var(--text-muted); padding: 16px; font-style: italic;">No logs to display.</div>`
			return
		}

		const colors: Record<LogCategory, string> = {
			Render: 'var(--accent)',
			State: 'var(--hook-state)',
			Effect: 'var(--hook-effect)',
			Commit: 'var(--success)',
			Warning: 'var(--danger)',
		}

		root.innerHTML = logs
			.map(
				log => `
      <div class="log-entry">
        <span class="log-time">${log.timestamp}</span>
        <span class="log-cat" style="color: ${colors[log.category]}">[${log.category}]</span>
        <span class="log-comp">&lt;${log.componentName}&gt;</span>
        <span style="color: var(--text-main);">${log.message}</span>
      </div>
    `,
			)
			.join('')
	}

	// ==========================================
	// ВНУТРЕННЯЯ ЛОГИКА РЕНДЕРИНГА
	// ==========================================

	private getFiberName(fiber: Fiber): string {
		if (fiber.type instanceof Function)
			return (fiber.type as any).name || 'Anonymous'
		if (fiber.type === 'TEXT_ELEMENT') return 'TEXT'
		return String(fiber.type)
	}

	private getFiberKey(fiber: Fiber, indent: number): string {
		let key = `${indent}:${this.getFiberName(fiber)}`
		let p = fiber.parent
		let depth = 0
		while (p && depth < 2) {
			// Берем контекст предков для уникальности
			key = this.getFiberName(p) + '/' + key
			p = p.parent
			depth++
		}
		return key
	}

	private renderTree(
		root: Fiber | null,
		container: HTMLElement,
		activeFiber: Fiber | null,
		phase: string,
	) {
		container.innerHTML = ''
		if (!root) {
			container.innerHTML = `<div style="color: var(--text-muted); font-style: italic; text-align: center; margin-top: 20px;">[Empty]</div>`
			return
		}

		const list = document.createElement('ul')

		const traverse = (fiber: Fiber | null, indent = 0) => {
			if (!fiber) return

			const name = this.getFiberName(fiber)
			const isMatch = this.searchQuery
				? name.toLowerCase().includes(this.searchQuery)
				: true
			const fiberKey = this.getFiberKey(fiber, indent)

			// Логика счетчика рендеров (только на фазе коммита инкрементим)
			const isSlowMode = activeFiber !== null
			const shouldIncrement = isSlowMode ? (fiber === activeFiber) : true

			if (phase.includes('COMMIT') && shouldIncrement) {
				if (fiber.wasSkipped) {
					this.skippedCounts.set(fiberKey, (this.skippedCounts.get(fiberKey) || 0) + 1)
				} else if (fiber.effectTag === 'UPDATE' || fiber.effectTag === 'PLACEMENT') {
					this.renderCounts.set(fiberKey, (this.renderCounts.get(fiberKey) || 0) + 1)
				}
			}

			const count = this.renderCounts.get(fiberKey) || 0
			const isCollapsed = this.collapsedNodes.has(fiberKey)
			const isActive = fiber === activeFiber

			// Рендерим узел, если нет поиска ИЛИ он совпадает с поиском
			if (isMatch) {
				const li = document.createElement('li')
				const row = document.createElement('div')
				row.className = `fiber-node ${isActive ? 'fiber-active' : ''}`
				row.style.cursor = 'pointer'
				row.onclick = () => this.showNodeDetails(fiber)
				row.style.paddingLeft = `${indent * 12}px`

				// Стрелка сворачивания
				const hasChildren = !!fiber.child
				const toggleBtn = document.createElement('span')
				toggleBtn.style.cssText =
					'display: inline-block; width: 12px; cursor: pointer; color: var(--text-muted);'
				toggleBtn.textContent = hasChildren ? (isCollapsed ? '▸' : '▾') : ' '

				if (hasChildren) {
					toggleBtn.onclick = e => {
						e.stopPropagation()
						isCollapsed
							? this.collapsedNodes.delete(fiberKey)
							: this.collapsedNodes.add(fiberKey)
						this.renderTree(root, container, activeFiber, phase) // Перерисовка при клике
					}
				}
				row.appendChild(toggleBtn)

				// Имя тега
				const isFn = fiber.type instanceof Function
				const tagClass = isFn
					? 'tag-name-fn'
					: fiber.type === 'TEXT_ELEMENT'
						? 'tag-name-text'
						: 'tag-name-host'

				let html = `<span class="tag-bracket">&lt;</span><span class="${tagClass}">${name}</span>`

				// Пропсы (показываем 1-2 для контекста)
				const propsKeys = Object.keys(fiber.props || {}).filter(
					k => k !== 'children' && typeof fiber.props[k] !== 'function',
				)
				if (propsKeys.length > 0) {
					const key = propsKeys[0]
					html += ` <span class="prop-key">${key}</span>=<span class="prop-val">"${String(fiber.props[key]).substring(0, 10)}"</span>`
				}
				html += `<span class="tag-bracket">&gt;</span>`

				// Бейджи эффектов и счетчика
				if (fiber.effectTag === 'PLACEMENT')
					html += ` <span style="background: rgba(152, 195, 121, 0.2); color: var(--success); padding: 0 4px; border-radius: 2px; font-size: 9px;">+</span>`
				if (fiber.effectTag === 'UPDATE')
					html += ` <span style="background: rgba(97, 218, 251, 0.2); color: var(--accent); padding: 0 4px; border-radius: 2px; font-size: 9px;">↻</span>`
				if (fiber.effectTag === 'DELETION')
					html += ` <span style="background: rgba(224, 108, 117, 0.2); color: var(--danger); padding: 0 4px; border-radius: 2px; font-size: 9px;">-</span>`

				const skippedCount = this.skippedCounts.get(fiberKey) || 0
				if (count > 1)
					html += ` <span style="color: var(--warning); font-size: 9px;" title="Render count">x${count}</span>`
				if (skippedCount > 0)
					html += ` <span style="color: var(--text-muted); font-size: 9px;" title="Skipped count"> (Skip: ${skippedCount})</span>`

				const contentSpan = document.createElement('span')
				contentSpan.innerHTML = html
				row.appendChild(contentSpan)

				// Интерактивность (Highlighter)
				row.onmouseenter = () => this.highlightDOM(fiber)
				row.onmouseleave = () => this.hideHighlight()

				li.appendChild(row)
				list.appendChild(li)
			}

			// Рекурсия по детям, если узел не свернут
			if (!isCollapsed) traverse(fiber.child, indent + 1)

			// Сиблинги всегда обходятся
			traverse(fiber.sibling, indent)
		}

		const actualRoot = !root.type && root.child ? root.child : root
		traverse(actualRoot)
		container.appendChild(list)
	}

	// ==========================================
	// DOM HIGHLIGHTER
	// ==========================================

	private highlightDOM(fiber: Fiber) {
		if (!this.refs.highlighter) return

		// Ищем первый реальный DOM-узел вниз по дереву (если это функциональный компонент)
		let target = fiber
		while (target && !target.dom) {
			target = target.child as Fiber
		}

		if (target && target.dom && target.dom instanceof Element) {
			const rect = target.dom.getBoundingClientRect()
			if (rect.width > 0 && rect.height > 0) {
				this.refs.highlighter.style.top = `${rect.top + window.scrollY}px`
				this.refs.highlighter.style.left = `${rect.left + window.scrollX}px`
				this.refs.highlighter.style.width = `${rect.width}px`
				this.refs.highlighter.style.height = `${rect.height}px`
				this.refs.highlighter.style.display = 'block'
			}
		}
	}

	private hideHighlight() {
		if (this.refs.highlighter) this.refs.highlighter.style.display = 'none'
	}

	private showNodeDetails(fiber: Fiber) {
		const sr = this.shadowRoot
		if (!sr) return
		
		const drawer = sr.getElementById('node-inspector')
		const content = sr.getElementById('inspect-content')
		const title = sr.getElementById('inspect-title')
		if (!drawer || !content || !title) return

		drawer.classList.add('open')
		title.innerHTML = `&lt;${this.getFiberName(fiber)}&gt;`

		let html = ''
		
		const fiberId = this.getFiberId(fiber)
		const altId = fiber.alternate ? this.getFiberId(fiber.alternate) : 'none'

		// --- GENERAL INFO ---
		html += `<div style="font-weight: bold; color: var(--accent); margin-bottom: 8px; border-bottom: 1px solid rgba(97,218,251,0.2); padding-bottom: 4px; font-size: 11px;">GENERAL INFO</div>`
		
		let typeStr = 'HostComponent'
		if (typeof fiber.type === 'function') typeStr = 'FunctionComponent'
		else if (fiber.type === 'TEXT_ELEMENT') typeStr = 'TextNode'
		else typeStr = `HostComponent (&lt;${fiber.type}&gt;)`

		const hasDOM = fiber.dom ? 'Yes' : 'No'
		const domTag = fiber.dom && fiber.dom instanceof Element ? ` (${fiber.dom.tagName.toLowerCase()})` : ''
		const effect = fiber.effectTag || 'NONE'
		const skipped = fiber.wasSkipped ? '<span style="color: var(--warning);">Yes</span>' : 'No'
		const key = fiber.props && fiber.props.key !== undefined ? `"${fiber.props.key}"` : '<span style="color: var(--text-muted); font-style: italic;">none</span>'

		html += `
			<div style="font-size: 11px; padding: 3px 0; display: flex; justify-content: space-between;">
				<span style="color: var(--text-muted);">Fiber ID</span>
				<span style="color: var(--success); font-weight: bold;">${fiberId}</span>
			</div>
			<div style="font-size: 11px; padding: 3px 0; display: flex; justify-content: space-between;">
				<span style="color: var(--text-muted);">Alternate</span>
				<span style="color: var(--warning);">${altId}</span>
			</div>
			<div style="font-size: 11px; padding: 3px 0; display: flex; justify-content: space-between;">
				<span style="color: var(--text-muted);">Type</span>
				<span style="color: var(--accent); font-weight: bold;">${typeStr}</span>
			</div>
			<div style="font-size: 11px; padding: 3px 0; display: flex; justify-content: space-between;">
				<span style="color: var(--text-muted);">Key</span>
				<span>${key}</span>
			</div>
			<div style="font-size: 11px; padding: 3px 0; display: flex; justify-content: space-between;">
				<span style="color: var(--text-muted);">Effect</span>
				<span style="color: ${effect === 'NONE' ? 'var(--text-main)' : effect === 'PLACEMENT' ? 'var(--success)' : 'var(--warning)'}; font-weight: bold;">${effect}</span>
			</div>
			<div style="font-size: 11px; padding: 3px 0; display: flex; justify-content: space-between;">
				<span style="color: var(--text-muted);">Skipped</span>
				<span>${skipped}</span>
			</div>
			<div style="font-size: 11px; padding: 3px 0; display: flex; justify-content: space-between; margin-bottom: 16px;">
				<span style="color: var(--text-muted);">Has DOM</span>
				<span style="font-family: monospace;">${hasDOM}${domTag}</span>
			</div>
		`
		
		// --- PROPS DIFF ---
		html += `<div style="font-weight: bold; color: var(--warning); margin-bottom: 8px; border-bottom: 1px solid rgba(229,192,123,0.2); padding-bottom: 4px; font-size: 11px;">PROPS</div>`
		const props = fiber.props || {}
		const prevProps = fiber.alternate?.props || {}
		const allKeys = Array.from(new Set([...Object.keys(props), ...Object.keys(prevProps)]))

		let hasProps = false
		allKeys.forEach(key => {
			if (key === 'children' || key === '__self' || key === '__source') return
			hasProps = true
			const isAdded = !(key in prevProps)
			const isRemoved = !(key in props)
			const isChanged = !isAdded && !isRemoved && props[key] !== prevProps[key]

			let color = 'var(--text-main)'
			let icon = ''
			if (isAdded) { color = 'var(--success)'; icon = '+ ' }
			else if (isRemoved) { color = 'var(--danger)'; icon = '- ' }
			else if (isChanged) { color = 'var(--warning)'; icon = '↺ ' }

			const val = isRemoved ? prevProps[key] : props[key]
			const displayVal = formatVal(val)

			let valHTML = `<span style="color: rgba(255,255,255,0.7); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${String(val)}">${displayVal}</span>`
			
			if (isChanged) {
				const prevDisplay = formatVal(prevProps[key])
				valHTML = `<div style="display: flex; gap: 4px; align-items: center; max-width: 170px;">
					<span style="color: rgba(255,255,255,0.3); text-decoration: line-through; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${String(prevProps[key])}">${prevDisplay}</span>
					<span style="color: var(--text-muted); font-size: 9px;">➝</span>
					<span style="color: var(--warning); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${String(props[key])}">${displayVal}</span>
				</div>`
			}

			html += `<div style="color: ${color}; font-size: 11px; padding: 4px 0; display: flex; justify-content: space-between; align-items: center;">
				<span>${icon}<b>${key}</b></span>
				${valHTML}
			</div>`
		})

		if (!hasProps) {
			html += `<div style="color: var(--text-muted); font-style: italic; font-size: 11px;">No props available.</div>`
		}

		// --- HOOKS (STATE) ---
		if (fiber.hooks && fiber.hooks.length > 0) {
			html += `<div style="font-weight: bold; color: var(--accent); margin-top: 16px; margin-bottom: 8px; border-bottom: 1px solid rgba(97,218,251,0.2); padding-bottom: 4px; font-size: 11px;">HOOKS (STATE)</div>`
			
			fiber.hooks.forEach((hook: any, index: number) => {
				const isEffect = hook.tag === 'effect'
				let hookVal = isEffect ? `<span style="color: var(--text-muted); font-style: italic;">(Effect)</span>` : formatVal(hook.state)
				
				html += `<div style="color: var(--text-main); font-size: 11px; padding: 3px 0; display: flex; justify-content: space-between; align-items: center;">
					<span>[${index}] <span style="color: var(--hook-state);">${isEffect ? 'effect' : 'state'}</span></span>
					<span style="color: rgba(255,255,255,0.7); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${isEffect ? '' : String(hook.state)}">${hookVal}</span>
				</div>`
			})
		}

		// --- TREE LINKS (NAVIGATION) ---
		const hasLinks = fiber.parent || fiber.child || fiber.sibling
		if (hasLinks) {
			html += `<div style="font-weight: bold; color: var(--accent); margin-top: 16px; margin-bottom: 8px; border-bottom: 1px solid rgba(97,218,251,0.2); padding-bottom: 4px; font-size: 11px;">TREE LINKS</div>`
			
			const renderLink = (label: string, f: Fiber | null, dir: string) => {
				if (!f) return ''
				const nodeName = this.getFiberName(f)
				return `<div style="font-size: 11px; padding: 4px 0; display: flex; justify-content: space-between; align-items: center;">
					<span style="color: var(--text-muted);">${label}</span>
					<span class="inspect-link" style="color: var(--accent); cursor: pointer; text-decoration: underline;" data-target="${dir}">&lt;${nodeName}&gt;</span>
				</div>`
			}

			html += renderLink('Parent', fiber.parent, 'parent')
			html += renderLink('Child', fiber.child, 'child')
			html += renderLink('Sibling', fiber.sibling, 'sibling')
		}

		content.innerHTML = html

		// Навешиваем клики на ссылки
		if (hasLinks) {
			content.querySelectorAll('.inspect-link').forEach(link => {
				link.addEventListener('click', (e) => {
					e.stopPropagation()
					const dir = (e.target as HTMLElement).getAttribute('data-target')
					let targetFiber: Fiber | null = null
					if (dir === 'parent') targetFiber = fiber.parent
					else if (dir === 'child') targetFiber = fiber.child
					else if (dir === 'sibling') targetFiber = fiber.sibling

					if (targetFiber) this.showNodeDetails(targetFiber)
				})
			})
		}
		
		function formatVal(v: any) {
			if (typeof v === 'function') return 'f()'
			if (v && typeof v === 'object') return Array.isArray(v) ? '[...]' : '{...}'
			return String(v)
		}
	}
}

// Экспортируем синглтон для Bridge
export const inspectorUI = new InspectorUI()

/**
 * Точка входа. Вызови это в своем index.ts до запуска React
 */
export function initFiberInspector() {
	inspectorUI.mount()

	// Связываем Bridge с нашим UI
	devToolsBridge.onRenderTree = (current, wip, active, phase) => {
		inspectorUI.updateRenderState(current, wip, active, phase)
	}

	devToolsBridge.onProfilerUpdate = data => {
		inspectorUI.updateProfiler(data)
	}

	// Подключаем логирование
	devToolsBridge.onLogUpdate = logs => {
		inspectorUI.updateLogs(logs)
	}
}
