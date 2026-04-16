/**
 * ============================================================
 *  script.js  –  StudyBase Student Management System  v2
 *
 *  Fixes in this version:
 *    1. openAddModal function/variable name conflict → renamed to btnOpenAdd
 *    2. Registration system fully implemented
 *    3. Multi-user accounts stored in localStorage
 *    4. Topbar/sidebar reflect logged-in user
 *    5. Statistics view now renders real bar charts
 *    6. Profile view populated from account data
 *    7. Table sorting by column
 *    8. Grade colour badges
 *    9. Export JSON / Clear data in Settings
 *   10. Password strength meter
 *
 *  CRUD mirrors student_db.c:
 *    addStudent()      → addStudentJS()
 *    displayStudents() → renderTable()
 *    deleteStudent()   → deleteStudentJS()
 *    modifyStudent()   → modifyStudentJS()
 * ============================================================
 */

"use strict";

/* ══════════════════════════════════════════════════════════════
   1.  STORAGE KEYS
══════════════════════════════════════════════════════════════ */
const STUDENTS_KEY = "sms_students";   /* array of student objects   */
const ACCOUNTS_KEY = "sms_accounts";   /* array of user accounts     */
const SESSION_KEY  = "sms_session";    /* currently logged-in user   */

/* ══════════════════════════════════════════════════════════════
   2.  DATA HELPERS
══════════════════════════════════════════════════════════════ */
function loadStudents() {
  try {
    const data = JSON.parse(localStorage.getItem(STUDENTS_KEY) || "[]");
    if (data.length > 0) nextId = Math.max(...data.map(s => s.id)) + 1;
    return data;
  } catch { return []; }
}
function saveStudents(arr) {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(arr));
}

function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); }
  catch { return []; }
}
function saveAccounts(arr) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(arr));
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}
function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/* ── In-memory state ── */
let nextId   = 1;
let students = loadStudents();
let accounts = loadAccounts();
let session  = null;   /* set on login */

/* Sort state */
let sortCol = "id", sortDir = 1;

/* ── Ensure the built-in admin account always exists ── */
function ensureAdminAccount() {
  if (!accounts.find(a => a.username === "admin")) {
    accounts.push({
      username : "admin",
      password : "admin",
      firstName: "Admin",
      lastName : "User",
      email    : "admin@studybase.app",
      role     : "Administrator",
      since    : new Date().toLocaleDateString(),
    });
    saveAccounts(accounts);
  }
  /* Guest account */
  if (!accounts.find(a => a.username === "guest")) {
    accounts.push({
      username : "guest",
      password : "guest",
      firstName: "Guest",
      lastName : "User",
      email    : "guest@studybase.app",
      role     : "Viewer",
      since    : new Date().toLocaleDateString(),
    });
    saveAccounts(accounts);
  }
}
ensureAdminAccount();

/* ── Seed demo students on first run ── */
function seedDemoData() {
  if (students.length === 0) {
    const demos = [
      { name:"Alice Johnson",  age:20, grade:"A+", email:"alice@uni.edu"  },
      { name:"Bob Martinez",   age:22, grade:"B+", email:"bob@uni.edu"    },
      { name:"Clara Liu",      age:19, grade:"A",  email:"clara@uni.edu"  },
      { name:"David Osei",     age:21, grade:"B",  email:"david@uni.edu"  },
      { name:"Emma Brown",     age:23, grade:"C+", email:"emma@uni.edu"   },
    ];
    demos.forEach(d => addStudentJS(d.name, d.age, d.grade, d.email));
  }
}

/* ══════════════════════════════════════════════════════════════
   3.  CRUD FUNCTIONS  (mirror student_db.c)
══════════════════════════════════════════════════════════════ */

/** addStudentJS – mirrors addStudent() in student_db.c */
function addStudentJS(name, age, grade, email) {
  if (!name || !age || !grade || !email) return null;
  if (students.some(s => s.email.toLowerCase() === email.toLowerCase())) return null;
  const s = {
    id   : nextId++,
    name : name.trim(),
    age  : parseInt(age, 10),
    grade: grade.trim(),
    email: email.trim().toLowerCase(),
    added: new Date().toLocaleDateString(),
  };
  students.push(s);
  saveStudents(students);
  console.log(`[OK] Student '${name}' added. ID=${s.id}`);
  return s;
}

/** modifyStudentJS – mirrors modifyStudent() in student_db.c */
function modifyStudentJS(id, name, age, grade, email) {
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) return false;
  if (email && students.some(s => s.email.toLowerCase() === email.toLowerCase() && s.id !== id))
    return "duplicate_email";
  if (name)    students[idx].name  = name.trim();
  if (age > 0) students[idx].age   = parseInt(age, 10);
  if (grade)   students[idx].grade = grade.trim();
  if (email)   students[idx].email = email.trim().toLowerCase();
  saveStudents(students);
  console.log(`[OK] Student ID ${id} updated.`);
  return true;
}

/** deleteStudentJS – mirrors deleteStudent() in student_db.c */
function deleteStudentJS(id) {
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) return false;
  students.splice(idx, 1);
  saveStudents(students);
  console.log(`[OK] Student ID ${id} deleted.`);
  return true;
}

/* ══════════════════════════════════════════════════════════════
   4.  DOM REFERENCES
══════════════════════════════════════════════════════════════ */

/* Pages */
const authPage  = document.getElementById("authPage");
const dashboard = document.getElementById("dashboard");

/* Auth panels */
const loginPanel    = document.getElementById("loginPanel");
const registerPanel = document.getElementById("registerPanel");

/* Login inputs */
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginBtn      = document.getElementById("loginBtn");
const loginError    = document.getElementById("loginError");

/* Register inputs */
const regFirstName  = document.getElementById("regFirstName");
const regLastName   = document.getElementById("regLastName");
const regEmail      = document.getElementById("regEmail");
const regUsername   = document.getElementById("regUsername");
const regPassword   = document.getElementById("regPassword");
const regConfirm    = document.getElementById("regConfirm");
const agreeTerms    = document.getElementById("agreeTerms");
const registerBtn   = document.getElementById("registerBtn");
const registerError = document.getElementById("registerError");

/* Nav switches */
const goToRegister = document.getElementById("goToRegister");
const goToLogin    = document.getElementById("goToLogin");

/* Quick-fill buttons */
const btnQuickAdmin = document.getElementById("btnQuickAdmin");
const btnQuickGuest = document.getElementById("btnQuickGuest");
const forgotBtn     = document.getElementById("forgotBtn");

/* Password strength */
const pwBar   = document.getElementById("pwBar");
const pwLabel = document.getElementById("pwLabel");

/* Sidebar / nav */
const sidebar        = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const hamburger      = document.getElementById("hamburger");
const navItems       = document.querySelectorAll(".nav-item");
const logoutBtn      = document.getElementById("logoutBtn");

/* User display */
const sidebarAvatar   = document.getElementById("sidebarAvatar");
const sidebarUsername = document.getElementById("sidebarUsername");
const sidebarRole     = document.getElementById("sidebarRole");
const topbarAvatar    = document.getElementById("topbarAvatar");
const topbarUsername  = document.getElementById("topbarUsername");
const topbarRole      = document.getElementById("topbarRole");
const pageTitle       = document.getElementById("pageTitle");
const breadcrumb      = document.getElementById("breadcrumb");

/* Students view */
const studentBody   = document.getElementById("studentBody");
const emptyState    = document.getElementById("emptyState");
const emptyMsg      = document.getElementById("emptyMsg");
const searchInput   = document.getElementById("searchInput");
const searchClear   = document.getElementById("searchClear");
const navCount      = document.getElementById("navCount");
const tableFoot     = document.getElementById("tableFoot");

/* Stats */
const totalStudentsEl = document.getElementById("totalStudents");
const avgAgeEl        = document.getElementById("avgAge");
const topGradeEl      = document.getElementById("topGrade");
const lastAddedEl     = document.getElementById("lastAdded");

/* Add/Edit modal */
const modalOverlay  = document.getElementById("modalOverlay");
const modalHeading  = document.getElementById("modalHeading");
const closeModal    = document.getElementById("closeModal");
const cancelModal   = document.getElementById("cancelModal");
const saveStudentBtn= document.getElementById("saveStudentBtn");
const editIdEl      = document.getElementById("editId");
const studentName   = document.getElementById("studentName");
const studentAge    = document.getElementById("studentAge");
const studentGrade  = document.getElementById("studentGrade");
const studentEmail  = document.getElementById("studentEmail");
const modalError    = document.getElementById("modalError");

/* Delete modal */
const deleteOverlay     = document.getElementById("deleteOverlay");
const closeDeleteModal  = document.getElementById("closeDeleteModal");
const cancelDelete      = document.getElementById("cancelDelete");
const confirmDelete     = document.getElementById("confirmDelete");
const deleteStudentName = document.getElementById("deleteStudentName");

/* Other buttons */
const btnOpenAdd    = document.getElementById("btnOpenAdd");
const notifBtn      = document.getElementById("notifBtn");
const exportBtn     = document.getElementById("exportBtn");
const clearDataBtn  = document.getElementById("clearDataBtn");
const changePwBtn   = document.getElementById("changePwBtn");

/* Toast */
const toast = document.getElementById("toast");

let pendingDeleteId = null;
let toastTimer      = null;

/* ══════════════════════════════════════════════════════════════
   5.  TOAST
══════════════════════════════════════════════════════════════ */
function showToast(message, type = "success") {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3500);
}

/* ══════════════════════════════════════════════════════════════
   6.  PASSWORD STRENGTH METER
══════════════════════════════════════════════════════════════ */
if (regPassword) {
  regPassword.addEventListener("input", () => {
    const val = regPassword.value;
    let score = 0;
    if (val.length >= 6)  score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const widths  = ["0%","25%","50%","75%","100%"];
    const colors  = ["","#ef4444","#f97316","#eab308","#22c55e"];
    const labels  = ["","Weak","Fair","Good","Strong"];

    pwBar.style.width      = widths[Math.min(score, 4)];
    pwBar.style.background = colors[Math.min(score, 4)];
    pwLabel.textContent    = score > 0 ? labels[Math.min(score, 4)] : "";
  });
}

/* ══════════════════════════════════════════════════════════════
   7.  TOGGLE PASSWORD VISIBILITY
══════════════════════════════════════════════════════════════ */
document.querySelectorAll(".toggle-pw").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    target.type = target.type === "password" ? "text" : "password";
  });
});

/* ══════════════════════════════════════════════════════════════
   8.  AUTH PAGE PANEL SWITCHING
══════════════════════════════════════════════════════════════ */
goToRegister.addEventListener("click", () => {
  loginPanel.classList.add("hidden");
  registerPanel.classList.remove("hidden");
  registerError.textContent = "";
  regFirstName.focus();
});

goToLogin.addEventListener("click", () => {
  registerPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  loginError.textContent = "";
  loginUsername.focus();
});

/* Quick-fill demo */
btnQuickAdmin.addEventListener("click", () => {
  loginUsername.value = "admin";
  loginPassword.value = "admin";
  loginError.textContent = "";
  loginUsername.focus();
});
btnQuickGuest.addEventListener("click", () => {
  loginUsername.value = "guest";
  loginPassword.value = "guest";
  loginError.textContent = "";
  loginUsername.focus();
});
if (forgotBtn) {
  forgotBtn.addEventListener("click", () =>
    showToast("Password reset: contact your administrator.", "info")
  );
}

/* ══════════════════════════════════════════════════════════════
   9.  LOGIN
══════════════════════════════════════════════════════════════ */
function attemptLogin() {
  const user = loginUsername.value.trim();
  const pass = loginPassword.value.trim();
  loginError.textContent = "";

  if (!user || !pass) {
    loginError.textContent = "Please fill in both fields.";
    return;
  }

  /* Search registered accounts (case-insensitive username) */
  const account = accounts.find(
    a => a.username.toLowerCase() === user.toLowerCase() && a.password === pass
  );

  if (!account) {
    loginError.textContent = "Incorrect username or password.";
    loginPassword.value = "";
    loginPassword.focus();
    return;
  }

  /* Success */
  session = account;
  saveSession(session);
  loginError.textContent = "";
  seedDemoData();
  enterDashboard();
}

loginBtn.addEventListener("click", attemptLogin);
loginPassword.addEventListener("keydown", e => { if (e.key === "Enter") attemptLogin(); });
loginUsername.addEventListener("keydown", e => { if (e.key === "Enter") loginPassword.focus(); });

/* ══════════════════════════════════════════════════════════════
   10.  REGISTRATION
══════════════════════════════════════════════════════════════ */
registerBtn.addEventListener("click", () => {
  registerError.textContent = "";

  const firstName = regFirstName.value.trim();
  const lastName  = regLastName.value.trim();
  const email     = regEmail.value.trim();
  const username  = regUsername.value.trim();
  const password  = regPassword.value;
  const confirm   = regConfirm.value;

  /* Validate required fields */
  if (!firstName || !lastName || !email || !username || !password || !confirm) {
    registerError.textContent = "All fields are required.";
    return;
  }

  /* Email format */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    registerError.textContent = "Please enter a valid email address.";
    return;
  }

  /* Username format: letters, numbers, underscores only */
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    registerError.textContent = "Username: 3–20 characters, letters/numbers/underscore only.";
    return;
  }

  /* Password length */
  if (password.length < 6) {
    registerError.textContent = "Password must be at least 6 characters.";
    return;
  }

  /* Passwords match */
  if (password !== confirm) {
    registerError.textContent = "Passwords do not match.";
    return;
  }

  /* Terms */
  if (!agreeTerms.checked) {
    registerError.textContent = "Please accept the Terms of Service to continue.";
    return;
  }

  /* Check duplicate username */
  if (accounts.find(a => a.username.toLowerCase() === username.toLowerCase())) {
    registerError.textContent = "That username is already taken. Please choose another.";
    return;
  }

  /* Check duplicate email */
  if (accounts.find(a => a.email.toLowerCase() === email.toLowerCase())) {
    registerError.textContent = "An account with that email already exists.";
    return;
  }

  /* Create account */
  const newAccount = {
    username,
    password,
    firstName,
    lastName,
    email   : email.toLowerCase(),
    role    : "Staff",
    since   : new Date().toLocaleDateString(),
  };
  accounts.push(newAccount);
  saveAccounts(accounts);

  /* Auto-login */
  session = newAccount;
  saveSession(session);

  showToast(`Account created! Welcome, ${firstName}! 🎉`, "success");
  seedDemoData();
  enterDashboard();
});

/* ══════════════════════════════════════════════════════════════
   11.  ENTER / LEAVE DASHBOARD
══════════════════════════════════════════════════════════════ */
function enterDashboard() {
  authPage.classList.add("hidden");
  dashboard.classList.remove("hidden");

  /* Populate user info everywhere */
  const initial = (session.firstName || session.username)[0].toUpperCase();
  const fullName = session.firstName
    ? `${session.firstName} ${session.lastName}`
    : session.username;

  /* Sidebar */
  sidebarAvatar.textContent   = initial;
  sidebarUsername.textContent = session.username;
  sidebarRole.textContent     = session.role || "User";

  /* Topbar */
  topbarAvatar.textContent   = initial;
  topbarUsername.textContent = fullName;
  topbarRole.textContent     = session.role || "User";

  /* Profile view */
  populateProfile();

  /* Show students by default */
  switchView("students");
  renderTable();
}

function leaveDashboard() {
  clearSession();
  session = null;
  dashboard.classList.add("hidden");
  authPage.classList.remove("hidden");
  loginUsername.value = "";
  loginPassword.value = "";
  loginPanel.classList.remove("hidden");
  registerPanel.classList.add("hidden");
}

logoutBtn.addEventListener("click", leaveDashboard);

/* ══════════════════════════════════════════════════════════════
   12.  SIDEBAR & NAVIGATION
══════════════════════════════════════════════════════════════ */
hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarOverlay.style.display = sidebar.classList.contains("open") ? "block" : "none";
});
sidebarOverlay.addEventListener("click", closeSidebar);
function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.style.display = "none";
}

navItems.forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();
    const view = item.dataset.view;
    switchView(view);
    closeSidebar();
  });
});

function switchView(view) {
  /* Update nav active state */
  navItems.forEach(n => n.classList.toggle("active", n.dataset.view === view));

  /* Show / hide sections */
  document.querySelectorAll(".view").forEach(s => {
    s.classList.toggle("active", s.id === `view-${view}`);
    s.classList.toggle("hidden", s.id !== `view-${view}`);
  });

  /* Update page title & breadcrumb */
  const titles = { students:"Students", stats:"Statistics", profile:"My Profile", settings:"Settings" };
  pageTitle.textContent = titles[view] || view;
  breadcrumb.textContent = `Dashboard / ${titles[view] || view}`;

  /* View-specific actions */
  if (view === "stats")    buildCharts();
  if (view === "settings") buildAccountsList();
  if (view === "profile")  populateProfile();
}

/* Notification button */
if (notifBtn) notifBtn.addEventListener("click", () => showToast("No new notifications.", "info"));

/* ══════════════════════════════════════════════════════════════
   13.  RENDER TABLE  (mirrors displayStudents in student_db.c)
══════════════════════════════════════════════════════════════ */
function renderTable(filter = searchInput.value) {
  const q = filter.toLowerCase().trim();

  /* Filter */
  let list = q
    ? students.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q)
      )
    : [...students];

  /* Sort */
  list.sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (typeof av === "string") av = av.toLowerCase(), bv = bv.toLowerCase();
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  });

  /* Update sort arrows */
  document.querySelectorAll("th.sortable").forEach(th => {
    const arrow = th.querySelector(".sort-arrow");
    if (th.dataset.col === sortCol) {
      arrow.textContent = sortDir === 1 ? "↑" : "↓";
    } else {
      arrow.textContent = "↕";
    }
  });

  /* Update stats */
  updateStats();

  /* Render rows */
  studentBody.innerHTML = "";

  if (list.length === 0) {
    emptyState.classList.remove("hidden");
    emptyMsg.textContent = q
      ? `No results for "${q}". Try a different search.`
      : "Add your first student using the button above!";
  } else {
    emptyState.classList.add("hidden");
    list.forEach(s => studentBody.appendChild(buildRow(s)));
  }

  /* Footer count */
  tableFoot.textContent = q
    ? `Showing ${list.length} of ${students.length} students`
    : `${students.length} student${students.length !== 1 ? "s" : ""} total`;
}

/** buildRow – creates one <tr> */
function buildRow(s) {
  const tr = document.createElement("tr");

  /* Grade colour class */
  const gc = s.grade.startsWith("A") ? "grade-a"
           : s.grade.startsWith("B") ? "grade-b"
           : s.grade.startsWith("C") ? "grade-c"
           : "grade-d";

  tr.innerHTML = `
    <td><span class="id-badge">#${s.id}</span></td>
    <td>${esc(s.name)}</td>
    <td>${s.age}</td>
    <td><span class="grade-badge ${gc}">${esc(s.grade)}</span></td>
    <td>${esc(s.email)}</td>
    <td class="actions-cell">
      <button class="btn btn-sm btn-primary" data-id="${s.id}" data-action="edit">Edit</button>
      <button class="btn btn-sm btn-danger"  data-id="${s.id}" data-action="delete">Delete</button>
    </td>`;

  tr.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id, 10);
      btn.dataset.action === "edit" ? openEditModal(id) : openDeleteModal(id);
    });
  });

  return tr;
}

/** updateStats – recalculate stat cards */
function updateStats() {
  navCount.textContent = students.length;
  totalStudentsEl.textContent = students.length;

  if (students.length === 0) {
    avgAgeEl.textContent  = "–";
    topGradeEl.textContent = "–";
    lastAddedEl.textContent = "–";
    return;
  }

  avgAgeEl.textContent = (students.reduce((s, x) => s + x.age, 0) / students.length).toFixed(1);

  const gradeFreq = {};
  students.forEach(s => { gradeFreq[s.grade] = (gradeFreq[s.grade] || 0) + 1; });
  topGradeEl.textContent = Object.entries(gradeFreq).sort((a,b) => b[1]-a[1])[0][0];

  lastAddedEl.textContent = students[students.length - 1].name.split(" ")[0];
}

/** XSS prevention */
function esc(str) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

/* ── Search events ── */
searchInput.addEventListener("input", () => {
  searchClear.classList.toggle("hidden", !searchInput.value);
  renderTable();
});
searchClear.addEventListener("click", () => {
  searchInput.value = "";
  searchClear.classList.add("hidden");
  renderTable();
});

/* ── Column sorting ── */
document.querySelectorAll("th.sortable").forEach(th => {
  th.addEventListener("click", () => {
    const col = th.dataset.col;
    sortDir = sortCol === col ? -sortDir : 1;
    sortCol = col;
    renderTable();
  });
});

/* ══════════════════════════════════════════════════════════════
   14.  ADD / EDIT MODAL
══════════════════════════════════════════════════════════════ */

/* BUG FIX: Use btnOpenAdd (the button element) instead of naming
   a function the same as the button's ID, which caused a crash. */
btnOpenAdd.addEventListener("click", openAddModal);

function openAddModal() {
  modalHeading.textContent  = "Add New Student";
  editIdEl.value            = "";
  clearForm();
  showOverlay(modalOverlay);
  studentName.focus();
}

function openEditModal(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;
  modalHeading.textContent = "Edit Student";
  editIdEl.value           = id;
  studentName.value        = s.name;
  studentAge.value         = s.age;
  studentGrade.value       = s.grade;
  studentEmail.value       = s.email;
  modalError.textContent   = "";
  showOverlay(modalOverlay);
  studentName.focus();
}

function clearForm() {
  studentName.value = studentAge.value = studentEmail.value = "";
  studentGrade.value = "";
  modalError.textContent = "";
}

saveStudentBtn.addEventListener("click", () => {
  const id    = editIdEl.value ? parseInt(editIdEl.value, 10) : null;
  const name  = studentName.value.trim();
  const age   = parseInt(studentAge.value, 10);
  const grade = studentGrade.value;
  const email = studentEmail.value.trim();

  /* Validation */
  if (!name || !age || !grade || !email) {
    modalError.textContent = "All fields are required."; return;
  }
  if (age < 5 || age > 99 || isNaN(age)) {
    modalError.textContent = "Enter a valid age between 5 and 99."; return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    modalError.textContent = "Enter a valid email address."; return;
  }

  if (id === null) {
    /* ADD */
    const result = addStudentJS(name, age, grade, email);
    if (!result) { modalError.textContent = "That email is already registered."; return; }
    showToast(`✓ Student '${name}' added!`, "success");
  } else {
    /* EDIT */
    const result = modifyStudentJS(id, name, age, grade, email);
    if (result === "duplicate_email") { modalError.textContent = "Email already used by another student."; return; }
    if (!result) { modalError.textContent = "Student not found."; return; }
    showToast(`✓ Student '${name}' updated!`, "success");
  }

  hideOverlay(modalOverlay);
  clearForm();
  renderTable();
});

closeModal  .addEventListener("click", () => hideOverlay(modalOverlay));
cancelModal .addEventListener("click", () => hideOverlay(modalOverlay));
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) hideOverlay(modalOverlay); });

/* ══════════════════════════════════════════════════════════════
   15.  DELETE MODAL
══════════════════════════════════════════════════════════════ */
function openDeleteModal(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;
  pendingDeleteId = id;
  deleteStudentName.textContent = s.name;
  showOverlay(deleteOverlay);
}

confirmDelete.addEventListener("click", () => {
  if (pendingDeleteId === null) return;
  const s = students.find(x => x.id === pendingDeleteId);
  const name = s ? s.name : "Unknown";
  if (deleteStudentJS(pendingDeleteId)) {
    showToast(`Student '${name}' deleted.`, "success");
    renderTable();
  }
  pendingDeleteId = null;
  hideOverlay(deleteOverlay);
});

closeDeleteModal.addEventListener("click", () => hideOverlay(deleteOverlay));
cancelDelete    .addEventListener("click", () => hideOverlay(deleteOverlay));
deleteOverlay   .addEventListener("click", e => { if (e.target === deleteOverlay) hideOverlay(deleteOverlay); });

/* ── Global Escape key ── */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    hideOverlay(modalOverlay);
    hideOverlay(deleteOverlay);
  }
});

/* ── Modal helpers ── */
function showOverlay(el) { el.classList.remove("hidden"); }
function hideOverlay(el) { el.classList.add("hidden"); }

/* ══════════════════════════════════════════════════════════════
   16.  STATISTICS VIEW  (bar charts, pure CSS/JS — no library)
══════════════════════════════════════════════════════════════ */
function buildCharts() {
  buildGradeChart();
  buildAgeChart();
  buildSummary();
}

function buildGradeChart() {
  const box = document.getElementById("gradeChart");
  if (!box) return;

  const freq = {};
  students.forEach(s => { freq[s.grade] = (freq[s.grade] || 0) + 1; });

  if (Object.keys(freq).length === 0) {
    box.innerHTML = "<p style='color:var(--gray-400);padding:20px'>No data yet.</p>"; return;
  }

  const max = Math.max(...Object.values(freq));
  const colors = ["#1d4ed8","#2563eb","#3b82f6","#60a5fa","#93c5fd","#6366f1","#8b5cf6","#a78bfa"];

  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
  box.innerHTML = sorted.map(([g, n], i) => `
    <div class="bar-row">
      <div class="bar-label">${esc(g)}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(n/max*100).toFixed(1)}%;background:${colors[i%colors.length]}">
          <span class="bar-count">${n}</span>
        </div>
      </div>
    </div>`).join("");
}

function buildAgeChart() {
  const box = document.getElementById("ageChart");
  if (!box) return;

  if (students.length === 0) {
    box.innerHTML = "<p style='color:var(--gray-400);padding:20px'>No data yet.</p>"; return;
  }

  /* Group ages into buckets */
  const buckets = {};
  students.forEach(s => {
    const key = `${s.age} yrs`;
    buckets[key] = (buckets[key] || 0) + 1;
  });

  const max = Math.max(...Object.values(buckets));
  const sorted = Object.entries(buckets).sort((a,b) => parseInt(a[0]) - parseInt(b[0]));

  box.innerHTML = sorted.map(([age, n]) => `
    <div class="bar-row">
      <div class="bar-label" style="width:50px;font-size:.78rem">${esc(age)}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(n/max*100).toFixed(1)}%;background:#0ea5e9">
          <span class="bar-count">${n}</span>
        </div>
      </div>
    </div>`).join("");
}

function buildSummary() {
  const box = document.getElementById("summaryGrid");
  if (!box) return;

  if (students.length === 0) { box.innerHTML = ""; return; }

  const ages = students.map(s => s.age);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const avgAge = (ages.reduce((a,b)=>a+b,0)/ages.length).toFixed(1);

  const gradeFreq = {};
  students.forEach(s => { gradeFreq[s.grade] = (gradeFreq[s.grade] || 0)+1; });
  const topGrade = Object.entries(gradeFreq).sort((a,b)=>b[1]-a[1])[0][0];

  box.innerHTML = `
    <div class="summary-item"><span>Total Students</span><strong>${students.length}</strong></div>
    <div class="summary-item"><span>Average Age</span><strong>${avgAge}</strong></div>
    <div class="summary-item"><span>Top Grade</span><strong>${esc(topGrade)}</strong></div>
    <div class="summary-item"><span>Youngest</span><strong>${minAge} yrs</strong></div>
    <div class="summary-item"><span>Oldest</span><strong>${maxAge} yrs</strong></div>
    <div class="summary-item"><span>Unique Grades</span><strong>${Object.keys(gradeFreq).length}</strong></div>`;
}

/* ══════════════════════════════════════════════════════════════
   17.  PROFILE VIEW
══════════════════════════════════════════════════════════════ */
function populateProfile() {
  if (!session) return;
  const fullName = session.firstName
    ? `${session.firstName} ${session.lastName}`
    : session.username;
  const initial = (session.firstName || session.username)[0].toUpperCase();

  const avatar = document.getElementById("profileAvatar");
  const name   = document.getElementById("profileFullName");
  const tag    = document.getElementById("profileRoleTag");
  if (avatar) avatar.textContent = initial;
  if (name)   name.textContent   = fullName;
  if (tag)    tag.textContent    = session.role || "User";

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || "–"; };
  set("piUsername", session.username);
  set("piEmail",    session.email);
  set("piName",     fullName);
  set("piRole",     session.role);
  set("piSince",    session.since);
}

if (changePwBtn) {
  changePwBtn.addEventListener("click", () => showToast("Password change: feature coming soon!", "info"));
}

/* ══════════════════════════════════════════════════════════════
   18.  SETTINGS
══════════════════════════════════════════════════════════════ */
function buildAccountsList() {
  const box = document.getElementById("accountsList");
  if (!box) return;
  if (accounts.length === 0) { box.innerHTML = "<p style='color:var(--gray-400);font-size:.87rem'>No accounts yet.</p>"; return; }
  box.innerHTML = accounts.map(a => {
    const initial = (a.firstName || a.username)[0].toUpperCase();
    const full    = a.firstName ? `${a.firstName} ${a.lastName}` : a.username;
    return `
      <div class="account-chip">
        <div class="account-chip-avatar">${initial}</div>
        <div>
          <strong style="font-size:.87rem">${esc(full)}</strong>
          <div style="font-size:.78rem;color:var(--gray-400)">${esc(a.username)} · ${esc(a.role || "User")}</div>
        </div>
      </div>`;
  }).join("");
}

if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(students, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "students_export.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Students exported as JSON!", "success");
  });
}

if (clearDataBtn) {
  clearDataBtn.addEventListener("click", () => {
    if (!confirm("Clear ALL student records? This cannot be undone.")) return;
    students = [];
    nextId   = 1;
    saveStudents(students);
    renderTable();
    showToast("All student data cleared.", "info");
  });
}

/* Terms / Privacy dummy links */
document.getElementById("termsBtn")  ?.addEventListener("click", () => showToast("Terms page coming soon!", "info"));
document.getElementById("privacyBtn")?.addEventListener("click", () => showToast("Privacy page coming soon!", "info"));

/* ══════════════════════════════════════════════════════════════
   19.  AUTO-RESUME SESSION (if user was already logged in)
══════════════════════════════════════════════════════════════ */
const savedSession = loadSession();
if (savedSession) {
  /* Verify the account still exists */
  const still = accounts.find(a => a.username === savedSession.username);
  if (still) {
    session = still;
    seedDemoData();
    enterDashboard();
  } else {
    clearSession();
  }
}

console.log("[INFO] StudyBase v2 loaded.");
console.log(`[INFO] ${accounts.length} account(s), ${students.length} student(s) in storage.`);