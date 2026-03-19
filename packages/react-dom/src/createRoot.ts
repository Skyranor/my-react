// packages/react-dom/src/createRoot.ts
import { ReactElement } from '../../shared/types'
import { createWorkInProgressRoot } from '../../react-reconciler/src/ReactWorkLoop'

export function createRoot(container: HTMLElement | null) {
	if (!container) throw new Error('Target container is not a DOM element.')

	return {
		render: (element: ReactElement) => {
			// Больше никакой рекурсии! Просто отдаем задачу Reconciler'у
			createWorkInProgressRoot(element, container)
		},
	}
}
