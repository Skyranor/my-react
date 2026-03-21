import React from '../../../react'
import { useState, useEffect } from '../../../react/src/ReactHooks'

function TodoItemComponent(props: any) {
	const [done, setDone] = useState(false)

	useEffect(() => {
		if (done) {
			console.log(`%c[App] ✅ Задача "${props.text}" выполнена!`, 'color: #4CAF50; font-weight: bold;')
		}
	}, [done])

	return (
		<div style={`
			display: flex; align-items: center; gap: 12px;
			padding: 14px 18px; margin-bottom: 10px;
			background: ${done ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
			border: 1px solid ${done ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
			border-radius: 10px;
			transition: all 0.2s ease;
			backdrop-filter: blur(10px);
		`}>
			<button
				onClick={() => setDone(!done)}
				style={`
					width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
					border: 2px solid ${done ? '#4CAF50' : '#666'};
					background: ${done ? '#4CAF50' : 'transparent'};
					color: white; font-size: 14px;
					display: flex; align-items: center; justify-content: center;
				`}
			>
				{done ? '✓' : ''}
			</button>
			<span style={`
				flex: 1; font-size: 15px;
				color: ${done ? 'rgba(255,255,255,0.4)' : 'white'};
				text-decoration: ${done ? 'line-through' : 'none'};
			`}>
				{props.text}
			</span>
			<button
				onClick={() => props.onDelete()}
				style="background: rgba(244, 67, 54, 0.2); border: 1px solid rgba(244, 67, 54, 0.3); color: #ef5350; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;"
			>
				✕
			</button>
		</div>
	)
}

export const TodoItem = TodoItemComponent
