import React from '../../../react'
import { useState } from '../../../react/src/ReactHooks'
import { Stats } from './Stats'
import { TodoItem } from './TodoItem'

export function TodoDashboard() {
	const [todos, setTodos] = useState([
		{ id: 1, text: 'Изучить Fiber Architecture' },
		{ id: 2, text: 'Реализовать useState' },
		{ id: 3, text: 'Добавить useEffect' },
		{ id: 4, text: 'Написать Profiler' },
	])

	const addTodo = () => {
		const ideas = [
			'Реализовать Suspense',
			'Добавить Context API',
			'Написать useMemo',
			'Сделать Server Components',
			'Портировать на WebAssembly',
			'Добавить Error Boundaries',
		]
		const text = ideas[Math.floor(Math.random() * ideas.length)]
		setTodos([...todos, { id: Date.now() + Math.random(), text }])
	}

	const deleteTodo = (id: number) => {
		setTodos(todos.filter((todo: any) => todo.id !== id))
	}

	return (
		<React.Fragment>
			<Stats total={todos.length} active={todos.length} />

			<div style="margin-bottom: 15px;">
				<button
					onClick={addTodo}
					style="
						width: 100%; padding: 14px; border: none; border-radius: 10px;
						background: linear-gradient(135deg, #61dafb, #6366f1);
						color: white; font-size: 15px; font-weight: bold; cursor: pointer;
						box-shadow: 0 4px 15px rgba(97, 218, 251, 0.3);
					"
				>
					➕ Добавить задачу
				</button>
			</div>

			<div>
				{todos.map((todo: any) => (
					<TodoItem key={todo.id} text={todo.text} onDelete={() => deleteTodo(todo.id)} />
				))}
			</div>
		</React.Fragment>
	)
}
