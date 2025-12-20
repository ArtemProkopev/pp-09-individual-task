import {
	fmtMoney,
	listAppointmentsByMasterAndDate,
} from '../../data/domain/db.js'
import { api } from '../../data/storage/api.js'
import {
	buildAvailableSlotsCached,
	sumDuration,
} from '../../scheduler/scheduler.js'
import { clear, delegate, el, setBusy, setText } from '../../shared/dom/dom.js'
import { loadUIState, patchUIState } from '../state.js'

export function initBook(dom, ctx) {
	let selectedServiceIds = new Set()
	let selectedSlot = null
	let pickedSlotBtn = null

	let lastAutoFilledName = ''
	let autofillEnabled = true

	const getDB = ctx.getDB
	const getIX = ctx.getIX
	const commit = ctx.commit

	function normalizePhone(v) {
		return (v ?? '').trim()
	}

	function restoreState() {
		const st = loadUIState()
		const b = st.book ?? {}

		if (b.masterId) dom.bookMaster.value = b.masterId
		if (b.date) dom.bookDate.value = b.date

		selectedServiceIds = new Set(
			Array.isArray(b.serviceIds) ? b.serviceIds : []
		)
	}

	function persistState() {
		patchUIState({
			book: {
				masterId: dom.bookMaster.value,
				date: dom.bookDate.value,
				serviceIds: [...selectedServiceIds],
			},
		})
	}

	function getSelectedServices() {
		const ix = getIX()
		const masterId = dom.bookMaster.value
		const allowed = ix.serviceIdsByMasterId.get(masterId) ?? new Set()

		const services = []
		for (const id of selectedServiceIds) {
			if (!allowed.has(id)) continue
			const s = ix.servicesById.get(id)
			if (s && s.active) services.push(s)
		}
		return services
	}

	function renderDurationAndNote() {
		const services = getSelectedServices()
		const dur = services.length ? sumDuration(services) : null
		setText(dom.bookDuration, dur ? `${dur} мин` : '—')

		const ok = Boolean(
			dom.bookMaster.value && dom.bookDate.value && services.length
		)
		dom.btnFindSlots.disabled = !ok

		// слот нужно выбрать заново после любых изменений
		dom.btnBook.disabled = true

		setText(
			dom.bookNote,
			ok
				? 'Нажмите “Показать доступное время”, затем выберите слот.'
				: 'Выбери мастера, дату и услуги.'
		)
	}

	function renderServiceChips() {
		const ix = getIX()
		const masterId = dom.bookMaster.value

		const allowed = ix.serviceIdsByMasterId.get(masterId) ?? new Set()
		const services = []
		for (const id of allowed) {
			const s = ix.servicesById.get(id)
			if (s && s.active) services.push(s)
		}

		// если сменился мастер — выкинуть выбранные услуги, которые ему недоступны
		selectedServiceIds = new Set(
			[...selectedServiceIds].filter(id => allowed.has(id))
		)

		clear(dom.bookServices)
		const frag = document.createDocumentFragment()

		for (const s of services) {
			const on = selectedServiceIds.has(s.service_id)
			const btn = el(
				'button',
				{
					className: `chip${on ? ' is-on' : ''}`,
					dataset: { sid: s.service_id },
					attrs: {
						type: 'button',
						'aria-pressed': on ? 'true' : 'false',
						title: 'Выбрать услугу',
					},
				},
				s.name,
				' ',
				el('small', null, `${s.duration_min} мин • ${fmtMoney(s.price)}`)
			)

			frag.appendChild(btn)
		}

		dom.bookServices.appendChild(frag)
		renderDurationAndNote()
	}

	function clearPickedSlot() {
		selectedSlot = null
		if (pickedSlotBtn) pickedSlotBtn.classList.remove('is-picked')
		pickedSlotBtn = null
		dom.btnBook.disabled = true
	}

	function renderSlots(slots, metaText = '') {
		clear(dom.bookSlots)
		clearPickedSlot()

		if (!slots.length) {
			dom.bookSlots.appendChild(
				el(
					'div',
					{ className: 'hint' },
					'Слоты не показаны или нет свободного времени.'
				)
			)
			if (metaText) setText(dom.bookNote, metaText)
			return
		}

		if (metaText) setText(dom.bookNote, metaText)

		const frag = document.createDocumentFragment()
		for (const s of slots) {
			frag.appendChild(
				el(
					'button',
					{
						className: 'slot',
						dataset: { start: s.start_dt, end: s.end_dt },
						attrs: { type: 'button' },
					},
					`${s.startHHMM}–${s.endHHMM}`
				)
			)
		}
		dom.bookSlots.appendChild(frag)
	}

	function tryAutofillNameByPhone() {
		if (!autofillEnabled) return
		const phone = normalizePhone(dom.clientPhone.value)
		if (!phone) return

		const ix = getIX()
		const clientId = ix.clientIdByPhone.get(phone)
		if (!clientId) return

		const client = ix.clientsById.get(clientId)
		if (!client) return

		const curName = dom.clientName.value.trim()
		const canOverwrite = !curName || curName === lastAutoFilledName

		if (canOverwrite && client.full_name && client.full_name !== curName) {
			dom.clientName.value = client.full_name
			lastAutoFilledName = client.full_name
		}
	}

	// === делегирование кликов по услугам ===
	delegate(dom.bookServices, 'click', '.chip', (e, btn) => {
		const serviceId = btn.dataset.sid
		if (!serviceId) return

		if (selectedServiceIds.has(serviceId)) selectedServiceIds.delete(serviceId)
		else selectedServiceIds.add(serviceId)

		clearPickedSlot()
		renderServiceChips()
		renderSlots([])
		persistState()
	})

	// === делегирование кликов по слотам ===
	delegate(dom.bookSlots, 'click', '.slot', (e, btn) => {
		if (pickedSlotBtn) pickedSlotBtn.classList.remove('is-picked')
		btn.classList.add('is-picked')
		pickedSlotBtn = btn

		const txt = btn.textContent.trim()
		selectedSlot = {
			start_dt: btn.dataset.start,
			end_dt: btn.dataset.end,
			startHHMM: txt.slice(0, 5),
			endHHMM: txt.slice(6, 11),
		}

		dom.btnBook.disabled = false
		setText(
			dom.bookNote,
			`Выбран слот ${selectedSlot.startHHMM}–${selectedSlot.endHHMM}. Заполните имя/телефон и создайте запись.`
		)
	})

	dom.bookMaster.addEventListener('change', () => {
		clearPickedSlot()
		renderServiceChips()
		renderSlots([])
		persistState()
	})

	dom.bookDate.addEventListener('change', () => {
		clearPickedSlot()
		renderSlots([])
		persistState()
	})

	dom.btnFindSlots.addEventListener('click', () => {
		const db = getDB()
		const ix = getIX()

		const t0 = performance.now()

		const masterId = dom.bookMaster.value
		const dateStr = dom.bookDate.value
		const services = getSelectedServices()
		const durationMin = sumDuration(services)

		const existing = listAppointmentsByMasterAndDate(db, masterId, dateStr)

		setBusy(dom.bookSlots, true)
		const { slots, fromCache } = buildAvailableSlotsCached({
			db,
			ix,
			masterId,
			dateStr,
			durationMin,
			existingAppointments: existing,
			stepMin: 15,
		})
		setBusy(dom.bookSlots, false)

		const t1 = performance.now()
		const meta = `Найдено слотов: ${slots.length}. Расчёт: ${(t1 - t0).toFixed(
			2
		)} ms. ${fromCache ? 'CACHE HIT' : 'cache miss'}`

		renderSlots(
			slots,
			slots.length
				? meta
				: 'Свободных слотов нет. Попробуйте другую дату/услуги.'
		)
	})

	dom.btnBook.addEventListener('click', async () => {
		const name = dom.clientName.value.trim()
		const phone = normalizePhone(dom.clientPhone.value)

		if (!name || !phone) {
			setText(dom.bookNote, 'Введите имя и телефон клиента.')
			return
		}
		if (!selectedSlot) {
			setText(dom.bookNote, 'Сначала выберите слот времени.')
			return
		}

		const db = getDB()
		const masterId = dom.bookMaster.value
		const dateStr = dom.bookDate.value

		const services = getSelectedServices()
		const existing = listAppointmentsByMasterAndDate(db, masterId, dateStr)

		// клиентская “страховка” от гонки, а сервер всё равно проверит конфликт
		const conflict = existing.some(
			a =>
				a.status !== 'cancelled' &&
				a.start_dt < selectedSlot.end_dt &&
				selectedSlot.start_dt < a.end_dt
		)
		if (conflict) {
			setText(dom.bookNote, 'Этот слот уже занят. Обновите доступные слоты.')
			return
		}

		let createdAppt = null

		await commit(async () => {
			const client = await api.upsertClient({ full_name: name, phone })
			createdAppt = await api.createAppointment({
				client_id: client.client_id,
				master_id: masterId,
				start_dt: selectedSlot.start_dt,
				end_dt: selectedSlot.end_dt,
				comment: dom.bookComment.value.trim(),
				items: services.map(s => ({
					service_id: s.service_id,
					price_at_time: s.price,
					duration_min_at_time: s.duration_min,
				})),
			})
		})

		if (!createdAppt) return

		setText(
			dom.bookNote,
			`Запись создана: ${createdAppt.start_dt.slice(
				11,
				16
			)}–${createdAppt.end_dt.slice(11, 16)}.`
		)

		clearPickedSlot()
		renderSlots([])
	})

	let phoneTimer = null
	dom.clientPhone.addEventListener('input', () => {
		clearTimeout(phoneTimer)
		phoneTimer = setTimeout(() => tryAutofillNameByPhone(), 180)
	})
	dom.clientPhone.addEventListener('blur', tryAutofillNameByPhone)

	dom.clientName.addEventListener('input', () => {
		autofillEnabled = false
	})

	function resetBookUI() {
		selectedServiceIds.clear()
		clearPickedSlot()
		lastAutoFilledName = ''
		autofillEnabled = true

		renderServiceChips()
		renderSlots([])
		setText(dom.bookNote, 'Выбери мастера, дату и услуги.')
	}

	ctx.onReset.push(resetBookUI)

	restoreState()
	renderServiceChips()
	renderSlots([])
	persistState()

	ctx.refreshBookAfterDataChange = () => {
		clearPickedSlot()
		renderServiceChips()
		renderSlots([])
		persistState()
	}
}
