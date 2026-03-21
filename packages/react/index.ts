import { createElement } from './src/createElement'
import { useState, useEffect } from './src/ReactHooks'
// Fragment — специальный тип, который позволяет возвращать несколько элементов
// без оборачивания в лишний <div>. В JSX: <></> или <React.Fragment>
export const Fragment = 'FRAGMENT'

const React = {
	createElement,
	useState,
	useEffect,
	Fragment,
}

export default React

