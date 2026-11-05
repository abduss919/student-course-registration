const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/students - List all students (optional roll_no search)
router.get('/', async (req, res) => {
    try {
        const { roll_no } = req.query;
        let query = 'SELECT * FROM students';
        const params = [];

        if (roll_no) {
            query += ' WHERE roll_no LIKE ?';
            params.push(`%${roll_no.trim()}%`);
        }

        query += ' ORDER BY student_id DESC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/students/:id - Get student details
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM students WHERE student_id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/students - Add new student
router.post('/', async (req, res) => {
    try {
        const { name, roll_no, branch, email } = req.body;
        if (!name || !roll_no || !branch || !email) {
            return res.status(400).json({ error: 'All fields (name, roll_no, branch, email) are required.' });
        }

        const [result] = await db.query(
            'INSERT INTO students (name, roll_no, branch, email) VALUES (?, ?, ?, ?)',
            [name.trim(), roll_no.trim().toUpperCase(), branch.trim().toUpperCase(), email.trim()]
        );

        res.status(201).json({
            message: 'Student added successfully',
            student_id: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'A student with this Roll Number or Email already exists.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/students/:id - Update student
router.put('/:id', async (req, res) => {
    try {
        const { name, roll_no, branch, email } = req.body;
        if (!name || !roll_no || !branch || !email) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const [result] = await db.query(
            'UPDATE students SET name = ?, roll_no = ?, branch = ?, email = ? WHERE student_id = ?',
            [name.trim(), roll_no.trim().toUpperCase(), branch.trim().toUpperCase(), email.trim(), req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json({ message: 'Student updated successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Roll Number or Email already exists for another student.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM students WHERE student_id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;