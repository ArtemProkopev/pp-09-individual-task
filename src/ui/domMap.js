import { $ } from '../shared/dom/dom.js'

export function getDom() {
	return {
		tabs: $('tabs'),

		bookMaster: $('bookMaster'),
		bookDate: $('bookDate'),
		bookServices: $('bookServices'),
		bookDuration: $('bookDuration'),
		btnFindSlots: $('btnFindSlots'),
		bookSlots: $('bookSlots'),
		clientName: $('clientName'),
		clientPhone: $('clientPhone'),
		bookComment: $('bookComment'),
		bookNote: $('bookNote'),
		btnBook: $('btnBook'),

		schMaster: $('schMaster'),
		schDate: $('schDate'),
		schMode: $('schMode'),
		btnRefreshSchedule: $('btnRefreshSchedule'),
		schNote: $('schNote'),
		scheduleTable: $('scheduleTable'),
		weekGrid: $('weekGrid'),

		hisPhone: $('hisPhone'),
		hisStatus: $('hisStatus'),
		btnFindHistory: $('btnFindHistory'),
		hisNote: $('hisNote'),
		historyTable: $('historyTable'),

		admMasterName: $('admMasterName'),
		admMasterSpec: $('admMasterSpec'),
		btnAddMaster: $('btnAddMaster'),
		admMastersTable: $('admMastersTable'),

		admServiceName: $('admServiceName'),
		admServiceDur: $('admServiceDur'),
		admServicePrice: $('admServicePrice'),
		btnAddService: $('btnAddService'),
		admServicesTable: $('admServicesTable'),

		admMSMaster: $('admMSMaster'),
		admMSChips: $('admMSChips'),

		admWSMaster: $('admWSMaster'),
		admWSDate: $('admWSDate'),
		admWSDayOff: $('admWSDayOff'),
		admWSStart: $('admWSStart'),
		admWSEnd: $('admWSEnd'),
		btnSaveWS: $('btnSaveWS'),

		btnReset: $('btnReset'),
	}
}
