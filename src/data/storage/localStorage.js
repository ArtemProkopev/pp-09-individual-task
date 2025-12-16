const KEY = 'beauty_scheduler_v1'

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
