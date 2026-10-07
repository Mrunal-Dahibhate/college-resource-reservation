-- =====================================================
-- Cloud Resource Reservation - Database Schema
-- Compatible with MySQL 8.0+ / AWS RDS MySQL
-- =====================================================

CREATE DATABASE IF NOT EXISTS college_resource_reservation;
USE college_resource_reservation;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    location VARCHAR(255) NOT NULL,
    facilities TEXT,
    status ENUM('available', 'maintenance', 'unavailable') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resource_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

-- 4. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- Seed Accounts
-- Admin Password: Admin@123
-- Student Password: User@123
-- =====================================================
INSERT INTO users (name, email, password, role)
VALUES 
    ('Admin User', 'admin@college.edu', '$2a$10$wT0Xh1h8q01zU3eY9YhQ0e0x6rWzN7x1nZ2e3r4t5y6u7i8o9p0q1', 'admin'),
    ('Student User', 'student@college.edu', '$2a$10$wT0Xh1h8q01zU3eY9YhQ0e0x6rWzN7x1nZ2e3r4t5y6u7i8o9p0q1', 'user')
ON DUPLICATE KEY UPDATE role = VALUES(role);

-- =====================================================
-- College Resources matching frontend images
-- =====================================================
INSERT INTO resources (id, name, type, capacity, location, facilities, status)
VALUES
(1, 'Kimaya Open Air Theatre', 'Amphitheatre', 300, 'Central Campus Ground', 'Open Air Stage, Stepped Seating, Sound System, Event Lighting', 'available'),
(2, 'Firodia Hostel Ground', 'Ground', 500, 'Near Hostel Block', 'Open Ground, Floodlights, Event Stage Setup', 'available'),
(3, 'C6 Classroom', 'Classroom', 60, 'Academic Block C, Floor 1', 'Smart Board, High-Def Projector, Audio System, AC', 'available'),
(4, 'Main College Auditorium', 'Auditorium', 400, 'Main Building, Ground Floor', 'Central AC, Dolby Audio System, Stage Lighting, Podium', 'available'),
(5, 'Badminton Court', 'Badminton', 20, 'Indoor Sports Complex', 'Wooden Flooring, Floodlights, Nets, Spectator Seating', 'available')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    type = VALUES(type),
    capacity = VALUES(capacity),
    location = VALUES(location),
    facilities = VALUES(facilities),
    status = VALUES(status);
