const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');

dotenv.config();

const studentRoutes = require('./routes/studentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const registrationRoutes = require('./routes/registrationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/registrations', registrationRoutes);

// Dashboard Overview API
app.get('/api/dashboard', async (req, res) => {
    try {
        const [studentsCount] = await db.query('SELECT COUNT(*) AS totalStudents FROM students');
        const [coursesCount] = await db.query('SELECT COUNT(*) AS totalCourses FROM courses');
        const [regCount] = await db.query('SELECT COUNT(*) AS totalRegistrations FROM registrations');

        res.json({
            totalStudents: studentsCount[0].totalStudents,
            totalCourses: coursesCount[0].totalCourses,
            totalRegistrations: regCount[0].totalRegistrations
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Student Course Registration System API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});