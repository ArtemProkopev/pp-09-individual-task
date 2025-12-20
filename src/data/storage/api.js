// src/data/storage/api.js

// ВАЖНО: относительный путь работает и в проде, и при раздаче фронта сервером.
// Если фронт и API на одном origin: BASE = '/api' — идеально.
const BASE = '/api'

async function parseBody(res) {
	const ct = (res.headers.get('content-type') || '').toLowerCase()

	// 204 No Content
	if (res.status === 204) return null

	if (ct.includes('application/json')) {
		// если JSON сломан, пусть ошибка всплывёт — это правильно
		return res.json()
	}

	return res.text()
}

async function j(method, url, body) {
	const res = await fetch(BASE + url, {
		method,
		headers: body ? { 'Content-Type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined,
	})

	const payload = await parseBody(res)

	if (!res.ok) {
		let msg = 'Request failed'
		if (typeof payload === 'string' && payload.trim()) msg = payload.trim()
		else if (payload && typeof payload === 'object') {
			// { error: '...' } — частый формат
			msg = payload.error || JSON.stringify(payload)
		}

		const err = new Error(msg)
		err.status = res.status
		err.payload = payload
		throw err
	}

	return payload
}

export const api = {
	snapshot: () => j('GET', '/snapshot'),
	reset: () => j('POST', '/reset'),

	upsertClient: p => j('POST', '/clients/upsert', p),

	createAppointment: p => j('POST', '/appointments', p),
	setAppointmentStatus: (id, status) =>
		j('PATCH', `/appointments/${id}/status`, { status }),

	addMaster: p => j('POST', '/masters', p),
	toggleMaster: id => j('PATCH', `/masters/${id}/toggle`),
	deleteMaster: id => j('DELETE', `/masters/${id}`),

	addService: p => j('POST', '/services', p),
	toggleService: id => j('PATCH', `/services/${id}/toggle`),
	deleteService: id => j('DELETE', `/services/${id}`),

	setMasterService: p => j('PUT', '/master-services', p),
	upsertWorkingSlot: p => j('PUT', '/working-slots', p),
}
