export class LRUCache {
	constructor(limit = 100) {
		this.limit = limit
		this.map = new Map()
	}

	get(key) {
		if (!this.map.has(key)) return undefined
		const value = this.map.get(key)
		this.map.delete(key)
		this.map.set(key, value)
		return value
	}

	set(key, value) {
		if (this.map.has(key)) {
			this.map.delete(key)
		} else if (this.map.size >= this.limit) {
			const firstKey = this.map.keys().next().value
			this.map.delete(firstKey)
		}
		this.map.set(key, value)
	}

	clear() {
		this.map.clear()
	}

	get size() {
		return this.map.size
	}
}
