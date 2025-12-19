import Database from 'better-sqlite3'
import cors from 'cors'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

/**
 * Надёжные пути: считаем всё от папки, где лежит ЭТОТ server.js
 * (неважно, откуда ты запускаешь node)
 */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// server/db
const DB_DIR = path.join(__dirname, 'db')
const DB_PATH = path.join(DB_DIR, 'beauty_scheduler.db')
const SCHEMA_SQL = path.join(DB_DIR, 'schema.sql')
const SEED_SQL = path.join(DB_DIR, 'seed.sql')

/** Создаём папку db если нет */
fs.mkdirSync(DB_DIR, { recursive: true })

const app = express()

/**
 * Если фронт будет открываться с ЭТОГО ЖЕ домена/порта (http://localhost:5174),
 * то CORS вообще не нужен, но пусть останется — не мешает.
 */
app.use(cors())

app.use(express.json())

/** Открываем SQLite */
const db = new Database(DB_PATH)
db.pragma('foreign_keys = ON')

function runSqlFile(absPath) {
	const sql = fs.readFileSync(absPath, 'utf8')
	db.exec(sql)
}

// init schema
runSqlFile(SCHEMA_SQL)

// helper uid
function uid(prefix = 'id') {
	return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}
function nowIso() {
	return new Date().toISOString()
}

// reseed + generate working slots (21 day)
function reseed() {
	runSqlFile(SEED_SQL)

	const masters = db.prepare('SELECT master_id FROM masters').all()
	const ins = db.prepare(`
    INSERT OR REPLACE INTO working_slots(slot_id, master_id, date, start_time, end_time, is_day_off)
    VALUES (@slot_id, @master_id, @date, @start_time, @end_time, @is_day_off)
  `)

	const today = new Date()
	for (let i = 0; i < 21; i++) {
		const d = new Date(today)
		d.setDate(today.getDate() + i)
		const day = d.getDay()
		const date = d.toISOString().slice(0, 10)

		for (const m of masters) {
			const isDayOff = day === 0 // воскресенье
			ins.run({
				slot_id: `${m.master_id}_${date}`,
				master_id: m.master_id,
				date,
				start_time: isDayOff ? '00:00' : '10:00',
				end_time: isDayOff ? '00:00' : '18:00',
				is_day_off: isDayOff ? 1 : 0,
			})
		}
	}
}

const hasSalon = db.prepare('SELECT COUNT(*) AS c FROM salons').get().c > 0
if (!hasSalon) reseed()

/** --- API --- **/

app.get('/api/health', (req, res) => {
	res.json({ ok: true })
})

// snapshot: отдать всё, чтобы фронт работал как раньше
app.get('/api/snapshot', (req, res) => {
	const snapshot = {
		salons: db.prepare('SELECT * FROM salons').all(),
		masters: db.prepare('SELECT * FROM masters').all(),
		services: db.prepare('SELECT * FROM services').all(),
		masterServices: db
			.prepare('SELECT master_id, service_id FROM master_services')
			.all(),
		workingSlots: db.prepare('SELECT * FROM working_slots').all(),
		clients: db.prepare('SELECT * FROM clients').all(),
		appointments: db.prepare('SELECT * FROM appointments').all(),
		appointmentItems: db.prepare('SELECT * FROM appointment_items').all(),
		schemaVersion: 1,
		rev: Date.now(),
	}
	res.json(snapshot)
})

app.post('/api/reset', (req, res) => {
	reseed()
	res.json({ ok: true })
})

// upsert client by phone
app.post('/api/clients/upsert', (req, res) => {
	const { full_name, phone } = req.body ?? {}
	if (!full_name?.trim() || !phone?.trim())
		return res.status(400).json({ error: 'bad input' })

	const normalized = phone.trim()
	const row = db.prepare('SELECT * FROM clients WHERE phone=?').get(normalized)

	if (!row) {
		const client = {
			client_id: uid('cli'),
			full_name: full_name.trim(),
			phone: normalized,
			created_at: nowIso(),
		}
		db.prepare(
			'INSERT INTO clients(client_id, full_name, phone, created_at) VALUES (@client_id,@full_name,@phone,@created_at)'
		).run(client)
		return res.json(client)
	} else {
		const newName = full_name.trim()
		if (newName && row.full_name !== newName) {
			db.prepare('UPDATE clients SET full_name=? WHERE client_id=?').run(
				newName,
				row.client_id
			)
			const updated = db
				.prepare('SELECT * FROM clients WHERE client_id=?')
				.get(row.client_id)
			return res.json(updated)
		}
		return res.json(row)
	}
})

// create appointment + items (transaction)
app.post('/api/appointments', (req, res) => {
	const p = req.body ?? {}
	if (
		!p.client_id ||
		!p.master_id ||
		!p.start_dt ||
		!p.end_dt ||
		!Array.isArray(p.items) ||
		!p.items.length
	) {
		return res.status(400).json({ error: 'bad input' })
	}

	const appointment_id = uid('apt')
	const tx = db.transaction(() => {
		db.prepare(
			`
      INSERT INTO appointments(appointment_id, client_id, master_id, start_dt, end_dt, status, comment, created_at)
      VALUES (?,?,?,?,?,'booked',?,?)
    `
		).run(
			appointment_id,
			p.client_id,
			p.master_id,
			p.start_dt,
			p.end_dt,
			p.comment ?? '',
			nowIso()
		)

		const insItem = db.prepare(`
      INSERT INTO appointment_items(appointment_item_id, appointment_id, service_id, price_at_time, duration_min_at_time)
      VALUES (?,?,?,?,?)
    `)

		for (const it of p.items) {
			insItem.run(
				uid('ait'),
				appointment_id,
				it.service_id,
				it.price_at_time,
				it.duration_min_at_time
			)
		}
	})

	tx()
	const appt = db
		.prepare('SELECT * FROM appointments WHERE appointment_id=?')
		.get(appointment_id)
	res.json(appt)
})

app.patch('/api/appointments/:id/status', (req, res) => {
	const { status } = req.body ?? {}
	const id = req.params.id
	if (!['completed', 'cancelled', 'no_show', 'booked'].includes(status))
		return res.status(400).json({ error: 'bad status' })
	db.prepare('UPDATE appointments SET status=? WHERE appointment_id=?').run(
		status,
		id
	)
	res.json({ ok: true })
})

// admin: add master/service, toggle, delete, set master-service, upsert working slot
app.post('/api/masters', (req, res) => {
	const {
		full_name,
		specialization,
		phone = '',
		active = 1,
		salon_id = 'sal_1',
	} = req.body ?? {}
	if (!full_name?.trim() || !specialization?.trim())
		return res.status(400).json({ error: 'bad input' })
	const master = {
		master_id: uid('m'),
		salon_id,
		full_name: full_name.trim(),
		specialization: specialization.trim(),
		phone: phone.trim(),
		active: active ? 1 : 0,
	}
	db.prepare(
		'INSERT INTO masters VALUES (@master_id,@salon_id,@full_name,@specialization,@phone,@active)'
	).run(master)
	res.json(master)
})

app.patch('/api/masters/:id/toggle', (req, res) => {
	const id = req.params.id
	db.prepare(
		'UPDATE masters SET active = CASE WHEN active=1 THEN 0 ELSE 1 END WHERE master_id=?'
	).run(id)
	res.json({ ok: true })
})

app.delete('/api/masters/:id', (req, res) => {
	db.prepare('DELETE FROM masters WHERE master_id=?').run(req.params.id)
	res.json({ ok: true })
})

app.post('/api/services', (req, res) => {
	const {
		name,
		duration_min,
		price,
		active = 1,
		salon_id = 'sal_1',
	} = req.body ?? {}
	if (!name?.trim()) return res.status(400).json({ error: 'bad input' })
	const svc = {
		service_id: uid('s'),
		salon_id,
		name: name.trim(),
		duration_min: Number(duration_min),
		price: Number(price),
		active: active ? 1 : 0,
	}
	db.prepare(
		'INSERT INTO services VALUES (@service_id,@salon_id,@name,@duration_min,@price,@active)'
	).run(svc)
	res.json(svc)
})

app.patch('/api/services/:id/toggle', (req, res) => {
	db.prepare(
		'UPDATE services SET active = CASE WHEN active=1 THEN 0 ELSE 1 END WHERE service_id=?'
	).run(req.params.id)
	res.json({ ok: true })
})

app.delete('/api/services/:id', (req, res) => {
	db.prepare('DELETE FROM services WHERE service_id=?').run(req.params.id)
	res.json({ ok: true })
})

app.put('/api/master-services', (req, res) => {
	const { master_id, service_id, enabled } = req.body ?? {}
	if (!master_id || !service_id)
		return res.status(400).json({ error: 'bad input' })
	if (enabled) {
		db.prepare(
			'INSERT OR IGNORE INTO master_services(master_id, service_id) VALUES (?,?)'
		).run(master_id, service_id)
	} else {
		db.prepare(
			'DELETE FROM master_services WHERE master_id=? AND service_id=?'
		).run(master_id, service_id)
	}
	res.json({ ok: true })
})

app.put('/api/working-slots', (req, res) => {
	const { master_id, date, start_time, end_time, is_day_off } = req.body ?? {}
	if (!master_id || !date) return res.status(400).json({ error: 'bad input' })
	const slot_id = `${master_id}_${date}`
	db.prepare(
		`
    INSERT INTO working_slots(slot_id, master_id, date, start_time, end_time, is_day_off)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(master_id, date) DO UPDATE SET
      start_time=excluded.start_time,
      end_time=excluded.end_time,
      is_day_off=excluded.is_day_off
  `
	).run(
		slot_id,
		master_id,
		date,
		start_time ?? '10:00',
		end_time ?? '18:00',
		is_day_off ? 1 : 0
	)
	res.json({ ok: true })
})

/**
 * ===== FRONTEND STATIC =====
 * Раздаём фронт из корня проекта pp-09/
 * (там лежат index.html, styles.css, src/ и т.д.)
 */
const FRONT_ROOT = path.join(__dirname, '..')
app.use(express.static(FRONT_ROOT))

// Любой маршрут НЕ начинающийся с /api -> index.html
app.get(/^\/(?!api\/).*/, (req, res) => {
	res.sendFile(path.join(FRONT_ROOT, 'index.html'))
})

/** Запуск */
const PORT = 5174
app.listen(PORT, () => {
	console.log(`API + Front on http://localhost:${PORT}`)
	console.log(`SQLite file: ${DB_PATH}`)
	console.log(`Schema: ${SCHEMA_SQL}`)
	console.log(`Seed:   ${SEED_SQL}`)
	console.log(`Front:  ${FRONT_ROOT}`)
})
