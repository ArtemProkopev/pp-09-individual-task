const LATEST_SCHEMA = 1

function isObj(x) {
	return x !== null && typeof x === 'object'
}
function ensureArray(db, key) {
	if (!Array.isArray(db[key])) db[key] = []
}
function ensureString(x, fallback = '') {
	return typeof x === 'string' ? x : fallback
}
function ensureNumber(x, fallback = 0) {
	const n = Number(x)
	return Number.isFinite(n) ? n : fallback
}

export function migrateDB(db) {
	const current = ensureNumber(db.schemaVersion, 0)

	if (current < 1) {
		db.schemaVersion = 1
		db.rev = ensureNumber(db.rev, 1)

		ensureArray(db, 'salons')
		ensureArray(db, 'masters')
		ensureArray(db, 'services')
		ensureArray(db, 'masterServices')
		ensureArray(db, 'workingSlots')
		ensureArray(db, 'clients')
		ensureArray(db, 'appointments')
		ensureArray(db, 'appointmentItems')
	}

	db.schemaVersion = LATEST_SCHEMA
	return db
}

export function validateAndHeal(db) {
	if (!isObj(db)) return makeEmptyDB()

	db.schemaVersion = ensureNumber(db.schemaVersion, LATEST_SCHEMA)
	db.rev = ensureNumber(db.rev, 1)

	ensureArray(db, 'salons')
	ensureArray(db, 'masters')
	ensureArray(db, 'services')
	ensureArray(db, 'masterServices')
	ensureArray(db, 'workingSlots')
	ensureArray(db, 'clients')
	ensureArray(db, 'appointments')
	ensureArray(db, 'appointmentItems')

	for (const m of db.masters) {
		if (!isObj(m)) continue
		m.master_id = ensureString(m.master_id)
		m.salon_id = ensureString(m.salon_id, db.salons[0]?.salon_id ?? 'sal_1')
		m.full_name = ensureString(m.full_name)
		m.specialization = ensureString(m.specialization)
		m.phone = ensureString(m.phone)
		m.active = Boolean(m.active)
	}

	for (const s of db.services) {
		if (!isObj(s)) continue
		s.service_id = ensureString(s.service_id)
		s.salon_id = ensureString(s.salon_id, db.salons[0]?.salon_id ?? 'sal_1')
		s.name = ensureString(s.name)
		s.duration_min = ensureNumber(s.duration_min, 0)
		s.price = ensureNumber(s.price, 0)
		s.active = Boolean(s.active)
	}

	db.masterServices = db.masterServices
		.filter(x => isObj(x))
		.map(ms => ({
			master_id: ensureString(ms.master_id),
			service_id: ensureString(ms.service_id),
		}))
		.filter(ms => ms.master_id && ms.service_id)

	db.workingSlots = db.workingSlots
		.filter(x => isObj(x))
		.map(ws => ({
			slot_id: ensureString(ws.slot_id),
			master_id: ensureString(ws.master_id ?? ws.masterId),
			date: ensureString(ws.date),
			start_time: ensureString(ws.start_time, '10:00'),
			end_time: ensureString(ws.end_time, '18:00'),
			is_day_off: Boolean(ws.is_day_off),
		}))
		.filter(ws => ws.master_id && ws.date)

	for (const c of db.clients) {
		if (!isObj(c)) continue
		c.client_id = ensureString(c.client_id)
		c.full_name = ensureString(c.full_name)
		c.phone = ensureString(c.phone)
		c.created_at = ensureString(c.created_at, new Date().toISOString())
	}

	db.appointments = db.appointments
		.filter(x => isObj(x))
		.map(a => ({
			appointment_id: ensureString(a.appointment_id),
			client_id: ensureString(a.client_id),
			master_id: ensureString(a.master_id),
			start_dt: ensureString(a.start_dt),
			end_dt: ensureString(a.end_dt),
			status: ensureString(a.status, 'booked'),
			comment: ensureString(a.comment, ''),
			created_at: ensureString(a.created_at, new Date().toISOString()),
		}))
		.filter(
			a =>
				a.appointment_id && a.client_id && a.master_id && a.start_dt && a.end_dt
		)

	db.appointmentItems = db.appointmentItems
		.filter(x => isObj(x))
		.map(it => ({
			appointment_item_id: ensureString(it.appointment_item_id),
			appointment_id: ensureString(it.appointment_id),
			service_id: ensureString(it.service_id),
			price_at_time: ensureNumber(it.price_at_time, 0),
			duration_min_at_time: ensureNumber(it.duration_min_at_time, 0),
		}))
		.filter(it => it.appointment_item_id && it.appointment_id && it.service_id)

	return db
}

export function prepareDB(db) {
	return validateAndHeal(migrateDB(db))
}

function makeEmptyDB() {
	return {
		schemaVersion: LATEST_SCHEMA,
		rev: 1,
		salons: [],
		masters: [],
		services: [],
		masterServices: [],
		workingSlots: [],
		clients: [],
		appointments: [],
		appointmentItems: [],
	}
}
