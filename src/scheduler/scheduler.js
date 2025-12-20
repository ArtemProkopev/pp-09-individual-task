// src/scheduler/scheduler.js
import { LRUCache } from '../shared/cache/lru.js'

function toMinutes(hhmm) {
	const [h, m] = hhmm.split(':').map(Number)
	return h * 60 + m
}
function minutesToHHMM(min) {
	const h = Math.floor(min / 60)
	const m = min % 60
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function dtFromDateAndHHMM(dateStr, hhmm) {
	return `${dateStr}T${hhmm}:00`
}

export function sumDuration(services) {
	return services.reduce((a, s) => a + (Number(s.duration_min) || 0), 0)
}

function buildBusyIntervals(appts) {
	const out = []
	for (const a of appts) {
		// отменённые не блокируют слот
		if (a.status === 'cancelled') continue

		out.push([
			toMinutes(a.start_dt.slice(11, 16)),
			toMinutes(a.end_dt.slice(11, 16)),
		])
	}
	out.sort((x, y) => x[0] - y[0])
	return out
}

function hasConflict(busy, start, end) {
	for (const [bs, be] of busy) {
		// busy интервалы отсортированы
		if (bs >= end) return false
		if (be > start && bs < end) return true
	}
	return false
}

export function getWorkingWindow(db, masterId, dateStr, ix) {
	const ws = ix?.workingSlotByKey
		? ix.workingSlotByKey.get(`${masterId}|${dateStr}`)
		: db.workingSlots.find(s => s.master_id === masterId && s.date === dateStr)

	if (!ws || ws.is_day_off) return null
	return { startMin: toMinutes(ws.start_time), endMin: toMinutes(ws.end_time) }
}

const slotCache = new LRUCache(120)
const busyCache = new LRUCache(200)

export function buildAvailableSlotsCached({
	db,
	ix,
	masterId,
	dateStr,
	durationMin,
	existingAppointments,
	stepMin = 15,
}) {
	const dur = Number(durationMin) || 0
	const step = Number(stepMin) || 15
	if (dur <= 0) return { slots: [], fromCache: false }

	// db.rev — хороший инвалидационный ключ: обновили snapshot → новый rev → новый кэш
	const baseKey = `${masterId}|${dateStr}|${dur}|${step}|${db.rev}`

	const cachedSlots = slotCache.get(baseKey)
	if (cachedSlots) return { slots: cachedSlots, fromCache: true }

	const window = getWorkingWindow(db, masterId, dateStr, ix)
	if (!window) return { slots: [], fromCache: false }

	const busyKey = `${masterId}|${dateStr}|${db.rev}`
	let busy = busyCache.get(busyKey)
	if (!busy) {
		busy = buildBusyIntervals(existingAppointments)
		busyCache.set(busyKey, busy)
	}

	const slots = []
	const lastStart = window.endMin - dur

	for (let start = window.startMin; start <= lastStart; start += step) {
		const end = start + dur
		if (hasConflict(busy, start, end)) continue

		const startHHMM = minutesToHHMM(start)
		const endHHMM = minutesToHHMM(end)

		slots.push({
			startHHMM,
			endHHMM,
			start_dt: dtFromDateAndHHMM(dateStr, startHHMM),
			end_dt: dtFromDateAndHHMM(dateStr, endHHMM),
		})
	}

	slotCache.set(baseKey, slots)
	return { slots, fromCache: false }
}

export function clearSlotCache() {
	slotCache.clear()
	busyCache.clear()
}
