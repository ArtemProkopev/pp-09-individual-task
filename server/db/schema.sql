PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS salons (
  salon_id TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  address  TEXT NOT NULL,
  phone    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS masters (
  master_id TEXT PRIMARY KEY,
  salon_id  TEXT NOT NULL,
  full_name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  phone     TEXT NOT NULL DEFAULT '',
  active    INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (salon_id) REFERENCES salons(salon_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS services (
  service_id TEXT PRIMARY KEY,
  salon_id   TEXT NOT NULL,
  name       TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  price      INTEGER NOT NULL,
  active     INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (salon_id) REFERENCES salons(salon_id) ON DELETE CASCADE
);

-- M:N master <-> service
CREATE TABLE IF NOT EXISTS master_services (
  master_id  TEXT NOT NULL,
  service_id TEXT NOT NULL,
  PRIMARY KEY (master_id, service_id),
  FOREIGN KEY (master_id) REFERENCES masters(master_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- график на дату: один слот на (master, date)
CREATE TABLE IF NOT EXISTS working_slots (
  slot_id    TEXT PRIMARY KEY,
  master_id  TEXT NOT NULL,
  date       TEXT NOT NULL,   -- YYYY-MM-DD
  start_time TEXT NOT NULL,   -- HH:MM
  end_time   TEXT NOT NULL,   -- HH:MM
  is_day_off INTEGER NOT NULL DEFAULT 0,
  UNIQUE(master_id, date),
  FOREIGN KEY (master_id) REFERENCES masters(master_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clients (
  client_id  TEXT PRIMARY KEY,
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  appointment_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  master_id TEXT NOT NULL,
  start_dt  TEXT NOT NULL,  -- ISO
  end_dt    TEXT NOT NULL,  -- ISO
  status    TEXT NOT NULL CHECK(status IN ('booked','completed','cancelled','no_show')),
  comment   TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
  FOREIGN KEY (master_id) REFERENCES masters(master_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appt_master_start ON appointments(master_id, start_dt);
CREATE INDEX IF NOT EXISTS idx_appt_client_start ON appointments(client_id, start_dt);

CREATE TABLE IF NOT EXISTS appointment_items (
  appointment_item_id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  price_at_time INTEGER NOT NULL,
  duration_min_at_time INTEGER NOT NULL,
  FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_items_appt ON appointment_items(appointment_id);
