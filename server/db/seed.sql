PRAGMA foreign_keys = ON;

DELETE FROM appointment_items;
DELETE FROM appointments;
DELETE FROM clients;
DELETE FROM working_slots;
DELETE FROM master_services;
DELETE FROM services;
DELETE FROM masters;
DELETE FROM salons;

INSERT INTO salons(salon_id, name, address, phone)
VALUES ('sal_1', 'Beauty Studio Demo', 'Demo street 1', '000');

INSERT INTO masters(master_id, salon_id, full_name, specialization, phone, active) VALUES
('m1','sal_1','Иван Иванов','Парикмахер','000',1),
('m2','sal_1','Анна Смирнова','Маникюр','000',1),
('m3','sal_1','Пётр Петров','Барбер','000',1);

INSERT INTO services(service_id, salon_id, name, duration_min, price, active) VALUES
('s1','sal_1','Стрижка женская',60,1500,1),
('s2','sal_1','Окрашивание',120,4500,1),
('s3','sal_1','Укладка',45,1200,1),
('s4','sal_1','Маникюр',60,1700,1),
('s5','sal_1','Покрытие гель-лак',45,1400,1),
('s6','sal_1','Стрижка мужская',45,1200,1);

INSERT INTO master_services(master_id, service_id) VALUES
('m1','s1'),('m1','s2'),('m1','s3'),
('m2','s4'),('m2','s5'),
('m3','s6'),('m3','s3');
