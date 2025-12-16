import { clearSlotCache } from '../../scheduler/scheduler.js'
import { bumpRev } from '../domain/db.js'
import { buildIndexes } from '../indexes/indexes.js'
import { prepareDB, validateAndHeal } from '../schema/prepareDB.js'
import { saveDB } from '../storage/localStorage.js'

export function createStore(initialDB) {
	let db = prepareDB(initialDB)
	let ix = buildIndexes(db)
	const listeners = new Set()

	function getDB() {
		return db
	}
	function getIX() {
		return ix
	}

	function subscribe(fn) {
		listeners.add(fn)
		return () => listeners.delete(fn)
	}

	function notify() {
		for (const fn of listeners) fn(db, ix)
	}

	function commit(mutator, { clearCache = true } = {}) {
		const beforeRev = db.rev ?? 0

		mutator(db)

		validateAndHeal(db)

		const afterRev = db.rev ?? 0
		if (afterRev === beforeRev) bumpRev(db)

		saveDB(db)
		ix = buildIndexes(db)

		if (clearCache) clearSlotCache()
		notify()
	}

	function replaceDB(nextDB, { clearCache = true } = {}) {
		db = prepareDB(nextDB)
		saveDB(db)
		ix = buildIndexes(db)
		if (clearCache) clearSlotCache()
		notify()
	}

	return { getDB, getIX, commit, replaceDB, subscribe }
}
