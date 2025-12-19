// tools/gen-usecase.mjs
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const API_FILE = path.join(ROOT, 'src', 'data', 'storage', 'api.js')

const txt = fs.readFileSync(API_FILE, 'utf8')

// вытащим строки вида:  snapshot: () => j('GET', '/snapshot'),
// и вида: setAppointmentStatus: (id, status) => j('PATCH', `/appointments/${id}/status`, { status }),
const re =
	/(\w+)\s*:\s*\(?([^\)]*)\)?\s*=>\s*j\(\s*'(\w+)'\s*,\s*([`'"])(.+?)\4/g

const ops = []
let m
while ((m = re.exec(txt))) {
	const name = m[1]
	const method = m[3]
	const url = m[5]
	ops.push({ name, method, url })
}

function toUcTitle(op) {
	const map = {
		snapshot: 'Загрузить данные (snapshot)',
		reset: 'Сбросить демо-данные',
		upsertClient: 'Создать/обновить клиента',
		createAppointment: 'Создать запись',
		setAppointmentStatus: 'Изменить статус записи',
		addMaster: 'Добавить мастера',
		toggleMaster: 'Вкл/выкл мастера',
		deleteMaster: 'Удалить мастера',
		addService: 'Добавить услугу',
		toggleService: 'Вкл/выкл услугу',
		deleteService: 'Удалить услугу',
		setMasterService: 'Назначить/убрать услугу мастеру',
		upsertWorkingSlot: 'Настроить рабочий слот',
	}
	return map[op.name] ?? `${op.method} ${op.url}`
}

// грубая логика акторов по эндпоинтам
function actorsFor(op) {
	const adminOps = [
		'reset',
		'addMaster',
		'toggleMaster',
		'deleteMaster',
		'addService',
		'toggleService',
		'deleteService',
		'setMasterService',
		'upsertWorkingSlot',
		'setAppointmentStatus',
	]
	const bothOps = ['snapshot']
	const clientOps = ['upsertClient', 'createAppointment']

	const actors = new Set()
	if (adminOps.includes(op.name)) actors.add('Администратор')
	if (clientOps.includes(op.name)) actors.add('Клиент')
	if (bothOps.includes(op.name)) {
		actors.add('Клиент')
		actors.add('Администратор')
	}
	if (actors.size === 0) actors.add('Администратор')
	return [...actors]
}

let out = `@startuml
left to right direction
actor "Клиент" as Client
actor "Администратор" as Admin

rectangle "Beauty Scheduler" {
`

ops.forEach((op, i) => {
	out += `  usecase "UC-${String(i + 1).padStart(2, '0')}\\n${toUcTitle(
		op
	)}\\n(${op.method} ${op.url})" as UC${i + 1}\n`
})

out += '}\n\n'

ops.forEach((op, i) => {
	for (const a of actorsFor(op)) {
		out += `${a === 'Клиент' ? 'Client' : 'Admin'} --> UC${i + 1}\n`
	}
})

out += '\n@enduml\n'

fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true })
const dest = path.join(ROOT, 'docs', 'usecase.puml')
fs.writeFileSync(dest, out, 'utf8')
console.log('Generated:', dest)
