import { fmtMoney } from '../../data/domain/db.js'
import { escapeHTML } from '../../shared/dom/dom.js'
import { loadUIState, patchUIState } from '../state.js'

export function initHistory(dom, ctx) {
	const getDB = ctx.getDB
	const getIX = ctx.getIX

	function badgeForStatus(status) {
		if (status === 'completed') return `<span class="badge ok">completed</span>`
		if (status === 'cancelled')
			return `<span class="badge bad">cancelled</span>`
		if (status === 'no_show') return `<span class="badge bad">no_show</span>`
		return `<span class="badge neutral">booked</span>`
	}

	function persistHistoryState() {
		patchUIState({
			history: {
				phone: dom.hisPhone.value.trim(),
				status: dom.hisStatus.value,
			},
		})
	}

	function restoreHistoryState() {
		const st = loadUIState()
		const h = st.history ?? {}
		if (h.phone) dom.hisPhone.value = h.phone
		if (h.status) dom.hisStatus.value = h.status
	}

	function renderHistory() {
		const db = getDB()
		const ix = getIX()

		const phone = dom.hisPhone.value.trim()
		const status = dom.hisStatus.value

		if (!phone) {
			dom.hisNote.textContent = 'Введите телефон.'
			dom.historyTable.innerHTML = ''
			return
		}

		const clientId = ix.clientIdByPhone.get(phone)
		if (!clientId) {
			dom.hisNote.textContent = 'Клиент с таким телефоном не найден.'
			dom.historyTable.innerHTML = ''
			return
		}

		const client = ix.clientsById.get(clientId)
		let items = db.appointments.filter(a => a.client_id === clientId)
		if (status !== 'all') items = items.filter(a => a.status === status)
		items.sort((a, b) => b.start_dt.localeCompare(a.start_dt))

		if (!items.length) {
			// textContent: не экранируем
			dom.hisNote.textContent = `История пуста для ${client?.full_name ?? '—'}.`
			dom.historyTable.innerHTML = ''
			return
		}

		dom.hisNote.textContent = `Найдено записей: ${items.length} для ${
			client?.full_name ?? '—'
		}.`

		const rows = []
		rows.push(
			`<div class="tr th"><div>Дата/время</div><div>Мастер / услуги</div><div>Сумма</div><div>Статус</div></div>`
		)

		for (const a of items) {
			const master = ix.mastersById.get(a.master_id)
			const its = ix.appointmentItemsByAppointmentId.get(a.appointment_id) ?? []
			const services = its
				.map(it => ix.servicesById.get(it.service_id))
				.filter(Boolean)

			const total = services.reduce((acc, s) => acc + s.price, 0)
			const dt = `${a.start_dt.slice(0, 10)} ${a.start_dt.slice(
				11,
				16
			)}–${a.end_dt.slice(11, 16)}`
			const who =
				`${escapeHTML(master?.full_name ?? '—')}<br/>` +
				`<span class="hint">${services
					.map(s => escapeHTML(s.name))
					.join(', ')}</span>`

			rows.push(`<div class="tr">
				<div>${dt}</div>
				<div>${who}</div>
				<div>${fmtMoney(total)}</div>
				<div>${badgeForStatus(a.status)}</div>
			</div>`)
		}

		dom.historyTable.innerHTML = rows.join('')
	}

	dom.btnFindHistory.addEventListener('click', () => {
		persistHistoryState()
		renderHistory()
	})
	dom.hisStatus.addEventListener('change', () => {
		persistHistoryState()
		renderHistory()
	})
	dom.hisPhone.addEventListener('blur', persistHistoryState)

	ctx.onReset.push(() => {
		dom.historyTable.innerHTML = ''
		dom.hisNote.textContent = 'Введите телефон и нажмите “Найти”.'
	})

	ctx.renderHistory = renderHistory

	restoreHistoryState()
}
