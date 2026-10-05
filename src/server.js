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
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
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
    const { resource_id, start_time, end_time } = req.body;

    if (!resource_id || !start_time || !end_time) {
        return res.status(400).json({
            error: "Resource, start time and end time are required"
        });
    }

    if (new Date(start_time) >= new Date(end_time)) {
        return res.status(400).json({
            error: "End time must be after start time"
        });
    }

    // Check whether the resource exists
    const resourceSql = `
        SELECT id
        FROM resources
        WHERE id = ?
    `;

    db.query(resourceSql, [resource_id], (err, resourceResults) => {

        if (err) {
            return res.status(500).json({
                error: "Database error"
            });
        }

        if (resourceResults.length === 0) {
            return res.status(404).json({
                error: "Resource not found"
            });
        }

        // Check for overlapping reservations
        const conflictSql = `
            SELECT id
            FROM reservations
            WHERE resource_id = ?
            AND status IN ('pending','approved')
            AND start_time < ?
            AND end_time > ?
        `;

        db.query(
            conflictSql,
            [resource_id, end_time, start_time],
            (err, conflictResults) => {

                if (err) {
                    return res.status(500).json({
                        error: "Database error"
                    });
                }

                if (conflictResults.length > 0) {
                    return res.status(409).json({
                        error: "Resource is already reserved for this time"
                    });
                }

                // Create reservation
                const insertSql = `
                    INSERT INTO reservations
                    (user_id, resource_id, start_time, end_time, status)
                    VALUES (?, ?, ?, ?, 'pending')
                `;

                db.query(
                    insertSql,
                    [
                        req.user.id,
                        resource_id,
                        start_time,
                        end_time
                    ],
                    (err, result) => {

                        if (err) {
                            console.log(err);

                            return res.status(500).json({
                                error: "Could not create reservation"
                            });
                        }

                        res.status(201).json({
                            message: "Resource reserved successfully",
                            reservationId: result.insertId
                        });
                    }
                );
            }
        );
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