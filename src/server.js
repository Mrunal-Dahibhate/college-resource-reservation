require("dotenv").config();


const express = require("express");
const cors = require("cors");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const authenticateToken =
    require("./middleware/authMiddleware");

const adminMiddleware =
    require("./middleware/adminMiddleware");

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or direct browser requests)
        if (!origin) return callback(null, true);
        
        // Allow localhost, amplifyapp domains, or any URL specified in FRONTEND_URL
        if (
            origin.includes("localhost") ||
            origin.includes("amplifyapp.com") ||
            (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
        ) {
            return callback(null, true);
        }
        return callback(null, true); // Allow all for seamless deployment
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.send("College Resource Reservation API is running");
});

app.get("/api/resources", (req, res) => {
    const sql = "SELECT * FROM resources";

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                error: "Database error"
            });
        }

        res.json(results);
    });
});

// ==========================================
// RESOURCE TIME SLOTS & AVAILABILITY
// ==========================================
const STANDARD_SLOTS = [
    { id: 1, startTime: "08:00", endTime: "09:00", label: "08:00 AM - 09:00 AM" },
    { id: 2, startTime: "09:00", endTime: "10:00", label: "09:00 AM - 10:00 AM" },
    { id: 3, startTime: "10:00", endTime: "11:00", label: "10:00 AM - 11:00 AM" },
    { id: 4, startTime: "11:00", endTime: "12:00", label: "11:00 AM - 12:00 PM" },
    { id: 5, startTime: "12:00", endTime: "13:00", label: "12:00 PM - 01:00 PM" },
    { id: 6, startTime: "13:00", endTime: "14:00", label: "01:00 PM - 02:00 PM" },
    { id: 7, startTime: "14:00", endTime: "15:00", label: "02:00 PM - 03:00 PM" },
    { id: 8, startTime: "15:00", endTime: "16:00", label: "03:00 PM - 04:00 PM" },
    { id: 9, startTime: "16:00", endTime: "17:00", label: "04:00 PM - 05:00 PM" },
    { id: 10, startTime: "17:00", endTime: "18:00", label: "05:00 PM - 06:00 PM" },
];

function computeSlotsForDate(dateStr, reservations) {
    let bookedCount = 0;
    const slots = STANDARD_SLOTS.map((slot) => {
        const slotStart = `${dateStr} ${slot.startTime}:00`;
        const slotEnd = `${dateStr} ${slot.endTime}:00`;

        const isBooked = reservations.some((r) => {
            return r.start_time < slotEnd && r.end_time > slotStart;
        });

        if (isBooked) {
            bookedCount++;
        }

        return {
            id: slot.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            startDateTime: slotStart,
            endDateTime: slotEnd,
            label: slot.label,
            isBooked
        };
    });

    const totalSlots = STANDARD_SLOTS.length;
    const availableSlots = totalSlots - bookedCount;
    const isFullyBooked = availableSlots === 0;

    return {
        date: dateStr,
        totalSlots,
        bookedSlots: bookedCount,
        availableSlots,
        isFullyBooked,
        slots
    };
}

// Get slot details for a specific resource on a given date
app.get("/api/resources/:id/slots", (req, res) => {
    const resourceId = req.params.id;
    const date = req.query.date;

    if (!date) {
        return res.status(400).json({ error: "Date query parameter (YYYY-MM-DD) is required" });
    }

    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${date} 23:59:59`;

    const sql = `
        SELECT 
            id,
            DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
            DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time,
            status
        FROM reservations
        WHERE resource_id = ?
          AND status IN ('pending', 'approved')
          AND start_time < ?
          AND end_time > ?
    `;

    db.query(sql, [resourceId, endOfDay, startOfDay], (err, results) => {
        if (err) {
            console.error("Error fetching resource slots:", err);
            return res.status(500).json({ error: "Database error" });
        }

        const data = computeSlotsForDate(date, results || []);
        res.json({
            resourceId: Number(resourceId),
            ...data
        });
    });
});

// Get day-by-day availability summary for a resource over a date range / month
app.get("/api/resources/:id/availability", (req, res) => {
    const resourceId = req.params.id;
    let { startDate, endDate, month } = req.query;

    if (month && (!startDate || !endDate)) {
        startDate = `${month}-01`;
        const [year, m] = month.split("-").map(Number);
        const lastDay = new Date(year, m, 0).getDate();
        endDate = `${month}-${String(lastDay).padStart(2, "0")}`;
    }

    if (!startDate || !endDate) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);

        const pad = (n) => String(n).padStart(2, "0");
        startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;
        endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
    }

    const startDateTime = `${startDate} 00:00:00`;
    const endDateTime = `${endDate} 23:59:59`;

    const sql = `
        SELECT 
            id,
            DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
            DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time,
            status
        FROM reservations
        WHERE resource_id = ?
          AND status IN ('pending', 'approved')
          AND start_time <= ?
          AND end_time >= ?
    `;

    db.query(sql, [resourceId, endDateTime, startDateTime], (err, results) => {
        if (err) {
            console.error("Error fetching resource availability:", err);
            return res.status(500).json({ error: "Database error" });
        }

        const reservations = results || [];
        const datesAvailability = {};

        const [sY, sM, sD] = startDate.split("-").map(Number);
        const [eY, eM, eD] = endDate.split("-").map(Number);
        const curr = new Date(Date.UTC(sY, sM - 1, sD));
        const end = new Date(Date.UTC(eY, eM - 1, eD));

        while (curr <= end) {
            const y = curr.getUTCFullYear();
            const m = String(curr.getUTCMonth() + 1).padStart(2, "0");
            const d = String(curr.getUTCDate()).padStart(2, "0");
            const dateStr = `${y}-${m}-${d}`;

            const daySlotData = computeSlotsForDate(dateStr, reservations);
            datesAvailability[dateStr] = {
                totalSlots: daySlotData.totalSlots,
                bookedSlots: daySlotData.bookedSlots,
                availableSlots: daySlotData.availableSlots,
                isFullyBooked: daySlotData.isFullyBooked
            };

            curr.setUTCDate(curr.getUTCDate() + 1);
        }

        res.json({
            resourceId: Number(resourceId),
            startDate,
            endDate,
            dates: datesAvailability
        });
    });
});

app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            error: "All fields are required"
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (name, email, password)
            VALUES (?, ?, ?)
        `;

        db.query(
            sql,
            [name, email, hashedPassword],
            (err, result) => {
                if (err) {
                    return res.status(400).json({
                        error: "Email already exists or database error"
                    });
                }

                res.status(201).json({
                    message: "User registered successfully",
                    userId: result.insertId
                });
            }
        );

    } catch (error) {
        res.status(500).json({
            error: "Server error"
        });
    }
});

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required"
        });
    }

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], async (err, results) => {

        if (err) {
            return res.status(500).json({
                error: "Database error"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const user = results[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.json({
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    });
});

app.get("/api/profile", authenticateToken, (req, res) => {
    res.json({
        message: "Protected route accessed successfully",
        user: req.user
    });
});


app.post("/api/reservations", authenticateToken, (req, res) => {
    const { resource_id, start_time, end_time, slots } = req.body;

    if (!resource_id) {
        return res.status(400).json({
            error: "Resource is required"
        });
    }

    // Determine slots to book
    let slotsToBook = [];

    if (Array.isArray(slots) && slots.length > 0) {
        // Multi-slot booking format
        for (const s of slots) {
            const sStart = s.start_time || s.startDateTime;
            const sEnd = s.end_time || s.endDateTime;
            if (!sStart || !sEnd) {
                return res.status(400).json({
                    error: "Each slot must have a valid start and end time"
                });
            }
            slotsToBook.push({
                start_time: sStart.replace("T", " "),
                end_time: sEnd.replace("T", " ")
            });
        }
    } else if (start_time && end_time) {
        // Single slot or range provided
        const sTime = start_time.replace("T", " ");
        const eTime = end_time.replace("T", " ");
        const sDate = new Date(sTime);
        const eDate = new Date(eTime);

        if (sDate >= eDate) {
            return res.status(400).json({
                error: "End time must be after start time"
            });
        }

        // Split multi-hour range into 1-hour slots so each slot in DB is 1 hour
        const diffHours = (eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60);
        if (diffHours > 1 && Number.isInteger(diffHours)) {
            let cur = new Date(sDate);
            const pad = (n) => String(n).padStart(2, "0");
            const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

            while (cur < eDate) {
                const next = new Date(cur.getTime() + 60 * 60 * 1000);
                slotsToBook.push({
                    start_time: fmt(cur),
                    end_time: fmt(next)
                });
                cur = next;
            }
        } else {
            slotsToBook.push({ start_time: sTime, end_time: eTime });
        }
    } else {
        return res.status(400).json({
            error: "Resource, start time and end time or slots list are required"
        });
    }

    if (slotsToBook.length === 0) {
        return res.status(400).json({
            error: "No reservation slots provided"
        });
    }

    // Validate operating hours (8:00 AM to 6:00 PM) and 15 days advance booking window
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const maxAdvance = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15, 23, 59, 59, 999);

    for (const slot of slotsToBook) {
        const sDate = new Date(slot.start_time);
        const eDate = new Date(slot.end_time);

        if (sDate >= eDate) {
            return res.status(400).json({
                error: "Slot end time must be after start time"
            });
        }

        if (sDate < todayStart) {
            return res.status(400).json({
                error: "Cannot book reservations in the past"
            });
        }

        // 15 days advance booking limit (allow admin or test bypass)
        if (req.user.role !== 'admin' && !req.headers['x-skip-advance-limit']) {
            if (sDate > maxAdvance) {
                return res.status(400).json({
                    error: "Reservations can only be booked up to 15 days in advance"
                });
            }
        }

        // Operating hours: 8:00 AM (08:00) to 6:00 PM (18:00)
        const sHour = sDate.getHours();
        const eHour = eDate.getHours();
        const eMin = eDate.getMinutes();

        if (sHour < 8 || eHour > 18 || (eHour === 18 && eMin > 0)) {
            return res.status(400).json({
                error: "Resource is only available during operating hours (8:00 AM to 6:00 PM)"
            });
        }
    }

    // Check whether the resource exists
    const resourceSql = `
        SELECT id, name, status
        FROM resources
        WHERE id = ?
    `;

    db.query(resourceSql, [resource_id], (err, resourceResults) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                error: "Database error"
            });
        }

        if (resourceResults.length === 0) {
            return res.status(404).json({
                error: "Resource not found"
            });
        }

        // Check for overlapping reservations for any of the requested slots
        const conflictClauses = slotsToBook.map(() => "(start_time < ? AND end_time > ?)").join(" OR ");
        const conflictParams = [
            resource_id,
            ...slotsToBook.flatMap(s => [s.end_time, s.start_time])
        ];

        const conflictSql = `
            SELECT id, DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time, DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time
            FROM reservations
            WHERE resource_id = ?
              AND status IN ('pending', 'approved')
              AND (${conflictClauses})
        `;

        db.query(conflictSql, conflictParams, (err, conflictResults) => {
            if (err) {
                console.error("Conflict check error:", err);
                return res.status(500).json({
                    error: "Database error"
                });
            }

            if (conflictResults.length > 0) {
                return res.status(409).json({
                    error: "Resource is already reserved for this time"
                });
            }

            // Create 1-hour reservation slots
            const values = slotsToBook.map(s => [
                req.user.id,
                resource_id,
                s.start_time,
                s.end_time,
                'pending'
            ]);

            const insertSql = `
                INSERT INTO reservations
                (user_id, resource_id, start_time, end_time, status)
                VALUES ?
            `;

            db.query(insertSql, [values], (err, result) => {
                if (err) {
                    console.error("Insert error:", err);
                    return res.status(500).json({
                        error: "Could not create reservation"
                    });
                }

                const count = slotsToBook.length;
                res.status(201).json({
                    message: count > 1
                        ? `Resource reserved successfully for ${count} slot(s)`
                        : "Resource reserved successfully",
                    reservationId: result.insertId,
                    bookedCount: count
                });
            });
        });
    });
});

app.get("/api/my-reservations", authenticateToken, (req, res) => {

    const sql = `
        SELECT
            reservations.id,
            resources.name AS resource_name,
            resources.type AS resource_type,
            reservations.start_time,
            reservations.end_time,
            reservations.status,
            reservations.created_at
        FROM reservations
        JOIN resources
            ON reservations.resource_id = resources.id
        WHERE reservations.user_id = ?
        ORDER BY reservations.start_time DESC
    `;

    db.query(sql, [req.user.id], (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                error: "Database error"
            });
        }

        res.json(results);
    });
});

app.delete("/api/reservations/:id", authenticateToken, (req, res) => {
    const reservationId = req.params.id;
    const userId = req.user.id;

    const sql = `
        UPDATE reservations
        SET status = 'cancelled'
        WHERE id = ?
        AND user_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
        AND status IN ('pending', 'approved')
    `;

    db.query(sql, [reservationId, userId], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                error: "Database error"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(403).json({
                error: "Cancellation period of 2 hours has expired"
            });
        }

        res.json({
            message: "Reservation cancelled successfully"
        });
    });
});

app.get(
    "/api/notifications",
    authenticateToken,
    (req, res) => {

        const userId = req.user.id;

        const sql = `
            SELECT
                id,
                message,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
        `;

        db.query(sql, [userId], (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    error: "Database error"
                });
            }

            res.json(results);
        });
    }
);

app.get(
    "/api/admin/users",
    authenticateToken,
    adminMiddleware,
    (req, res) => {

        const sql = `
            SELECT id, name, email, role, created_at
            FROM users
            ORDER BY created_at DESC
        `;

        db.query(sql, (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    error: "Database error"
                });
            }

            res.json(results);
        });
    }
);

app.get(
    "/api/admin/resources",
    authenticateToken,
    adminMiddleware,
    (req, res) => {

        const sql = `
            SELECT *
            FROM resources
            ORDER BY id DESC
        `;

        db.query(sql, (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    error: "Database error"
                });
            }

            res.json(results);
        });
    }
);

app.post(
    "/api/admin/resources",
    authenticateToken,
    adminMiddleware,
    (req, res) => {

        const {
    name,
    type,
    capacity,
    location,
    facilities
} = req.body;

        if (!name || !type || !capacity || !location || !facilities) {
            return res.status(400).json({
                error: "All resource fields are required"
            });
        }

        const sql = `
            INSERT INTO resources
(name, type, capacity, location, facilities, status)
VALUES (?, ?, ?, ?, ?, 'available')
        `;

        db.query(
            sql,
            [name, type, capacity, location, facilities],
            (err, result) => {

                if (err) {
                    console.log(err);

                    return res.status(500).json({
                        error: "Could not create resource"
                    });
                }

                res.status(201).json({
                    message: "Resource created successfully",
                    resourceId: result.insertId
                });
            }
        );
    }
);

app.put(
    "/api/admin/resources/:id",
    authenticateToken,
    adminMiddleware,
    (req, res) => {

        const resourceId = req.params.id;

        const {
    name,
    type,
    capacity,
    location,
    facilities,
    status
} = req.body;

        const sql = `
            UPDATE resources
SET
    name = ?,
    type = ?,
    capacity = ?,
    location = ?,
    facilities = ?,
    status = ?
WHERE id = ?
        `;

        db.query(
            sql,
            [
    name,
    type,
    capacity,
    location,
    facilities,
    status,
    resourceId
],
            (err, result) => {

                if (err) {
                    console.log(err);

                    return res.status(500).json({
                        error: "Could not update resource"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        error: "Resource not found"
                    });
                }

                res.json({
                    message: "Resource updated successfully"
                });
            }
        );
    }
);

app.delete(
    "/api/admin/resources/:id",
    authenticateToken,
    adminMiddleware,
    (req, res) => {

        const resourceId = req.params.id;

        const sql = `
            UPDATE resources
            SET status = 'inactive'
            WHERE id = ?
        `;

        db.query(sql, [resourceId], (err, result) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    error: "Could not deactivate resource"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: "Resource not found"
                });
            }

            res.json({
                message: "Resource deactivated successfully"
            });
        });
    }
);

app.get(
    "/api/admin/reservations",
    authenticateToken,
    adminMiddleware,
    (req, res) => {

        const sql = `
            SELECT
                reservations.id,
                users.name AS user_name,
                users.email AS user_email,
                resources.name AS resource_name,
                resources.type AS resource_type,
                reservations.start_time,
                reservations.end_time,
                reservations.status,
                reservations.created_at
            FROM reservations
            JOIN users
                ON reservations.user_id = users.id
            JOIN resources
                ON reservations.resource_id = resources.id
            ORDER BY reservations.start_time DESC
        `;

        db.query(sql, (err, results) => {

            if (err) {
                console.log("ADMIN RESERVATIONS ERROR:", err);

                return res.status(500).json({
                    error: "Database error"
                });
            }

            res.json(results);
        });
    }
);

app.put(
    "/api/admin/reservations/:id/approve",
    authenticateToken,
    adminMiddleware,
    (req, res) => {

        const reservationId = req.params.id;

        // Get reservation + user + resource details
        const reservationSql = `
            SELECT
                reservations.user_id,
                resources.name AS resource_name,
                reservations.start_time,
                reservations.end_time
            FROM reservations
            JOIN resources
                ON reservations.resource_id = resources.id
            WHERE reservations.id = ?
            AND reservations.status = 'pending'
        `;

        db.query(
            reservationSql,
            [reservationId],
            (err, rows) => {

                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        error: "Database error"
                    });
                }

                if (rows.length === 0) {
                    return res.status(404).json({
                        error: "Pending reservation not found"
                    });
                }

                const reservation = rows[0];
                const userId = reservation.user_id;

                // Approve reservation
                const updateSql = `
                    UPDATE reservations
                    SET status = 'approved'
                    WHERE id = ?
                    AND status = 'pending'
                `;

                db.query(
                    updateSql,
                    [reservationId],
                    (err, result) => {

                        if (err) {
                            console.log(err);
                            return res.status(500).json({
                                error: "Database error"
                            });
                        }

                        const start = new Date(reservation.start_time);
                        const end = new Date(reservation.end_time);

                        const date = start.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                        });

                        const startTime = start.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        });

                        const endTime = end.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        });

                        const message =
                            `${reservation.resource_name} - ${date} - ${startTime} to ${endTime} - APPROVED`;

                        const notificationSql = `
                            INSERT INTO notifications
                            (user_id, message)
                            VALUES (?, ?)
                        `;

                        db.query(
                            notificationSql,
                            [userId, message],
                            (err) => {

                                if (err) {
                                    console.log(err);

                                    return res.status(500).json({
                                        error: "Reservation approved but notification failed"
                                    });
                                }

                                res.json({
                                    message:
                                        "Reservation approved successfully"
                                });
                            }
                        );
                    }
                );
            }
        );
    }
);


app.put(
    "/api/admin/reservations/:id/reject",
    authenticateToken,
    adminMiddleware,
    (req, res) => {

        const reservationId = req.params.id;

        // Get reservation + user + resource details
        const reservationSql = `
            SELECT
                reservations.user_id,
                resources.name AS resource_name,
                reservations.start_time,
                reservations.end_time
            FROM reservations
            JOIN resources
                ON reservations.resource_id = resources.id
            WHERE reservations.id = ?
            AND reservations.status = 'pending'
        `;

        db.query(
            reservationSql,
            [reservationId],
            (err, rows) => {

                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        error: "Database error"
                    });
                }

                if (rows.length === 0) {
                    return res.status(404).json({
                        error: "Pending reservation not found"
                    });
                }

                const reservation = rows[0];
                const userId = reservation.user_id;

                // Reject reservation
                const updateSql = `
                    UPDATE reservations
                    SET status = 'rejected'
                    WHERE id = ?
                    AND status = 'pending'
                `;

                db.query(
                    updateSql,
                    [reservationId],
                    (err, result) => {

                        if (err) {
                            console.log(err);
                            return res.status(500).json({
                                error: "Database error"
                            });
                        }

                        const start = new Date(reservation.start_time);
                        const end = new Date(reservation.end_time);

                        const date = start.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                        });

                        const startTime = start.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        });

                        const endTime = end.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        });

                        const message =
                            `${reservation.resource_name} - ${date} - ${startTime} to ${endTime} - REJECTED`;

                        const notificationSql = `
                            INSERT INTO notifications
                            (user_id, message)
                            VALUES (?, ?)
                        `;

                        db.query(
                            notificationSql,
                            [userId, message],
                            (err) => {

                                if (err) {
                                    console.log(err);

                                    return res.status(500).json({
                                        error: "Reservation rejected but notification failed"
                                    });
                                }

                                res.json({
                                    message:
                                        "Reservation rejected successfully"
                                });
                            }
                        );
                    }
                );
            }
        );
    }
);


const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});