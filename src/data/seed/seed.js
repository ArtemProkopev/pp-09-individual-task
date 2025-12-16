export function makeSeed() {
	const salon_id = 'sal_1'

	const masters = [
		{
			master_id: 'm1',
			salon_id,
			full_name: 'Ирина Коваленко',
			specialization: 'Парикмахер',
			phone: '000',
			active: true,
		},
		{
			master_id: 'm2',
			salon_id,
			full_name: 'Мария Стэн',
			specialization: 'Маникюр',
			phone: '000',
			active: true,
		},
		{
			master_id: 'm3',
			salon_id,
			full_name: 'Александр Поп',
			specialization: 'Барбер',
			phone: '000',
			active: true,
		},
	]

	const services = [
		{
			service_id: 's1',
			salon_id,
			name: 'Стрижка женская',
			duration_min: 60,
			price: 1500,
			active: true,
		},
		{
			service_id: 's2',
			salon_id,
			name: 'Окрашивание',
			duration_min: 120,
			price: 4500,
			active: true,
		},
		{
			service_id: 's3',
			salon_id,
			name: 'Укладка',
			duration_min: 45,
			price: 1200,
			active: true,
		},
		{
			service_id: 's4',
			salon_id,
			name: 'Маникюр',
			duration_min: 60,
			price: 1700,
			active: true,
		},
		{
			service_id: 's5',
			salon_id,
			name: 'Покрытие гель-лак',
			duration_min: 45,
			price: 1400,
			active: true,
		},
		{
			service_id: 's6',
			salon_id,
			name: 'Стрижка мужская',
			duration_min: 45,
			price: 1200,
			active: true,
		},
	]

	const masterServices = [
		{ master_id: 'm1', service_id: 's1' },
		{ master_id: 'm1', service_id: 's2' },
		{ master_id: 'm1', service_id: 's3' },
		{ master_id: 'm2', service_id: 's4' },
		{ master_id: 'm2', service_id: 's5' },
		{ master_id: 'm3', service_id: 's6' },
		{ master_id: 'm3', service_id: 's3' },
	]

	const workingSlots = []
	const today = new Date()

	for (let i = 0; i < 21; i++) {
		const d = new Date(today)
		d.setDate(today.getDate() + i)
		const day = d.getDay()
		const date = d.toISOString().slice(0, 10)

		for (const m of masters) {
			if (day === 0) {
				workingSlots.push({
					slot_id: `${m.master_id}_${date}`,
					master_id: m.master_id,
					date,
					start_time: '00:00',
					end_time: '00:00',
					is_day_off: true,
				})
			} else {
				workingSlots.push({
					slot_id: `${m.master_id}_${date}`,
					master_id: m.master_id,
					date,
					start_time: '10:00',
					end_time: '18:00',
					is_day_off: false,
				})
			}
		}
	}

	return {
		schemaVersion: 1,
		rev: 1,
		salons: [
			{
				salon_id,
				name: 'Beauty Studio Demo',
				address: 'Demo street 1',
				phone: '000',
			},
		],
		masters,
		services,
		masterServices,
		workingSlots,
		clients: [],
		appointments: [],
		appointmentItems: [],
	}
}
