import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Replace these values with the Firebase configuration from your Firebase project.
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const holidays = [
  { date: "2026-01-01", day: "Thursday", name: "New Year's Day", closedDays: 1 },
  { date: "2026-02-16", day: "Monday", name: "Family Day", closedDays: 1 },
  { date: "2026-04-03", day: "Friday", name: "Good Friday", closedDays: 1 },
  { date: "2026-05-18", day: "Monday", name: "Victoria Day", closedDays: 1 },
  { date: "2026-07-01", day: "Wednesday", name: "Canada Day", closedDays: 1 },
  { date: "2026-08-03", day: "Monday", name: "Civic Holiday", closedDays: 1 },
  { date: "2026-09-07", day: "Monday", name: "Labour Day", closedDays: 1 },
  { date: "2026-10-12", day: "Monday", name: "Thanksgiving Day", closedDays: 1 },
  { date: "2026-12-24", day: "Thursday & Friday", name: "Christmas", closedDays: 2 },
  { date: "2026-12-28", day: "Monday", name: "Boxing Day", closedDays: 1 },
  { date: "2026-12-31", day: "Thursday", name: "New Year's Eve", closedDays: 1 }
];

const holidayDates = new Set([
  "2026-01-01", "2026-02-16", "2026-04-03", "2026-05-18", "2026-07-01",
  "2026-08-03", "2026-09-07", "2026-10-12", "2026-12-24", "2026-12-25",
  "2026-12-28", "2026-12-31"
]);

let employees = [];
let leaveEntries = [];
let selectedEmployeeId = null;

const els = {
  employeeButtons: document.querySelector("#employeeButtons"),
  employeeCount: document.querySelector("#employeeCount"),
  selectedEmployeeName: document.querySelector("#selectedEmployeeName"),
  selectedEmployeeRole: document.querySelector("#selectedEmployeeRole"),
  openAddLeave: document.querySelector("#openAddLeave"),
  vacationUsed: document.querySelector("#vacationUsed"),
  vacationAllowance: document.querySelector("#vacationAllowance"),
  vacationRemaining: document.querySelector("#vacationRemaining"),
  vacationProgress: document.querySelector("#vacationProgress"),
  sickUsed: document.querySelector("#sickUsed"),
  sickAllowance: document.querySelector("#sickAllowance"),
  sickRemaining: document.querySelector("#sickRemaining"),
  sickProgress: document.querySelector("#sickProgress"),
  holidayDays: document.querySelector("#holidayDays"),
  holidayList: document.querySelector("#holidayList"),
  leaveHistoryBody: document.querySelector("#leaveHistoryBody"),
  historyCount: document.querySelector("#historyCount"),
  employeeDialog: document.querySelector("#employeeDialog"),
  leaveDialog: document.querySelector("#leaveDialog"),
  employeeForm: document.querySelector("#employeeForm"),
  leaveForm: document.querySelector("#leaveForm"),
  leaveEmployeeLabel: document.querySelector("#leaveEmployeeLabel"),
  toast: document.querySelector("#toast")
};

function showToast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle("error", isError);
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(`${dateString}T12:00:00`));
}

function calculateBusinessDays(startDate, endDate) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (end < start) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    const iso = current.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidayDates.has(iso)) count += 1;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function renderHolidays() {
  const total = holidays.reduce((sum, holiday) => sum + holiday.closedDays, 0);
  els.holidayDays.textContent = total;
  els.holidayList.innerHTML = holidays.map((holiday) => `
    <div class="holiday-item">
      <div class="holiday-date">${new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(new Date(`${holiday.date}T12:00:00`))}</div>
      <div>
        <p class="holiday-title">${holiday.name}</p>
        <p class="holiday-day">${holiday.day}</p>
      </div>
      <span class="holiday-length">${holiday.closedDays} ${holiday.closedDays === 1 ? "day" : "days"}</span>
    </div>
  `).join("");
}

function renderEmployeeButtons() {
  els.employeeCount.textContent = `${employees.length} ${employees.length === 1 ? "employee" : "employees"}`;

  if (!employees.length) {
    els.employeeButtons.innerHTML = '<p class="muted-text">No employees yet. Use “Add Employee” to add the first person.</p>';
    selectedEmployeeId = null;
    renderDashboard();
    return;
  }

  if (!employees.some((employee) => employee.id === selectedEmployeeId)) {
    selectedEmployeeId = employees[0].id;
  }

  els.employeeButtons.innerHTML = employees.map((employee) => `
    <button class="employee-profile ${employee.id === selectedEmployeeId ? "active" : ""}" type="button" data-employee-id="${employee.id}" title="${employee.name}">
      <span class="employee-avatar">${employee.initials}</span>
      <span class="employee-name">${employee.name}</span>
    </button>
  `).join("");

  els.employeeButtons.querySelectorAll("[data-employee-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedEmployeeId = button.dataset.employeeId;
      renderEmployeeButtons();
      renderDashboard();
    });
  });

  renderDashboard();
}

function renderDashboard() {
  const employee = employees.find((item) => item.id === selectedEmployeeId);

  if (!employee) {
    els.selectedEmployeeName.textContent = "No employee selected";
    els.selectedEmployeeRole.textContent = "Choose a profile above to view leave details.";
    els.openAddLeave.disabled = true;
    updateKpi("vacation", 0, 10);
    updateKpi("sick", 0, 5);
    els.historyCount.textContent = "0 entries";
    els.leaveHistoryBody.innerHTML = '<tr><td colspan="6" class="empty-state">Select an employee to see their leave history.</td></tr>';
    return;
  }

  els.openAddLeave.disabled = false;
  els.selectedEmployeeName.textContent = employee.name;
  els.selectedEmployeeRole.textContent = `${employee.initials} profile · ${employee.vacationAllowance} vacation days · ${employee.sickAllowance} sick days`;

  const employeeEntries = leaveEntries
    .filter((entry) => entry.employeeId === employee.id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const approvedEntries = employeeEntries.filter((entry) => entry.status === "Approved");
  const vacationUsed = approvedEntries
    .filter((entry) => entry.type === "Vacation")
    .reduce((sum, entry) => sum + Number(entry.days || 0), 0);
  const sickUsed = approvedEntries
    .filter((entry) => entry.type === "Sick")
    .reduce((sum, entry) => sum + Number(entry.days || 0), 0);

  updateKpi("vacation", vacationUsed, employee.vacationAllowance);
  updateKpi("sick", sickUsed, employee.sickAllowance);
  renderHistory(employeeEntries);
}

function updateKpi(type, used, allowance) {
  const remaining = Math.max(allowance - used, 0);
  const percentage = allowance > 0 ? Math.min((used / allowance) * 100, 100) : 0;

  if (type === "vacation") {
    els.vacationUsed.textContent = used;
    els.vacationAllowance.textContent = allowance;
    els.vacationRemaining.textContent = remaining;
    els.vacationProgress.style.width = `${percentage}%`;
  } else {
    els.sickUsed.textContent = used;
    els.sickAllowance.textContent = allowance;
    els.sickRemaining.textContent = remaining;
    els.sickProgress.style.width = `${percentage}%`;
  }
}

function renderHistory(entries) {
  els.historyCount.textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

  if (!entries.length) {
    els.leaveHistoryBody.innerHTML = '<tr><td colspan="6" class="empty-state">No leave entries have been added for this employee.</td></tr>';
    return;
  }

  els.leaveHistoryBody.innerHTML = entries.map((entry) => `
    <tr>
      <td>${formatDate(entry.startDate)}${entry.startDate !== entry.endDate ? ` – ${formatDate(entry.endDate)}` : ""}</td>
      <td>${entry.type}</td>
      <td>${entry.days}</td>
      <td><span class="leave-status ${entry.status.toLowerCase()}">${entry.status}</span></td>
      <td>${entry.notes || ""}</td>
      <td><button type="button" class="delete-button" data-delete-id="${entry.id}">Delete</button></td>
    </tr>
  `).join("");

  els.leaveHistoryBody.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = window.confirm("Delete this leave entry?");
      if (!confirmed) return;
      try {
        await deleteDoc(doc(db, "leaveEntries", button.dataset.deleteId));
        showToast("Leave entry deleted.");
      } catch (error) {
        console.error(error);
        showToast("Could not delete the leave entry.", true);
      }
    });
  });
}

document.querySelector("#openAddEmployee").addEventListener("click", () => els.employeeDialog.showModal());
els.openAddLeave.addEventListener("click", () => {
  const employee = employees.find((item) => item.id === selectedEmployeeId);
  if (!employee) return;
  els.leaveEmployeeLabel.textContent = `Adding leave for ${employee.name}`;
  els.leaveDialog.showModal();
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => document.querySelector(`#${button.dataset.close}`).close());
});

els.employeeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.querySelector("#employeeName").value.trim();
  const initials = document.querySelector("#employeeInitials").value.trim().toUpperCase();
  const vacationAllowance = Number(document.querySelector("#employeeVacation").value);
  const sickAllowance = Number(document.querySelector("#employeeSick").value);

  try {
    await addDoc(collection(db, "employees"), {
      name,
      initials,
      vacationAllowance,
      sickAllowance,
      active: true,
      createdAt: serverTimestamp()
    });
    els.employeeForm.reset();
    document.querySelector("#employeeVacation").value = 10;
    document.querySelector("#employeeSick").value = 5;
    els.employeeDialog.close();
    showToast("Employee added.");
  } catch (error) {
    console.error(error);
    showToast("Could not add the employee. Check your Firebase setup.", true);
  }
});

els.leaveForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const employee = employees.find((item) => item.id === selectedEmployeeId);
  if (!employee) return;

  const type = document.querySelector("#leaveType").value;
  const startDate = document.querySelector("#leaveStartDate").value;
  const endDate = document.querySelector("#leaveEndDate").value;
  const status = document.querySelector("#leaveStatus").value;
  const notes = document.querySelector("#leaveNotes").value.trim();
  const days = calculateBusinessDays(startDate, endDate);

  if (days <= 0) {
    showToast("The selected period does not contain a working day.", true);
    return;
  }

  try {
    await addDoc(collection(db, "leaveEntries"), {
      employeeId: employee.id,
      employeeName: employee.name,
      type,
      startDate,
      endDate,
      days,
      status,
      notes,
      createdAt: serverTimestamp()
    });
    els.leaveForm.reset();
    els.leaveDialog.close();
    showToast(`${days} leave ${days === 1 ? "day" : "days"} added.`);
  } catch (error) {
    console.error(error);
    showToast("Could not save the leave entry. Check your Firebase setup.", true);
  }
});

renderHolidays();

onSnapshot(query(collection(db, "employees"), orderBy("createdAt", "asc")), (snapshot) => {
  employees = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((employee) => employee.active !== false);
  renderEmployeeButtons();
}, (error) => {
  console.error(error);
  showToast("Firebase is not connected yet. Add your configuration in app.js.", true);
});

onSnapshot(query(collection(db, "leaveEntries"), orderBy("createdAt", "desc")), (snapshot) => {
  leaveEntries = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  renderDashboard();
}, (error) => {
  console.error(error);
});
