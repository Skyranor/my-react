// packages/react/src/createElement.ts
import { ReactElement, ElementType } from '../../shared/types'

export function createElement(
	type: ElementType,
	config: Record<string, any> | null,
	...children: any[]
): ReactElement {
	const props: { [key: string]: any; children: any[] } = {
		...config,
		children: [],
	}

	// Если дети есть, обрабатываем их
	// Если ребенок - примитив (строка/число), превращаем его в объект TEXT_ELEMENT
	props.children = children.map(child =>
		typeof child === 'object' ? child : createTextElement(child),
	)

	return {
		type,
		props,
	}
}

// Вспомогательная функция для текстовых узлов
function createTextElement(text: string | number): ReactElement {
	return {
		type: 'TEXT_ELEMENT',
		props: {
			nodeValue: String(text),
			children: [],
		},
	}
}
