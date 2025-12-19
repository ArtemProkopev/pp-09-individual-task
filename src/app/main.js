import { getDom } from '../ui/domMap.js'
import { initRouter } from '../ui/router.js'
import {
	fillMasters,
	refillMastersPreserve,
	setDefaultDates,
} from '../ui/selects.js'

import { initFooter } from '../ui/footer.js'
import { initAdmin } from '../ui/pages/admin.js'
import { initBook } from '../ui/pages/book.js'
import { initHistory } from '../ui/pages/history.js'
import { initSchedule } from '../ui/pages/schedule.js'

import { createStore } from '../data/store/store.js'
import { loadUIState } from '../ui/state.js'

const dom = getDom()

async function bootstrap() {
	const store = createStore()
	await store.reload()

	const ctx = {
		store,

		getDB: store.getDB,
		getIX: store.getIX,
		commit: store.commit,

		onReset: [],

		renderAdminAll: null,
		renderSchedule: null,
		renderHistory: null,

		refreshMastersSelects: () => {
			const db = store.getDB()
			refillMastersPreserve(db, dom.bookMaster, { includeInactive: false })
			refillMastersPreserve(db, dom.schMaster, { includeInactive: false })
			refillMastersPreserve(db, dom.admMSMaster, { includeInactive: true })
			refillMastersPreserve(db, dom.admWSMaster, { includeInactive: true })
		},

		refreshBookAfterDataChange: null,
	}

	// init base UI
	fillMasters(store.getDB(), dom.bookMaster, { includeInactive: false })
	fillMasters(store.getDB(), dom.schMaster, { includeInactive: false })
	setDefaultDates(dom)

	// init modules
	initBook(dom, ctx)
	initSchedule(dom, ctx)
	initHistory(dom, ctx)
	initAdmin(dom, ctx)
	initFooter(dom, ctx)

	// router: start with saved tab
	const ui = loadUIState()

	const router = initRouter(dom, {
		initialRoute: ui.route || 'book',
		onRoute: route => {
			if (route === 'admin') ctx.renderAdminAll?.()
			if (route === 'schedule') ctx.renderSchedule?.()
			if (route === 'history') ctx.renderHistory?.()
		},
	})

	router.setRoute(ui.route || 'book')
}

bootstrap().catch(err => {
	console.error(err)
	alert('Ошибка запуска. Проверь, запущен ли сервер на http://localhost:5174')
})
