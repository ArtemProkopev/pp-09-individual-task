export function buildIndexes(db) {
	const mastersById = new Map(db.masters.map(m => [m.master_id, m]))
	const servicesById = new Map(db.services.map(s => [s.service_id, s]))
	const clientsById = new Map(db.clients.map(c => [c.client_id, c]))

	// phone -> client_id (ускоряет историю + автозаполнение)
	const clientIdByPhone = new Map()
	for (const c of db.clients) {
		if (c?.phone) clientIdByPhone.set(c.phone, c.client_id)
	}

	// masterId -> Set(serviceId)
	const serviceIdsByMasterId = new Map()
	for (const ms of db.masterServices) {
		let set = serviceIdsByMasterId.get(ms.master_id)
		if (!set) {
			set = new Set()
			serviceIdsByMasterId.set(ms.master_id, set)
		}
		set.add(ms.service_id)
	}

	// masterId|date -> workingSlot
	const workingSlotByKey = new Map()
	for (const ws of db.workingSlots) {
		workingSlotByKey.set(`${ws.master_id}|${ws.date}`, ws)
	}

	// appointment_id -> items[]
	const appointmentItemsByAppointmentId = new Map()
	for (const it of db.appointmentItems) {
		const key = it.appointment_id
		let arr = appointmentItemsByAppointmentId.get(key)
		if (!arr) {
			arr = []
			appointmentItemsByAppointmentId.set(key, arr)
		}
		arr.push(it)
	}

	return {
		mastersById,
		servicesById,
		clientsById,
		clientIdByPhone,
		serviceIdsByMasterId,
		workingSlotByKey,
		appointmentItemsByAppointmentId,
	}
}
