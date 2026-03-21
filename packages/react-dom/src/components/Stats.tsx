import React from '../../../react'

export function Stats(props: any) {
	return (
		<div style="display: flex; gap: 15px; margin-bottom: 25px;">
			<div style="flex: 1; background: rgba(97, 218, 251, 0.1); border: 1px solid rgba(97, 218, 251, 0.2); border-radius: 10px; padding: 15px; text-align: center;">
				<div style="font-size: 24px; color: #61dafb; font-weight: bold;">{props.total}</div>
				<div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px;">Всего задач</div>
			</div>
			<div style="flex: 1; background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.2); border-radius: 10px; padding: 15px; text-align: center;">
				<div style="font-size: 24px; color: #4CAF50; font-weight: bold;">{props.active}</div>
				<div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px;">Активных</div>
			</div>
		</div>
	)
}
