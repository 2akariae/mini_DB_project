/**
 * ============================================================
 *  script.js  –  Student Management System
 *  Handles: Login, CRUD operations, modal logic, localStorage
 *
 *  NOTE: This file mirrors the C backend (student_db.c) logic:
 *    addStudent()      → addStudentJS()
 *    displayStudents() → renderTable()
 *    deleteStudent()   → deleteStudentJS()
 *    modifyStudent()   → modifyStudentJS()
 *
 *  Data is stored in localStorage under the key "sms_students"
 *  to simulate SQLite persistence across page refreshes.
 * ============================================================
 */

"use strict";

/* ══════════════════════════════════════════════════════════════
   1.  DATA LAYER  (mirrors SQLite table in student_db.c)
══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "sms_students";   /* localStorage key           */
let   nextId      = 1;                /* auto-increment PK, like SQLite AUTOINCREMENT */

/**
 * loadStudents – read the array from localStorage.
 * Returns an empty array if nothing is stored yet.
 */
function loadStudents() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const students = JSON.parse(raw);
    /* Keep nextId ahead of the highest existing ID */
    if (students.length > 0) {
      const maxId = Math.max(...students.map(s => s.id));
      nextId = maxId + 1;
    }
    return students;
  } catch {
    return [];
  }
}

/**
 * saveStudents – write the current array back to localStorage.
 */
function saveStudents(students) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

/* In-memory copy of the student list (loaded once at startup) */
let students = loadStudents();

/* ── Seed some demo data so the app doesn't start empty ── */
function seedDemoData() {
  if (students.length === 0) {
    const demos = [
      { name: "Alice Johnson",  age: 20, grade: "A",  email: "alice@uni.edu"  },
      { name: "Bob Martinez",   age: 22, grade: "B+", email: "bob@uni.edu"    },
      { name: "Clara Liu",      age: 19, grade: "A+", email: "clara@uni.edu"  },
      { name: "David Osei",     age: 21, grade: "B",  email: "david@uni.edu"  },
    ];
    demos.forEach(d => addStudentJS(d.name, d.age, d.grade, d.email));
  }
}

/* ══════════════════════════════════════════════════════════════
   2.  CRUD FUNCTIONS  (match C backend functions)
══════════════════════════════════════════════════════════════ */

/**
 * addStudentJS  –  mirrors addStudent() in student_db.c
 * Inserts a new student object and persists to localStorage.
 * Returns the new student object, or null on validation error.
 */
function addStudentJS(name, age, grade, email) {
  /* Basic validation (the C backend relies on SQLite NOT NULL) */
  if (!name || !age || !grade || !email) return null;

  /* Check for duplicate email (mirrors UNIQUE constraint in SQLite) */
  if (students.some(s => s.email.toLowerCase() === email.toLowerCase())) {
    return null;  /* duplicate */
  }

  const newStudent = {
    id   : nextId++,
    name : name.trim(),
    age  : parseInt(age, 10),
    grade: grade.trim(),
    email: email.trim().toLowerCase(),
  };

  students.push(newStudent);
  saveStudents(students);
  console.log(`[OK] Student '${name}' added with ID ${newStudent.id}.`);
  return newStudent;
}

/**
 * modifyStudentJS  –  mirrors modifyStudent() in student_db.c
 * Updates only the fields that are provided (non-empty).
 * Returns true on success, false if the student is not found.
 */
function modifyStudentJS(id, name, age, grade, email) {
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) {
    console.warn(`[WARN] No student found with ID ${id}.`);
    return false;
  }

  /* Check duplicate email (ignoring the current student's own record) */
  if (email && students.some(s => s.email.toLowerCase() === email.toLowerCase() && s.id !== id)) {
    return "duplicate_email";
  }

  /* Only update fields that were actually provided */
  if (name)       students[idx].name  = name.trim();
  if (age > 0)    students[idx].age   = parseInt(age, 10);
  if (grade)      students[idx].grade = grade.trim();
  if (email)      students[idx].email = email.trim().toLowerCase();

  saveStudents(students);
  console.log(`[OK] Student ID ${id} updated.`);
  return true;
}

/**
 * deleteStudentJS  –  mirrors deleteStudent() in student_db.c
 * Removes the student with the given ID.
 * Returns true if deleted, false if not found.
 */
function deleteStudentJS(id) {
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) {
    console.warn(`[WARN] No student found with ID ${id}.`);
    return false;
  }
  students.splice(idx, 1);
  saveStudents(students);
  console.log(`[OK] Student with ID ${id} deleted.`);
  return true;
}

/* ══════════════════════════════════════════════════════════════
   3.  DOM ELEMENTS
══════════════════════════════════════════════════════════════ */

/* Pages */
const loginPage  = document.getElementById("loginPage");
const dashboard  = document.getElementById("dashboard");

/* Login */
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const loginBtn   = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

/* Dashboard nav */
const navItems   = document.querySelectorAll(".nav-item");
const views      = document.querySelectorAll(".view");
const pageTitle  = document.getElementById("pageTitle");
const sidebar    = document.getElementById("sidebar");
const hamburger  = document.getElementById("hamburger");
const logoutBtn  = document.getElementById("logoutBtn");

/* Table & toolbar */
const studentBody  = document.getElementById("studentBody");
const emptyState   = document.getElementById("emptyState");
const searchInput  = document.getElementById("searchInput");
const openAddModal = document.getElementById("openAddModal");

/* Stats */
const totalStudentsEl = document.getElementById("totalStudents");
const avgAgeEl        = document.getElementById("avgAge");
const topGradeEl      = document.getElementById("topGrade");

/* Add / Edit Modal */
const modalOverlay  = document.getElementById("modalOverlay");
const modalTitle    = document.getElementById("modalTitle");
const closeModal    = document.getElementById("closeModal");
const cancelModal   = document.getElementById("cancelModal");
const saveStudent   = document.getElementById("saveStudent");
const editIdEl      = document.getElementById("editId");
const studentName   = document.getElementById("studentName");
const studentAge    = document.getElementById("studentAge");
const studentGrade  = document.getElementById("studentGrade");
const studentEmail  = document.getElementById("studentEmail");
const modalError    = document.getElementById("modalError");

/* Delete Confirmation Modal */
const deleteOverlay     = document.getElementById("deleteOverlay");
const closeDeleteModal  = document.getElementById("closeDeleteModal");
const cancelDelete      = document.getElementById("cancelDelete");
const confirmDelete     = document.getElementById("confirmDelete");
const deleteStudentName = document.getElementById("deleteStudentName");

/* Toast */
const toast = document.getElementById("toast");

let pendingDeleteId = null;   /* ID of the student queued for deletion */

/* ══════════════════════════════════════════════════════════════
   4.  TOAST HELPER
══════════════════════════════════════════════════════════════ */

let toastTimer = null;

/**
 * showToast – display a brief notification at the bottom-right.
 * @param {string} message  – text to show
 * @param {string} type     – "success" | "error"
 */
function showToast(message, type = "success") {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast ${type}`;      /* applies colour border */
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3000);
}

/* ══════════════════════════════════════════════════════════════
   5.  LOGIN LOGIC
══════════════════════════════════════════════════════════════ */

/* Credentials (hardcoded for the demo, matching the HTML hint) */
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";

function attemptLogin() {
  const user = usernameEl.value.trim();
  const pass = passwordEl.value.trim();

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    loginError.textContent = "";
    loginPage.classList.add("hidden");
    dashboard.classList.remove("hidden");

    /* Seed demo data on first login */
    seedDemoData();
    renderTable();
  } else {
    loginError.textContent = "Invalid username or password. Try admin / admin.";
    passwordEl.value = "";
    passwordEl.focus();
  }
}

/* Login button click */
loginBtn.addEventListener("click", attemptLogin);

/* Allow pressing Enter in the password field to submit */
passwordEl.addEventListener("keydown", e => {
  if (e.key === "Enter") attemptLogin();
});

/* Logout */
logoutBtn.addEventListener("click", () => {
  dashboard.classList.add("hidden");
  loginPage.classList.remove("hidden");
  usernameEl.value = "";
  passwordEl.value = "";
});

/* ══════════════════════════════════════════════════════════════
   6.  SIDEBAR NAVIGATION
══════════════════════════════════════════════════════════════ */

/* Switch between views (Students / Statistics / Settings) */
navItems.forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();

    const target = item.dataset.view;

    /* Update active link */
    navItems.forEach(n => n.classList.remove("active"));
    item.classList.add("active");

    /* Update page title */
    pageTitle.textContent = item.textContent.trim();

    /* Show the correct section */
    views.forEach(v => v.classList.add("hidden"));
    document.getElementById(`view-${target}`).classList.remove("hidden");

    /* Close sidebar on mobile */
    sidebar.classList.remove("open");
  });
});

/* Hamburger toggle (mobile) */
hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

/* Close sidebar when clicking outside on mobile */
document.addEventListener("click", e => {
  if (
    window.innerWidth <= 768 &&
    !sidebar.contains(e.target) &&
    !hamburger.contains(e.target)
  ) {
    sidebar.classList.remove("open");
  }
});

/* ══════════════════════════════════════════════════════════════
   7.  TABLE RENDERING  (mirrors displayStudents in student_db.c)
══════════════════════════════════════════════════════════════ */

/**
 * renderTable – builds the HTML table rows from the in-memory
 * students array, applying the current search filter.
 */
function renderTable(filter = "") {
  const query = filter.toLowerCase().trim();

  /* Filter by name or email */
  const filtered = query
    ? students.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
      )
    : [...students];

  /* Update stats (always from the full list, not filtered) */
  updateStats();

  /* Clear old rows */
  studentBody.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
    filtered.forEach(s => studentBody.appendChild(createRow(s)));
  }
}

/**
 * createRow – creates a <tr> element for one student.
 */
function createRow(student) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><span class="id-badge">#${student.id}</span></td>
    <td>${escapeHtml(student.name)}</td>
    <td>${student.age}</td>
    <td><span class="grade-badge">${escapeHtml(student.grade)}</span></td>
    <td>${escapeHtml(student.email)}</td>
    <td class="actions-cell">
      <button class="btn btn-sm btn-primary edit-btn"  data-id="${student.id}">Edit</button>
      <button class="btn btn-sm btn-danger  delete-btn" data-id="${student.id}">Delete</button>
    </td>
  `;

  /* Edit button → open modal prefilled with student data */
  tr.querySelector(".edit-btn").addEventListener("click", () => openEditModal(student.id));

  /* Delete button → open confirm modal */
  tr.querySelector(".delete-btn").addEventListener("click", () => openDeleteModal(student.id));

  return tr;
}

/**
 * updateStats – recalculates the three stat cards.
 */
function updateStats() {
  totalStudentsEl.textContent = students.length;

  if (students.length === 0) {
    avgAgeEl.textContent  = "–";
    topGradeEl.textContent = "–";
    return;
  }

  const avgAge = (students.reduce((sum, s) => sum + s.age, 0) / students.length).toFixed(1);
  avgAgeEl.textContent = avgAge;

  /* Find the most common grade */
  const gradeCount = {};
  students.forEach(s => {
    gradeCount[s.grade] = (gradeCount[s.grade] || 0) + 1;
  });
  const topGrade = Object.entries(gradeCount).sort((a, b) => b[1] - a[1])[0][0];
  topGradeEl.textContent = topGrade;
}

/* Security helper: prevent XSS in table output */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

/* Live search */
searchInput.addEventListener("input", () => renderTable(searchInput.value));

/* ══════════════════════════════════════════════════════════════
   8.  ADD / EDIT MODAL LOGIC
══════════════════════════════════════════════════════════════ */

/**
 * openAddModal – resets the modal to "Add" mode and shows it.
 */
function openAddModal() {
  modalTitle.textContent = "Add Student";
  editIdEl.value = "";              /* no ID = new record */
  clearModalForm();
  showModal();
}

/**
 * openEditModal – prefills the modal with existing student data
 * (mirrors modifyStudent() in student_db.c, which requires the ID).
 */
function openEditModal(id) {
  const student = students.find(s => s.id === id);
  if (!student) return;

  modalTitle.textContent = "Edit Student";
  editIdEl.value         = id;

  /* Fill in the form fields */
  studentName.value  = student.name;
  studentAge.value   = student.age;
  studentGrade.value = student.grade;
  studentEmail.value = student.email;

  modalError.textContent = "";
  showModal();
}

function showModal() { modalOverlay.classList.remove("hidden"); studentName.focus(); }
function hideModal() { modalOverlay.classList.add("hidden"); clearModalForm(); }

function clearModalForm() {
  studentName.value  = "";
  studentAge.value   = "";
  studentGrade.value = "";
  studentEmail.value = "";
  modalError.textContent = "";
}

/* Save button: decides whether to Add or Edit based on editId */
saveStudent.addEventListener("click", () => {
  const id    = editIdEl.value ? parseInt(editIdEl.value, 10) : null;
  const name  = studentName.value.trim();
  const age   = parseInt(studentAge.value, 10);
  const grade = studentGrade.value.trim();
  const email = studentEmail.value.trim();

  /* Validate */
  if (!name || !age || !grade || !email) {
    modalError.textContent = "All fields are required.";
    return;
  }
  if (age < 5 || age > 99) {
    modalError.textContent = "Please enter a valid age (5–99).";
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    modalError.textContent = "Please enter a valid email address.";
    return;
  }

  if (id === null) {
    /* ── ADD ── */
    const result = addStudentJS(name, age, grade, email);
    if (!result) {
      modalError.textContent = "That email is already registered.";
      return;
    }
    showToast(`Student '${name}' added successfully!`, "success");

  } else {
    /* ── EDIT ── */
    const result = modifyStudentJS(id, name, age, grade, email);
    if (result === "duplicate_email") {
      modalError.textContent = "That email is already used by another student.";
      return;
    }
    if (!result) {
      modalError.textContent = "Could not find the student to update.";
      return;
    }
    showToast(`Student '${name}' updated successfully!`, "success");
  }

  hideModal();
  renderTable(searchInput.value);
});

/* Wire up open / close events */
openAddModal.addEventListener("click", openAddModal);
closeModal  .addEventListener("click", hideModal);
cancelModal .addEventListener("click", hideModal);

/* Close modal on overlay click */
modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) hideModal();
});

/* Close modal with Escape key */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    hideModal();
    hideDeleteModal();
  }
});

/* ══════════════════════════════════════════════════════════════
   9.  DELETE CONFIRMATION MODAL
══════════════════════════════════════════════════════════════ */

function openDeleteModal(id) {
  const student = students.find(s => s.id === id);
  if (!student) return;

  pendingDeleteId = id;
  deleteStudentName.textContent = student.name;
  deleteOverlay.classList.remove("hidden");
}

function hideDeleteModal() {
  pendingDeleteId = null;
  deleteOverlay.classList.add("hidden");
}

/* Confirm delete button */
confirmDelete.addEventListener("click", () => {
  if (pendingDeleteId === null) return;

  const student = students.find(s => s.id === pendingDeleteId);
  const name    = student ? student.name : "Unknown";

  const ok = deleteStudentJS(pendingDeleteId);
  if (ok) {
    showToast(`Student '${name}' deleted.`, "success");
    renderTable(searchInput.value);
  } else {
    showToast("Delete failed: student not found.", "error");
  }

  hideDeleteModal();
});

closeDeleteModal.addEventListener("click", hideDeleteModal);
cancelDelete    .addEventListener("click", hideDeleteModal);
deleteOverlay   .addEventListener("click", e => {
  if (e.target === deleteOverlay) hideDeleteModal();
});

/* ══════════════════════════════════════════════════════════════
   10.  INITIALISE
══════════════════════════════════════════════════════════════ */

/*
 * The dashboard is hidden by default (login gate).
 * renderTable() will be called after a successful login.
 * Nothing needs to run here except ensuring localStorage is
 * ready — which loadStudents() already handled at the top.
 */
console.log("[INFO] Student Management System JS loaded.");
console.log(`[INFO] ${students.length} student(s) found in localStorage.`);