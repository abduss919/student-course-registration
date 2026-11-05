const API_BASE = 'http://localhost:5000/api';

let currentRole = 'student';
let selectedStudentId = null;
let cachedStudents = [];
let cachedCourses = [];

document.addEventListener('DOMContentLoaded', async () => {
    await initializeSystem();
});

async function initializeSystem() {
    await loadStudents();
    await loadDashboardMetrics();
    await loadCourses();
    await loadDepartmentsDropdown();
}

// Custom Animated Toast Notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span style="font-size: 1.1rem;">${type === 'success' ? '✓' : '⚠'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Role Switcher: Student vs Admin
function switchRole(forcedRole = null) {
    if (forcedRole) {
        currentRole = forcedRole;
    } else {
        currentRole = currentRole === 'student' ? 'admin' : 'student';
    }

    const btnStudent = document.getElementById('btnStudentRole');
    const btnAdmin = document.getElementById('btnAdminRole');
    const studentOnlyElements = document.querySelectorAll('.student-only');
    const adminOnlyElements = document.querySelectorAll('.admin-only');

    if (currentRole === 'admin') {
        btnAdmin.classList.add('active');
        btnStudent.classList.remove('active');
        studentOnlyElements.forEach(el => el.style.display = 'none');
        adminOnlyElements.forEach(el => el.style.display = '');
        showTab('adminCourses');
        loadAdminCourses();
        loadAdminStudents();
        loadAdminRegistrations();
        showToast('Switched to Administrator Workspace', 'success');
    } else {
        btnStudent.classList.add('active');
        btnAdmin.classList.remove('active');
        studentOnlyElements.forEach(el => el.style.display = '');
        adminOnlyElements.forEach(el => el.style.display = 'none');
        showTab('dashboard');
        loadMyRegistrations();
        showToast('Switched to Student Self-Service Portal', 'success');
    }
}

// Tab Switching
function showTab(targetTabId) {
    const rawId = targetTabId.startsWith('tab-') ? targetTabId : `tab-${targetTabId}`;

    document.querySelectorAll('.tab-pane').forEach(pane => pane.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    const activePane = document.getElementById(rawId);
    if (activePane) activePane.style.display = 'block';

    const cleanName = targetTabId.replace('tab-', '');
    const activeNav = Array.from(document.querySelectorAll('.nav-link')).find(btn =>
        btn.getAttribute('onclick')?.includes(`'${cleanName}'`)
    );
    if (activeNav) activeNav.classList.add('active');

    if (rawId === 'tab-courses') loadCourses();
    if (rawId === 'tab-myCourses') loadMyRegistrations();
    if (rawId === 'tab-dashboard') loadDashboardMetrics();
    if (rawId === 'tab-adminCourses') loadAdminCourses();
    if (rawId === 'tab-adminStudents') loadAdminStudents();
    if (rawId === 'tab-adminRegistrations') loadAdminRegistrations();
}

// Quick Search from Topbar
function handleQuickSearch(query) {
    if (!query) return;
    const cleanQuery = query.toLowerCase().trim();

    if (currentRole === 'student') {
        showTab('courses');
        const courseSearch = document.getElementById('courseSearch');
        if (courseSearch) {
            courseSearch.value = cleanQuery;
            loadCourses();
        }
    }
}

// ==================== METRICS & PROFILE ====================
async function loadDashboardMetrics() {
    try {
        const res = await fetch(`${API_BASE}/dashboard`);
        const data = await res.json();
        document.getElementById('dashTotalStudents').textContent = data.totalStudents;
        document.getElementById('dashTotalCourses').textContent = data.totalCourses;
        document.getElementById('dashTotalRegistrations').textContent = data.totalRegistrations;
    } catch (err) {
        console.error('Failed to load metrics:', err);
    }
}

async function loadStudents() {
    try {
        const res = await fetch(`${API_BASE}/students`);
        cachedStudents = await res.json();
        const sel = document.getElementById('studentSelector');
        sel.innerHTML = '';

        cachedStudents.forEach((student, index) => {
            const opt = document.createElement('option');
            opt.value = student.student_id;
            opt.textContent = `${student.name} • ${student.roll_no} (${student.branch})`;
            sel.appendChild(opt);

            if (index === 0 && !selectedStudentId) {
                selectedStudentId = student.student_id;
            }
        });

        if (selectedStudentId) {
            sel.value = selectedStudentId;
            updateAvatar(selectedStudentId);
        }
    } catch (err) {
        console.error('Failed to fetch students:', err);
    }
}

function handleStudentChange() {
    selectedStudentId = document.getElementById('studentSelector').value;
    updateAvatar(selectedStudentId);
    loadMyRegistrations();
    showToast('Active student profile switched', 'success');
}

function updateAvatar(studentId) {
    const student = cachedStudents.find(s => String(s.student_id) === String(studentId));
    if (student) {
        document.getElementById('userAvatar').textContent = student.name.charAt(0).toUpperCase();
    }
}

// ==================== COURSE EXPLORER ====================
async function loadCourses() {
    const search = document.getElementById('courseSearch').value;
    const dept = document.getElementById('courseDeptFilter').value;
    const sem = document.getElementById('courseSemFilter').value;

    const url = new URL(`${API_BASE}/courses`);
    if (search) url.searchParams.append('search', search);
    if (dept && dept !== 'All') url.searchParams.append('department', dept);
    if (sem && sem !== 'All') url.searchParams.append('semester', sem);

    try {
        const res = await fetch(url);
        cachedCourses = await res.json();
        const tbody = document.getElementById('availableCoursesBody');
        tbody.innerHTML = '';

        if (cachedCourses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:#94a3b8;">No matching academic courses available.</td></tr>`;
            return;
        }

        cachedCourses.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="course-code-tag">${c.course_code}</span></td>
                <td><strong>${c.course_name}</strong></td>
                <td><span class="dept-pill">${c.department}</span></td>
                <td>Semester ${c.semester}</td>
                <td><span class="credit-badge">${c.credits} Credits</span></td>
                <td class="student-only text-right">
                    <button class="btn btn-primary" onclick="registerForCourse(${c.course_id})">Register</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Course load failure:', err);
    }
}

async function loadDepartmentsDropdown() {
    try {
        const res = await fetch(`${API_BASE}/courses`);
        const courses = await res.json();
        const depts = new Set(courses.map(c => c.department));
        const filter = document.getElementById('courseDeptFilter');
        filter.innerHTML = '<option value="All">All Departments</option>';
        depts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            filter.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to parse departments:', err);
    }
}

async function registerForCourse(courseId) {
    if (!selectedStudentId) {
        showToast('Please select a student profile first', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/registrations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: selectedStudentId, course_id: courseId })
        });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Failed to complete registration', 'error');
            return;
        }

        showToast('Successfully registered for course!', 'success');
        loadDashboardMetrics();
    } catch (err) {
        showToast('Server communication failure', 'error');
    }
}

// ==================== STUDENT MY ENROLLED ====================
async function loadMyRegistrations() {
    if (!selectedStudentId) return;

    try {
        const res = await fetch(`${API_BASE}/registrations/student/${selectedStudentId}`);
        const list = await res.json();
        const tbody = document.getElementById('myRegistrationsBody');
        tbody.innerHTML = '';

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:#94a3b8;">You have not registered for any courses yet.</td></tr>`;
            return;
        }

        list.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="course-code-tag">${r.course_code}</span></td>
                <td><strong>${r.course_name}</strong></td>
                <td>${r.credits} Credits</td>
                <td>Semester ${r.semester}</td>
                <td>${new Date(r.registration_date).toLocaleDateString()}</td>
                <td><span class="status-pill registered">● ${r.status}</span></td>
                <td class="text-right">
                    <button class="btn-danger-outline" onclick="cancelRegistration(${r.registration_id})">Drop Course</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Registration fetch failed:', err);
    }
}

async function cancelRegistration(regId) {
    if (!confirm('Are you sure you want to drop this course?')) return;

    try {
        const res = await fetch(`${API_BASE}/registrations/${regId}`, { method: 'DELETE' });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Cancellation error', 'error');
            return;
        }

        showToast('Course dropped successfully', 'success');
        loadMyRegistrations();
        loadDashboardMetrics();
    } catch (err) {
        showToast('Failed to drop course', 'error');
    }
}

// ==================== ADMIN: COURSE MANAGEMENT ====================
async function loadAdminCourses() {
    try {
        const res = await fetch(`${API_BASE}/courses`);
        const courses = await res.json();
        const tbody = document.getElementById('adminCoursesTableBody');
        tbody.innerHTML = '';

        courses.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${c.course_id}</td>
                <td><span class="course-code-tag">${c.course_code}</span></td>
                <td><strong>${c.course_name}</strong></td>
                <td><span class="dept-pill">${c.department}</span></td>
                <td>${c.credits}</td>
                <td>Sem ${c.semester}</td>
                <td class="text-right">
                    <button class="btn-edit-outline" onclick='editCourse(${JSON.stringify(c)})'>Edit</button>
                    <button class="btn-danger-outline" onclick="deleteCourse(${c.course_id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading admin courses:', err);
    }
}

async function handleCourseSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('adminCourseId').value;
    const payload = {
        course_code: document.getElementById('formCourseCode').value,
        course_name: document.getElementById('formCourseName').value,
        credits: parseInt(document.getElementById('formCredits').value, 10),
        department: document.getElementById('formDepartment').value,
        semester: parseInt(document.getElementById('formSemester').value, 10)
    };

    const isEdit = Boolean(id);
    const url = isEdit ? `${API_BASE}/courses/${id}` : `${API_BASE}/courses`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error, 'error');
            return;
        }

        showToast(isEdit ? 'Course details updated' : 'New course listed successfully', 'success');
        resetCourseForm();
        loadAdminCourses();
        loadCourses();
        loadDashboardMetrics();
    } catch (err) {
        showToast('Request failed', 'error');
    }
}

function editCourse(course) {
    document.getElementById('adminCourseId').value = course.course_id;
    document.getElementById('formCourseCode').value = course.course_code;
    document.getElementById('formCourseName').value = course.course_name;
    document.getElementById('formCredits').value = course.credits;
    document.getElementById('formDepartment').value = course.department;
    document.getElementById('formSemester').value = course.semester;

    document.getElementById('courseFormTitle').textContent = `Update Course: ${course.course_code}`;
    document.getElementById('saveCourseBtn').textContent = 'Update Course';
    document.getElementById('cancelCourseBtn').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetCourseForm() {
    document.getElementById('adminCourseId').value = '';
    document.getElementById('courseForm').reset();
    document.getElementById('courseFormTitle').textContent = 'Add New Course';
    document.getElementById('saveCourseBtn').textContent = 'Create Course';
    document.getElementById('cancelCourseBtn').style.display = 'none';
}

async function deleteCourse(id) {
    if (!confirm(`Delete course ID ${id}? Existing registrations will also be removed.`)) return;

    try {
        const res = await fetch(`${API_BASE}/courses/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Course removed from database', 'success');
            loadAdminCourses();
            loadCourses();
            loadDashboardMetrics();
        }
    } catch (err) {
        showToast('Deletion error', 'error');
    }
}

// ==================== ADMIN: STUDENT MANAGEMENT ====================
async function loadAdminStudents() {
    try {
        const res = await fetch(`${API_BASE}/students`);
        const students = await res.json();
        const tbody = document.getElementById('adminStudentsTableBody');
        tbody.innerHTML = '';

        students.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.student_id}</td>
                <td><strong>${s.name}</strong></td>
                <td><code>${s.roll_no}</code></td>
                <td><span class="dept-pill">${s.branch}</span></td>
                <td>${s.email}</td>
                <td class="text-right">
                    <button class="btn-edit-outline" onclick='editStudent(${JSON.stringify(s)})'>Edit</button>
                    <button class="btn-danger-outline" onclick="deleteStudent(${s.student_id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load students:', err);
    }
}

async function handleStudentSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('adminStudentId').value;
    const payload = {
        name: document.getElementById('formStudentName').value,
        roll_no: document.getElementById('formStudentRoll').value,
        branch: document.getElementById('formStudentBranch').value,
        email: document.getElementById('formStudentEmail').value
    };

    const isEdit = Boolean(id);
    const url = isEdit ? `${API_BASE}/students/${id}` : `${API_BASE}/students`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error, 'error');
            return;
        }

        showToast(isEdit ? 'Student record updated' : 'New student registered', 'success');
        resetStudentForm();
        loadAdminStudents();
        loadStudents();
        loadDashboardMetrics();
    } catch (err) {
        showToast('Request execution error', 'error');
    }
}

function editStudent(student) {
    document.getElementById('adminStudentId').value = student.student_id;
    document.getElementById('formStudentName').value = student.name;
    document.getElementById('formStudentRoll').value = student.roll_no;
    document.getElementById('formStudentBranch').value = student.branch;
    document.getElementById('formStudentEmail').value = student.email;

    document.getElementById('studentFormTitle').textContent = `Update Student: ${student.roll_no}`;
    document.getElementById('saveStudentBtn').textContent = 'Update Student';
    document.getElementById('cancelStudentBtn').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetStudentForm() {
    document.getElementById('adminStudentId').value = '';
    document.getElementById('studentForm').reset();
    document.getElementById('studentFormTitle').textContent = 'Enroll New Student';
    document.getElementById('saveStudentBtn').textContent = 'Enroll Student';
    document.getElementById('cancelStudentBtn').style.display = 'none';
}

async function deleteStudent(id) {
    if (!confirm(`Delete student ID ${id}? All related registrations will be purged.`)) return;

    try {
        const res = await fetch(`${API_BASE}/students/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Student purged from database', 'success');
            loadAdminStudents();
            loadStudents();
            loadDashboardMetrics();
        }
    } catch (err) {
        showToast('Purge error', 'error');
    }
}

// ==================== ADMIN: REGISTRATIONS AUDIT ====================
async function loadAdminRegistrations() {
    try {
        const res = await fetch(`${API_BASE}/registrations`);
        const rows = await res.json();
        const tbody = document.getElementById('adminRegistrationsTableBody');
        tbody.innerHTML = '';

        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:#94a3b8;">No registered records on file.</td></tr>`;
            return;
        }

        rows.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${r.registration_id}</td>
                <td><strong>${r.student_name}</strong></td>
                <td><code>${r.roll_no}</code></td>
                <td><span class="course-code-tag">${r.course_code}</span></td>
                <td>${r.course_name}</td>
                <td>${new Date(r.registration_date).toLocaleDateString()}</td>
                <td><span class="status-pill registered">● ${r.status}</span></td>
                <td class="text-right">
                    <button class="btn-danger-outline" onclick="cancelRegistration(${r.registration_id}); setTimeout(loadAdminRegistrations, 300);">Revoke</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error fetching registrations:', err);
    }
}