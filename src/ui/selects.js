import { getMasters } from '../data/domain/db.js'
import { escapeHTML } from '../shared/dom/dom.js'

export function fillMasters(db, selectEl, { includeInactive = false } = {}) {
	const masters = getMasters(db, { includeInactive })
	selectEl.innerHTML = masters
		.map(
			m =>
				`<option value="${m.master_id}">${escapeHTML(
					m.full_name
				)} — ${escapeHTML(m.specialization)}${
					m.active ? '' : ' (inactive)'
				}</option>`
		)
		.join('')
}

export function refillMastersPreserve(db, selectEl, opts) {
	const prev = selectEl.value
	fillMasters(db, selectEl, opts)
	if ([...selectEl.options].some(o => o.value === prev)) selectEl.value = prev
}

export function setDefaultDates(dom) {
	const today = new Date().toISOString().slice(0, 10)
	dom.bookDate.value = today
	dom.schDate.value = today
	dom.admWSDate.value = today
}
