import {
	addMaster,
	addService,
	deleteMaster,
	deleteService,
	fmtMoney,
	getMasters,
	getServices,
	setMasterService,
	toggleMasterActive,
	toggleServiceActive,
	upsertWorkingSlot,
} from '../../data/domain/db.js'

import { clearSlotCache } from '../../scheduler/scheduler.js'
import { escapeHTML } from '../../shared/dom/dom.js'
import { refillMastersPreserve } from '../selects.js'

export function initAdmin(dom, ctx) {
	const getDB = ctx.getDB
	const commit = ctx.commit

	function renderAdminMasters() {
		const db = getDB()
		refillMastersPreserve(db, dom.admMSMaster, { includeInactive: true })
		refillMastersPreserve(db, dom.admWSMaster, { includeInactive: true })

		const masters = getMasters(db, { includeInactive: true })

		const rows = []
		rows.push(
			`<div class="tr th">
				<div>Активен</div>
				<div>Мастер</div>
				<div>Спец.</div>
				<div>Телефон</div>
				<div>Удалить</div>
			</div>`
		)

		for (const m of masters) {
			const cid = `m_active_${m.master_id}`
			rows.push(`<div class="tr">
				<div>
					<label class="checkbox-btn checkbox-btn--table" for="${cid}" title="Активность мастера">
						<input id="${cid}" type="checkbox" data-tm="${m.master_id}" ${
				m.active ? 'checked' : ''
			} />
						<span class="checkmark"></span>
					</label>
				</div>
				<div>${escapeHTML(m.full_name)}</div>
				<div>${escapeHTML(m.specialization)}</div>
				<div><span class="hint">${escapeHTML(m.phone || '—')}</span></div>
				<div class="cell-del">
					<button
						type="button"
						aria-label="Удалить"
						class="delete-button"
						data-del-master="${m.master_id}"
						title="Удалить мастера полностью"
					>
						<svg class="trash-svg" viewBox="0 -10 64 74" xmlns="http://www.w3.org/2000/svg">
							<g id="trash-can">
								<rect x="16" y="24" width="32" height="30" rx="3" ry="3" fill="currentColor"></rect>
								<g transform-origin="12 18" id="lid-group">
									<rect x="12" y="12" width="40" height="6" rx="2" ry="2" fill="currentColor"></rect>
									<rect x="26" y="8" width="12" height="4" rx="2" ry="2" fill="currentColor"></rect>
								</g>
							</g>
						</svg>
					</button>
				</div>
			</div>`)
		}

		dom.admMastersTable.innerHTML = rows.join('')
	}

	function renderAdminServices() {
		const db = getDB()
		const services = getServices(db, { includeInactive: true })

		const rows = []
		rows.push(
			`<div class="tr th">
				<div>Активна</div>
				<div>Услуга</div>
				<div>Цена</div>
				<div>Длительность</div>
				<div>Удалить</div>
			</div>`
		)

		for (const s of services) {
			const cid = `s_active_${s.service_id}`
			rows.push(`<div class="tr">
				<div>
					<label class="checkbox-btn checkbox-btn--table" for="${cid}" title="Активность услуги">
						<input id="${cid}" type="checkbox" data-ts="${s.service_id}" ${
				s.active ? 'checked' : ''
			} />
						<span class="checkmark"></span>
					</label>
				</div>
				<div>${escapeHTML(s.name)}</div>
				<div>${fmtMoney(s.price)}</div>
				<div>${escapeHTML(String(s.duration_min))} мин</div>
				<div class="cell-del">
					<button
						type="button"
						aria-label="Удалить"
						class="delete-button"
						data-del-service="${s.service_id}"
						title="Удалить услугу полностью"
					>
						<svg class="trash-svg" viewBox="0 -10 64 74" xmlns="http://www.w3.org/2000/svg">
							<g id="trash-can">
								<rect x="16" y="24" width="32" height="30" rx="3" ry="3" fill="currentColor"></rect>
								<g transform-origin="12 18" id="lid-group">
									<rect x="12" y="12" width="40" height="6" rx="2" ry="2" fill="currentColor"></rect>
									<rect x="26" y="8" width="12" height="4" rx="2" ry="2" fill="currentColor"></rect>
								</g>
							</g>
						</svg>
					</button>
				</div>
			</div>`)
		}

		dom.admServicesTable.innerHTML = rows.join('')
	}

	function renderAdminMasterServices() {
		const db = getDB()
		const allServices = getServices(db, { includeInactive: true })
		const masterId = dom.admMSMaster.value

		const current = new Set(
			db.masterServices
				.filter(ms => ms.master_id === masterId)
				.map(ms => ms.service_id)
		)

		dom.admMSChips.innerHTML = allServices
			.map(s => {
				const on = current.has(s.service_id)
				return `<button
					type="button"
					class="chip${on ? ' is-on' : ''}"
					data-msid="${s.service_id}"
					aria-pressed="${on ? 'true' : 'false'}"
				>${escapeHTML(s.name)} <small>${s.duration_min} мин • ${fmtMoney(
					s.price
				)}</small></button>`
			})
			.join('')
	}

	function renderAdminWorkingSlot() {
		const db = getDB()
		const masterId = dom.admWSMaster.value
		const date = dom.admWSDate.value

		const ws = db.workingSlots.find(
			s => s.master_id === masterId && s.date === date
		)

		dom.admWSDayOff.checked = ws?.is_day_off ?? false
		dom.admWSStart.value = ws?.start_time ?? '10:00'
		dom.admWSEnd.value = ws?.end_time ?? '18:00'
	}

	function renderAdminAll() {
		renderAdminMasters()
		renderAdminServices()
		renderAdminMasterServices()
		renderAdminWorkingSlot()
	}

	dom.admMastersTable.addEventListener('change', e => {
		const cb = e.target.closest('input[type="checkbox"][data-tm]')
		if (!cb) return

		commit(db => {
			toggleMasterActive(db, cb.dataset.tm)
		})

		ctx.refreshMastersSelects?.()
		ctx.refreshBookAfterDataChange?.()
	})

	dom.admMastersTable.addEventListener('click', e => {
		const btn = e.target.closest('button[data-del-master]')
		if (!btn) return

		const id = btn.dataset.delMaster
		const db = getDB()
		const m = db.masters.find(x => x.master_id === id)
		const name = m?.full_name ?? 'этого мастера'

		const ok = confirm(
			`Удалить мастера полностью: ${name}?\n\n` +
				`Будут удалены:\n` +
				`• привязки услуг\n` +
				`• рабочий график\n` +
				`• все записи мастера (+ их услуги)\n\n` +
				`Отменить нельзя.`
		)
		if (!ok) return

		commit(db2 => {
			deleteMaster(db2, id)
		})

		ctx.refreshMastersSelects?.()
		ctx.refreshBookAfterDataChange?.()
		renderAdminAll()
	})

	dom.admServicesTable.addEventListener('change', e => {
		const cb = e.target.closest('input[type="checkbox"][data-ts]')
		if (!cb) return

		commit(db => {
			toggleServiceActive(db, cb.dataset.ts)
		})

		ctx.refreshBookAfterDataChange?.()
	})

	dom.admServicesTable.addEventListener('click', e => {
		const btn = e.target.closest('button[data-del-service]')
		if (!btn) return

		const id = btn.dataset.delService
		const db = getDB()
		const s = db.services.find(x => x.service_id === id)
		const name = s?.name ?? 'эту услугу'

		const ok = confirm(
			`Удалить услугу полностью: ${name}?\n\n` +
				`Будут удалены:\n` +
				`• привязки к мастерам\n` +
				`• позиции услуги в уже созданных записях (appointmentItems)\n\n` +
				`Отменить нельзя.`
		)
		if (!ok) return

		commit(db2 => {
			deleteService(db2, id)
		})

		ctx.refreshBookAfterDataChange?.()
		renderAdminAll()
	})

	dom.admMSChips.addEventListener('click', e => {
		const btn = e.target.closest('.chip')
		if (!btn) return
		const masterId = dom.admMSMaster.value
		const serviceId = btn.dataset.msid
		if (!masterId || !serviceId) return

		const enabled = !btn.classList.contains('is-on')

		commit(db => {
			setMasterService(db, masterId, serviceId, enabled)
		})

		renderAdminMasterServices()
		ctx.refreshBookAfterDataChange?.()
	})

	dom.btnAddMaster.addEventListener('click', () => {
		const name = dom.admMasterName.value.trim()
		const spec = dom.admMasterSpec.value.trim()
		if (!name || !spec) return

		commit(db => {
			addMaster(db, { full_name: name, specialization: spec })
		})

		dom.admMasterName.value = ''
		dom.admMasterSpec.value = ''

		ctx.refreshMastersSelects?.()
		ctx.refreshBookAfterDataChange?.()
		renderAdminAll()
	})

	dom.btnAddService.addEventListener('click', () => {
		const name = dom.admServiceName.value.trim()
		const dur = Number(dom.admServiceDur.value)
		const price = Number(dom.admServicePrice.value)
		if (!name || !dur || dur <= 0 || price < 0) return

		commit(db => {
			addService(db, { name, duration_min: dur, price })
		})

		dom.admServiceName.value = ''
		dom.admServiceDur.value = ''
		dom.admServicePrice.value = ''

		ctx.refreshBookAfterDataChange?.()
		renderAdminAll()
	})

	dom.admMSMaster.addEventListener('change', renderAdminMasterServices)
	dom.admWSMaster.addEventListener('change', renderAdminWorkingSlot)
	dom.admWSDate.addEventListener('change', renderAdminWorkingSlot)

	dom.btnSaveWS.addEventListener('click', () => {
		const masterId = dom.admWSMaster.value
		const date = dom.admWSDate.value
		const is_day_off = dom.admWSDayOff.checked
		const start_time = dom.admWSStart.value
		const end_time = dom.admWSEnd.value

		commit(db => {
			upsertWorkingSlot(db, {
				masterId,
				date,
				start_time,
				end_time,
				is_day_off,
			})
		})

		clearSlotCache()
	})

	ctx.renderAdminAll = renderAdminAll
}
