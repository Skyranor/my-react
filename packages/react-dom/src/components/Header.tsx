import React from '../../../react'
import { useState, useEffect } from '../../../react/src/ReactHooks'

export function Header() {
	return (
		<div style='margin-bottom: 30px;'>
			<h1 style='font-size: 28px; color: white; margin: 0 0 5px 0; text-shadow: 0 2px 10px rgba(97, 218, 251, 0.3);'>
				⚛️ My React Framework
			</h1>
			<p style='color: rgba(255,255,255,0.5); margin: 0; font-size: 13px;'>
				Самописный React с Fiber, Hooks, Effects и Profiler
			</p>
		</div>
	)
}
