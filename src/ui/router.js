import { $ } from '../shared/dom/dom.js'
import { patchUIState } from './state.js'

const routes = ['book', 'schedule', 'history', 'admin']

export function initRouter(dom, { onRoute, initialRoute }) {
	function setRoute(route) {
		if (!routes.includes(route)) route = 'book'

		for (const r of routes) {
			$(`view-${r}`).classList.toggle('is-hidden', r !== route)
		}
		for (const btn of dom.tabs.querySelectorAll('.tab')) {
			const active = btn.dataset.route === route
			btn.classList.toggle('is-active', active)
			btn.setAttribute('aria-selected', active ? 'true' : 'false')
		}

		patchUIState({ route })
		onRoute?.(route)
	}

	dom.tabs.addEventListener('click', e => {
		const btn = e.target.closest('.tab')
		if (!btn) return
		setRoute(btn.dataset.route)
	})

	return { setRoute: route => setRoute(route ?? initialRoute ?? 'book') }
}
