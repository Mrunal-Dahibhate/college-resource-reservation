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
-- Seed Initial Admin & Sample Data (Optional)
-- Default admin password below is: Admin@123 (bcrypt hashed)
-- =====================================================
INSERT IGNORE INTO users (id, name, email, password, role)
VALUES (1, 'Admin User', 'admin@college.edu', '$2a$10$wE99cE1pQ2vEaZ8y3lB9A.Tqk5pGz1eIqA7pPzN0J5Xg3z3Hl1J0S', 'admin');

-- Sample resources
INSERT IGNORE INTO resources (id, name, type, capacity, location, facilities, status)
VALUES
(1, 'Seminar Hall A', 'Hall', 150, 'Building 1, Floor 2', 'Projector, AC, Sound System', 'available'),
(2, 'Computer Lab 3', 'Lab', 40, 'IT Block, Floor 1', 'High-end PCs, Gigabit LAN, AC', 'available'),
(3, 'Conference Room B', 'Room', 20, 'Admin Block, Ground Floor', 'Smart TV, Video Conference, Whiteboard', 'available');
