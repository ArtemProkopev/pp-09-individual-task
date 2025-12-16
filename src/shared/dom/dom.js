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
