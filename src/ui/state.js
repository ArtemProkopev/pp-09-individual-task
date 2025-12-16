const KEY = 'beauty_scheduler_ui_v1'

function safeParse(raw) {
	try {
		return JSON.parse(raw)
	} catch {
		return null
	}
}

export function getDefault() {
	return {
		route: 'book',
		book: { masterId: '', date: '', serviceIds: [] },
		schedule: { masterId: '', date: '', mode: 'day' },
		history: { phone: '', status: 'all' },
	}
}

export function loadUIState() {
	const raw = localStorage.getItem(KEY)
	const st = raw ? safeParse(raw) : null
	if (!st || typeof st !== 'object') return getDefault()
	return { ...getDefault(), ...st }
}

export function saveUIState(state) {
	localStorage.setItem(KEY, JSON.stringify(state))
}

export function patchUIState(patch) {
	const cur = loadUIState()
	const next = { ...cur, ...patch }
	saveUIState(next)
	return next
}
