import {
	listAppointmentsByMasterAndDate,
	listAppointmentsByMasterRange,
} from '../../data/domain/db.js'
import { api } from '../../data/storage/api.js'
import { escapeHTML } from '../../shared/dom/dom.js'
import { loadUIState, patchUIState } from '../state.js'

export function initSchedule(dom, ctx) {
	const getDB = ctx.getDB
	const getIX = ctx.getIX
	const commit = ctx.commit

	function badgeForStatus(status) {
		if (status === 'completed') return `<span class="badge ok">completed</span>`
		if (status === 'cancelled')
			return `<span class="badge bad">cancelled</span>`
		if (status === 'no_show') return `<span class="badge bad">no_show</span>`
		return `<span class="badge neutral">booked</span>`
	}

	function startOfWeek(dateStr) {
		const d = new Date(dateStr + 'T00:00:00')
		const day = (d.getDay() + 6) % 7
		d.setDate(d.getDate() - day)
		return d
	}
	function fmtDayLabel(d) {
		const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
		const idx = (d.getDay() + 6) % 7
		return names[idx]
	}
	function isoDate(d) {
		return d.toISOString().slice(0, 10)
	}

	function persistScheduleState() {
		patchUIState({
			schedule: {
				masterId: dom.schMaster.value,
				date: dom.schDate.value,
				mode: dom.schMode.value,
			},
		})
	}

	function restoreScheduleState() {
		const st = loadUIState()
		const s = st.schedule ?? {}
		if (s.masterId) dom.schMaster.value = s.masterId
		if (s.date) dom.schDate.value = s.date
		if (s.mode) dom.schMode.value = s.mode
	}

	function renderScheduleDay(masterId, dateStr) {
		const db = getDB()
		const ix = getIX()

		const appts = listAppointmentsByMasterAndDate(db, masterId, dateStr)
		const masterName = ix.mastersById.get(masterId)?.full_name ?? 'Мастер'

		dom.weekGrid.innerHTML = ''
		if (!appts.length) {
			// ВАЖНО: textContent безопасен, escapeHTML не нужен
			dom.schNote.textContent = `${masterName}: записей на ${dateStr} нет.`
			dom.scheduleTable.innerHTML = ''
			return
		}

		dom.schNote.textContent = `${masterName}: записей на ${dateStr} — ${appts.length}`

		const rows = []
		rows.push(
			`<div class="tr th"><div>Время</div><div>Клиент / услуги</div><div>Статус</div><div>Действие</div></div>`
		)

		for (const a of appts) {
			const items =
				ix.appointmentItemsByAppointmentId.get(a.appointment_id) ?? []
			const serviceNames = items
				.map(it => ix.servicesById.get(it.service_id)?.name ?? '—')
				.map(escapeHTML)
				.join(', ')

			const client = ix.clientsById.get(a.client_id)

			const time = `${a.start_dt.slice(11, 16)}–${a.end_dt.slice(11, 16)}`
			const who =
				`${escapeHTML(client?.full_name ?? '—')} ` +
				`<span class="hint">(${escapeHTML(client?.phone ?? '')})</span><br/>` +
				`<span class="hint">${serviceNames}</span>`

			const actions = `
				<select data-act="${a.appointment_id}" aria-label="Изменить статус">
					<option value="">—</option>
					<option value="completed">completed</option>
					<option value="cancelled">cancelled</option>
					<option value="no_show">no_show</option>
				</select>
			`

			rows.push(`<div class="tr">
				<div>${time}</div>
				<div>${who}</div>
				<div>${badgeForStatus(a.status)}</div>
				<div>${actions}</div>
			</div>`)
		}

		dom.scheduleTable.innerHTML = rows.join('')
	}

	function renderScheduleWeek(masterId, dateStr) {
		const db = getDB()
		const ix = getIX()

		dom.scheduleTable.innerHTML = ''

		const start = startOfWeek(dateStr)
		const days = []
		for (let i = 0; i < 7; i++) {
			const d = new Date(start)
			d.setDate(start.getDate() + i)
			days.push(d)
		}

		const from = isoDate(days[0])
		const to = isoDate(days[6])

		const masterName = ix.mastersById.get(masterId)?.full_name ?? 'Мастер'
		const appts = listAppointmentsByMasterRange(db, masterId, from, to)

		const byDay = new Map(days.map(d => [isoDate(d), []]))
		for (const a of appts) byDay.get(a.start_dt.slice(0, 10))?.push(a)

		// textContent: не экранируем
		dom.schNote.textContent = `${masterName}: неделя ${from} — ${to}. Всего записей: ${appts.length}`

		const root = dom.weekGrid
		root.innerHTML = ''

		for (const d of days) {
			const ds = isoDate(d)
			const list = byDay.get(ds) ?? []
			list.sort((a, b) => a.start_dt.localeCompare(b.start_dt))

			const box = document.createElement('div')
			box.className = 'week__day'

			const head = document.createElement('div')
			head.className = 'week__head'
			head.innerHTML = `<div class="week__date">${fmtDayLabel(
				d
			)} • ${ds}</div><div class="week__meta">${list.length} записей</div>`
			box.appendChild(head)

			const ul = document.createElement('div')
			ul.className = 'week__list'

			if (!list.length) {
				ul.innerHTML = `<div class="week__item"><span class="hint">Нет записей</span></div>`
			} else {
				for (const a of list) {
					const item = document.createElement('button')
					item.type = 'button'
					item.className = 'week__item'
					item.innerHTML = `<b>${a.start_dt.slice(11, 16)}–${a.end_dt.slice(
						11,
						16
					)}</b> • ${badgeForStatus(a.status)}`
					item.style.cursor = 'pointer'
					item.title = 'Клик — открыть этот день'
					item.addEventListener('click', () => {
						dom.schMode.value = 'day'
						dom.schDate.value = ds
						persistScheduleState()
						renderSchedule()
					})
					ul.appendChild(item)
				}
			}

			box.appendChild(ul)
			root.appendChild(box)
		}
	}

	function renderSchedule() {
		const masterId = dom.schMaster.value
		const dateStr = dom.schDate.value
		const mode = dom.schMode.value

		if (!masterId || !dateStr) {
			dom.schNote.textContent = 'Выбери мастера и дату.'
			dom.scheduleTable.innerHTML = ''
			dom.weekGrid.innerHTML = ''
			return
		}

		if (mode === 'week') renderScheduleWeek(masterId, dateStr)
		else renderScheduleDay(masterId, dateStr)
	}

	dom.btnRefreshSchedule.addEventListener('click', () => {
		persistScheduleState()
		renderSchedule()
	})
	dom.schMaster.addEventListener('change', () => {
		persistScheduleState()
		renderSchedule()
	})
	dom.schDate.addEventListener('change', () => {
		persistScheduleState()
		renderSchedule()
	})
	dom.schMode.addEventListener('change', () => {
		persistScheduleState()
		renderSchedule()
	})

	dom.scheduleTable.addEventListener('change', async e => {
		const sel = e.target.closest('select[data-act]')
		if (!sel) return
		const id = sel.dataset.act
		const status = sel.value
		if (!status) return

		await commit(async () => {
			await api.setAppointmentStatus(id, status)
		})

		renderSchedule()
	})

	ctx.onReset.push(() => {
		dom.scheduleTable.innerHTML = ''
		dom.weekGrid.innerHTML = ''
		dom.schNote.textContent = 'Выбери мастера и дату.'
	})

	ctx.renderSchedule = renderSchedule

	restoreScheduleState()
}
