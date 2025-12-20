export const $ = id => document.getElementById(id)

export function escapeHTML(value = '') {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;')
}

export function delegate(root, event, selector, handler) {
	root.addEventListener(event, e => {
		const el = e.target.closest(selector)
		if (!el || !root.contains(el)) return
		handler(e, el)
	})
}

export function setText(el, text) {
	el.textContent = text ?? ''
}

export function setBusy(el, isBusy) {
	el.setAttribute('aria-busy', isBusy ? 'true' : 'false')
}

/** ===== Helpers для “некускового” DOM вместо innerHTML ===== */

export function clear(el) {
	while (el.firstChild) el.removeChild(el.firstChild)
	return el
}

/**
 * el('button', { className:'chip', dataset:{sid:'1'}, attrs:{type:'button'} }, 'Text', childNode)
 * children: string | number | Node | (array of them)
 */
export function el(tag, props = null, ...children) {
	const node = document.createElement(tag)

	if (props) {
		// attrs
		if (props.attrs) {
			for (const [k, v] of Object.entries(props.attrs)) {
				if (v === undefined || v === null) continue
				node.setAttribute(k, String(v))
			}
		}

		// dataset
		if (props.dataset) {
			for (const [k, v] of Object.entries(props.dataset)) {
				if (v === undefined || v === null) continue
				node.dataset[k] = String(v)
			}
		}

		// className
		if (props.className) node.className = props.className

		// style (объектом)
		if (props.style) {
			for (const [k, v] of Object.entries(props.style)) {
				node.style[k] = v
			}
		}

		// properties (например disabled, value, checked)
		if (props.props) {
			for (const [k, v] of Object.entries(props.props)) {
				node[k] = v
			}
		}
	}

	append(node, children)
	return node
}

export function append(parent, children) {
	for (const child of children.flat(Infinity)) {
		if (child === undefined || child === null || child === false) continue
		if (child instanceof Node) parent.appendChild(child)
		else parent.appendChild(document.createTextNode(String(child)))
	}
	return parent
}

export function fragment(...children) {
	const f = document.createDocumentFragment()
	append(f, children)
	return f
}
