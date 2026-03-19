// packages/shared/types.ts

// Тип элемента может быть строкой ('div', 'span' - для HTML тегов)
// или функцией (для наших кастомных компонентов вроде <App />)
export type ElementType = string | Function

// Тот самый объект, в который превращается JSX
export interface ReactElement {
	type: ElementType
	props: {
		[key: string]: any
		children: ReactElement[]
	}
}

export interface Fiber {
	type: ElementType
	props: Record<string, any>
	dom: HTMLElement | Text | null

	// Связи для обхода дерева
	parent: Fiber | null
	child: Fiber | null
	sibling: Fiber | null
}
