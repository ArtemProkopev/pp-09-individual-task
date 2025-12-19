import { fillMasters, setDefaultDates } from './selects.js'

export function initFooter(dom, ctx) {
	dom.btnReset.addEventListener('click', async () => {
		await ctx.store.reset()

		const db = ctx.getDB()

		fillMasters(db, dom.bookMaster, { includeInactive: false })
		fillMasters(db, dom.schMaster, { includeInactive: false })
		setDefaultDates(dom)

		for (const fn of ctx.onReset) fn()

		dom.scheduleTable.innerHTML = ''
		dom.weekGrid.innerHTML = ''
		dom.historyTable.innerHTML = ''
	})
}
