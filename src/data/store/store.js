import { clearSlotCache } from '../../scheduler/scheduler.js'
import { buildIndexes } from '../indexes/indexes.js'
import { prepareDB } from '../schema/prepareDB.js'
import { api } from '../storage/api.js'

export function createStore() {
	let db = null
	let ix = null
	const listeners = new Set()

	function getDB() {
		if (!db) throw new Error('DB not loaded yet')
		return db
	}
	function getIX() {
		if (!ix) throw new Error('Indexes not built yet')
		return ix
	}

	function subscribe(fn) {
		listeners.add(fn)
		return () => listeners.delete(fn)
	}

	function notify() {
		for (const fn of listeners) fn(db, ix)
	}

	async function reload({ clearCache = true } = {}) {
		const snap = await api.snapshot()
		db = prepareDB(snap)
		ix = buildIndexes(db)
		if (clearCache) clearSlotCache()
		notify()
		return db
	}

	// commit = выполнить API-действие, потом перезагрузить snapshot
	async function commit(action, { clearCache = true } = {}) {
		await action()
		await reload({ clearCache })
	}

	async function reset() {
		await api.reset()
		await reload()
	}

	return { getDB, getIX, commit, reload, reset, subscribe }
}
