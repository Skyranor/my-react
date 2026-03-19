// packages/shared/jsx.d.ts

declare namespace JSX {
	// IntrinsicElements описывает встроенные теги (строковые), такие как <div>, <span> и т.д.
	interface IntrinsicElements {
		// На старте мы разрешаем любые имена тегов и любые пропсы для них,
		// чтобы не прописывать руками все 100+ HTML-тегов.
		[elemName: string]: any
	}
}
