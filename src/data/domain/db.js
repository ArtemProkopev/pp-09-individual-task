// src/data/domain/db.js
const KEY = 'beauty_scheduler_v1'

function nowIso() {
	return new Date().toISOString()
}
function uid(prefix = 'id') {
	return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export function bumpRev(db) {
	db.rev = (db.rev ?? 0) + 1
}

export function loadDB() {
	const raw = localStorage.getItem(KEY)
	if (!raw) return null
	try {
		return JSON.parse(raw)
	} catch {
		return null
	}
}
export function saveDB(db) {
	localStorage.setItem(KEY, JSON.stringify(db))
}
export function resetDB() {
	localStorage.removeItem(KEY)
}

export function ensureSeed(seedFactory) {
	let db = loadDB()
	if (!db || typeof db.rev !== 'number') {
		db = seedFactory()
		saveDB(db)
	}
	return db
}

export function getMasters(db, { includeInactive = false } = {}) {
	return includeInactive ? db.masters : db.masters.filter(m => m.active)
}
export function getServices(db, { includeInactive = false } = {}) {
	return includeInactive ? db.services : db.services.filter(s => s.active)
}

export function getServicesByMaster(db, masterId) {
	const ids = new Set(
		db.masterServices
			.filter(ms => ms.master_id === masterId)
			.map(ms => ms.service_id)
	)
	return getServices(db).filter(s => ids.has(s.service_id))
}

export function upsertClient(db, { full_name, phone }) {
	const normalized = phone.trim()
	let client = db.clients.find(c => c.phone === normalized)
	if (!client) {
		client = {
			client_id: uid('cli'),
			full_name: full_name.trim(),
			phone: normalized,
			created_at: nowIso(),
		}
		db.clients.push(client)
		bumpRev(db)
	} else if (full_name?.trim() && client.full_name !== full_name.trim()) {
		client.full_name = full_name.trim()
		bumpRev(db)
	}
	return client
}

export function listAppointmentsByMasterAndDate(db, masterId, dateStr) {
	return db.appointments
		.filter(
			a => a.master_id === masterId && a.start_dt.slice(0, 10) === dateStr
		)
		.sort((a, b) => a.start_dt.localeCompare(b.start_dt))
}

export function listAppointmentsByMasterRange(db, masterId, from, to) {
	return db.appointments
		.filter(
			a =>
				a.master_id === masterId &&
				a.start_dt.slice(0, 10) >= from &&
				a.start_dt.slice(0, 10) <= to
		)
		.sort((a, b) => a.start_dt.localeCompare(b.start_dt))
}

export function listAppointmentItems(db, appointmentId) {
	return db.appointmentItems.filter(i => i.appointment_id === appointmentId)
}

export function listHistoryByPhone(db, phone, status = 'all') {
	const client = db.clients.find(c => c.phone === phone.trim())
	if (!client) return { client: null, items: [] }

	let items = db.appointments.filter(a => a.client_id === client.client_id)
	if (status !== 'all') items = items.filter(a => a.status === status)
	items.sort((a, b) => b.start_dt.localeCompare(a.start_dt))

	return { client, items }
}

export function createAppointment(db, payload) {
	const appointment_id = uid('apt')
	db.appointments.push({
		appointment_id,
		client_id: payload.client_id,
		master_id: payload.master_id,
		start_dt: payload.start_dt,
		end_dt: payload.end_dt,
		status: 'booked',
		comment: payload.comment ?? '',
		created_at: nowIso(),
	})
	for (const it of payload.items) {
		db.appointmentItems.push({
			appointment_item_id: uid('ait'),
			appointment_id,
			service_id: it.service_id,
			price_at_time: it.price_at_time,
			duration_min_at_time: it.duration_min_at_time,
		})
	}
	bumpRev(db)
	return db.appointments.at(-1)
}

export function setAppointmentStatus(db, id, status) {
	const a = db.appointments.find(x => x.appointment_id === id)
	if (!a) return
	a.status = status
	bumpRev(db)
}

/* ADMIN CRUD */
export function addMaster(
	db,
	{
		full_name,
		specialization,
		phone = '',
		active = true,
		salon_id = db.salons[0]?.salon_id ?? 'sal_1',
	}
) {
	db.masters.push({
		master_id: uid('m'),
		salon_id,
		full_name: full_name.trim(),
		specialization: specialization.trim(),
		phone: phone.trim(),
		active: !!active,
	})
	bumpRev(db)
}

export function toggleMasterActive(db, id) {
	const m = db.masters.find(x => x.master_id === id)
	if (!m) return
	m.active = !m.active
	bumpRev(db)
}

/* полное удаление мастера + его связей */
export function deleteMaster(db, masterId) {
	db.masters = db.masters.filter(m => m.master_id !== masterId)
	db.masterServices = db.masterServices.filter(ms => ms.master_id !== masterId)
	db.workingSlots = db.workingSlots.filter(ws => ws.master_id !== masterId)

	const removedAppointments = new Set(
		db.appointments
			.filter(a => a.master_id === masterId)
			.map(a => a.appointment_id)
	)
	db.appointments = db.appointments.filter(a => a.master_id !== masterId)

	if (removedAppointments.size) {
		db.appointmentItems = db.appointmentItems.filter(
			it => !removedAppointments.has(it.appointment_id)
		)
	}

	bumpRev(db)
}

export function addService(
	db,
	{
		name,
		duration_min,
		price,
		active = true,
		salon_id = db.salons[0]?.salon_id ?? 'sal_1',
	}
) {
	db.services.push({
		service_id: uid('s'),
		salon_id,
		name: name.trim(),
		duration_min: Number(duration_min),
		price: Number(price),
		active: !!active,
	})
	bumpRev(db)
}

export function toggleServiceActive(db, id) {
	const s = db.services.find(x => x.service_id === id)
	if (!s) return
	s.active = !s.active
	bumpRev(db)
}

/* полное удаление услуги + связей */
export function deleteService(db, serviceId) {
	// удаляем услугу
	db.services = db.services.filter(s => s.service_id !== serviceId)

	// удаляем привязки "мастер -> услуга"
	db.masterServices = db.masterServices.filter(
		ms => ms.service_id !== serviceId
	)

	// удаляем items во всех записях, где была эта услуга
	db.appointmentItems = db.appointmentItems.filter(
		it => it.service_id !== serviceId
	)

	bumpRev(db)
}

export function setMasterService(db, masterId, serviceId, enabled) {
	const idx = db.masterServices.findIndex(
		ms => ms.master_id === masterId && ms.service_id === serviceId
	)
	if (enabled && idx === -1) {
		db.masterServices.push({ master_id: masterId, service_id: serviceId })
		bumpRev(db)
	}
	if (!enabled && idx !== -1) {
		db.masterServices.splice(idx, 1)
		bumpRev(db)
	}
}

export function upsertWorkingSlot(
	db,
	{ masterId, date, start_time, end_time, is_day_off }
) {
	let cur = db.workingSlots.find(
		x => x.master_id === masterId && x.date === date
	)
	if (!cur) {
		db.workingSlots.push({
			slot_id: uid('ws'),
			master_id: masterId,
			date,
			start_time,
			end_time,
			is_day_off: !!is_day_off,
		})
	} else {
		cur.start_time = start_time
		cur.end_time = end_time
		cur.is_day_off = !!is_day_off
	}
	bumpRev(db)
}

export function fmtMoney(value) {
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		maximumFractionDigits: 0,
	}).format(value)
}
