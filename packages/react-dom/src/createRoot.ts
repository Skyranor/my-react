// packages/react-dom/src/createRoot.ts
import { ReactElement } from '../../shared/types'
import { render } from './render'

export function createRoot(container: HTMLElement | null) {
	if (!container) {
		throw new Error('Target container is not a DOM element.')
	}

	return {
		render: (element: ReactElement) => {
			// Очищаем контейнер перед новым рендером (чтобы не дублировать элементы)
			container.innerHTML = ''
			render(element, container)
		},
	}
}
