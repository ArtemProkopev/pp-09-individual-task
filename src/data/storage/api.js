const BASE = 'http://localhost:5174/api'

async function j(method, url, body) {
	const res = await fetch(BASE + url, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
	})
	if (!res.ok) throw new Error(await res.text())
	return res.json()
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
