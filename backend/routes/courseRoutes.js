const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/courses - List courses with filters
router.get('/', async (req, res) => {
    try {
        const { search, department, semester } = req.query;
        let query = 'SELECT * FROM courses WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (course_name LIKE ? OR course_code LIKE ?)';
            params.push(`%${search.trim()}%`, `%${search.trim()}%`);
        }

        if (department && department !== 'All') {
            query += ' AND department = ?';
            params.push(department.trim());
        }

        if (semester && semester !== 'All') {
            query += ' AND semester = ?';
            params.push(parseInt(semester, 10));
        }

        query += ' ORDER BY semester ASC, course_code ASC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/courses/:id - Course details
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM courses WHERE course_id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/courses - Add course
router.post('/', async (req, res) => {
    try {
        const { course_code, course_name, credits, department, semester } = req.body;
        if (!course_code || !course_name || credits === undefined || !department || semester === undefined) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const numCredits = parseInt(credits, 10);
        const numSemester = parseInt(semester, 10);

        if (isNaN(numCredits) || numCredits <= 0 || isNaN(numSemester) || numSemester <= 0) {
            return res.status(400).json({ error: 'Credits and Semester must be positive integers.' });
        }

        const [result] = await db.query(
            'INSERT INTO courses (course_code, course_name, credits, department, semester) VALUES (?, ?, ?, ?, ?)',
            [course_code.trim().toUpperCase(), course_name.trim(), numCredits, department.trim().toUpperCase(), numSemester]
        );

        res.status(201).json({
            message: 'Course added successfully',
            course_id: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Course code already exists.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/courses/:id - Update course
router.put('/:id', async (req, res) => {
    try {
        const { course_code, course_name, credits, department, semester } = req.body;
        if (!course_code || !course_name || credits === undefined || !department || semester === undefined) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const numCredits = parseInt(credits, 10);
        const numSemester = parseInt(semester, 10);

        const [result] = await db.query(
            'UPDATE courses SET course_code = ?, course_name = ?, credits = ?, department = ?, semester = ? WHERE course_id = ?',
            [course_code.trim().toUpperCase(), course_name.trim(), numCredits, department.trim().toUpperCase(), numSemester, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({ message: 'Course updated successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Course code already exists.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/courses/:id - Delete course
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM courses WHERE course_id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;