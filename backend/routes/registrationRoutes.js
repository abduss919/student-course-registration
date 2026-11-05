const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/registrations - View all registrations with joined tables
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.registration_id,
                r.registration_date,
                r.status,
                s.student_id,
                s.name AS student_name,
                s.roll_no,
                s.branch,
                c.course_id,
                c.course_code,
                c.course_name,
                c.credits,
                c.department,
                c.semester
            FROM registrations r
            INNER JOIN students s ON r.student_id = s.student_id
            INNER JOIN courses c ON r.course_id = c.course_id
            ORDER BY r.registration_id DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/registrations/student/:id - View registrations for a particular student
router.get('/student/:id', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.registration_id,
                r.registration_date,
                r.status,
                c.course_id,
                c.course_code,
                c.course_name,
                c.credits,
                c.department,
                c.semester
            FROM registrations r
            INNER JOIN courses c ON r.course_id = c.course_id
            WHERE r.student_id = ?
            ORDER BY r.registration_id DESC
        `;
        const [rows] = await db.query(query, [req.params.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/registrations/course/:id - View students registered for a course
router.get('/course/:id', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.registration_id,
                r.registration_date,
                r.status,
                s.student_id,
                s.name,
                s.roll_no,
                s.branch,
                s.email
            FROM registrations r
            INNER JOIN students s ON r.student_id = s.student_id
            WHERE r.course_id = ?
            ORDER BY s.roll_no ASC
        `;
        const [rows] = await db.query(query, [req.params.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/registrations - Register student for a course
router.post('/', async (req, res) => {
    try {
        const { student_id, course_id } = req.body;

        if (!student_id || !course_id) {
            return res.status(400).json({ error: 'Both student_id and course_id are required.' });
        }

        // Check if student exists
        const [studentExists] = await db.query('SELECT student_id FROM students WHERE student_id = ?', [student_id]);
        if (studentExists.length === 0) {
            return res.status(404).json({ error: 'Student does not exist.' });
        }

        // Check if course exists
        const [courseExists] = await db.query('SELECT course_id FROM courses WHERE course_id = ?', [course_id]);
        if (courseExists.length === 0) {
            return res.status(404).json({ error: 'Course does not exist.' });
        }

        // Prevent duplicate registration
        const [existing] = await db.query(
            'SELECT registration_id FROM registrations WHERE student_id = ? AND course_id = ?',
            [student_id, course_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Student is already registered for this course.' });
        }

        const [result] = await db.query(
            'INSERT INTO registrations (student_id, course_id, registration_date, status) VALUES (?, ?, CURDATE(), "Registered")',
            [student_id, course_id]
        );

        res.status(201).json({
            message: 'Course registration successful',
            registration_id: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Student is already registered for this course.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/registrations/:id - Update registration status
router.put('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status is required.' });
        }

        const [result] = await db.query(
            'UPDATE registrations SET status = ? WHERE registration_id = ?',
            [status.trim(), req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Registration record not found.' });
        }

        res.json({ message: 'Registration status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/registrations/:id - Cancel/Delete registration
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM registrations WHERE registration_id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Registration record not found.' });
        }
        res.json({ message: 'Registration cancelled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;