import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'jsdom', // Нам нужен DOM для тестирования реакта
		globals: true,        // Разрешает использовать describe, test, expect без импорта
		setupFiles: ['./vitest.setup.ts'],
	},
})
