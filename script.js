const STORAGE_KEY = "safeguard-client-portal-state";
const dayMs = 86_400_000;
const clients = ["Test 1", "Acme Logistics", "North Ridge Medical"];
const state = loadState();
let selectedClient = state.selectedClient || clients[0];
let selectedContactId = null;
let currentDate = startOfDay(new Date("2024-05-15T09:00:00"));
let currentView = "week";

const els = {
  loginScreen: document.querySelector("#login-screen"),
  appShell: document.querySelector("#app-shell"),
  loginForm: document.querySelector("#login-form"),
  loginUsername: document.querySelector("#login-username"),
  loginPassword: document.querySelector("#login-password"),
  loginError: document.querySelector("#login-error"),
  logoutButton: document.querySelector("#logout-button"),
  clientSelect: document.querySelector("#client-select"),
  portalTitle: document.querySelector("#portal-title"),
  taskCount: document.querySelector("#task-count"),
  contactSearch: document.querySelector("#contact-search"),
  contactList: document.querySelector("#contact-list"),
  contactDetail: document.querySelector("#contact-detail"),
  addContactButton: document.querySelector("#add-contact-button"),
  contactDialog: document.querySelector("#contact-dialog"),
  contactForm: document.querySelector("#contact-form"),
  eventDialog: document.querySelector("#event-dialog"),
  eventForm: document.querySelector("#event-form"),
  calendarGrid: document.querySelector("#calendar-grid"),
  calendarTitle: document.querySelector("#calendar-title"),
  dispatchPanel: document.querySelector("#dispatch-panel"),
  dispatchList: document.querySelector("#dispatch-list"),
  printDispatch: document.querySelector("#print-dispatch"),
  logDialog: document.querySelector("#log-dialog"),
  logList: document.querySelector("#change-log-list")
};

function loadState() {
  const fallback = {
    loggedIn: false,
    selectedClient: clients[0],
    clients: Object.fromEntries(clients.map((client) => [client, { contacts: [], events: [], logs: [], tasks: 0 }]))
  };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored ? mergeState(fallback, stored) : fallback;
  } catch {
    return fallback;
  }
}

function mergeState(fallback, stored) {
  clients.forEach((client) => {
    stored.clients ??= {};
    stored.clients[client] ??= fallback.clients[client];
    stored.clients[client].contacts ??= [];
    stored.clients[client].events ??= [];
    stored.clients[client].logs ??= [];
    stored.clients[client].tasks ??= 0;
  });
  return { ...fallback, ...stored };
}

function saveState() {
  state.selectedClient = selectedClient;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clientData() {
  return state.clients[selectedClient];
}

function logChange(message) {
  clientData().logs.unshift({ id: crypto.randomUUID(), message, time: new Date().toISOString() });
  saveState();
}

function init() {
  seedDemoEvents();
  clients.forEach((client) => els.clientSelect.add(new Option(client, client)));
  els.clientSelect.value = selectedClient;
  els.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (els.loginUsername.value.trim() !== "admin" || els.loginPassword.value !== "admin") {
      els.loginError.textContent = "Invalid login. Use username admin and password admin.";
      return;
    }
    els.loginError.textContent = "";
    state.loggedIn = true;
    saveState();
    showApp();
  });
  els.logoutButton.addEventListener("click", () => {
    state.loggedIn = false;
    saveState();
    els.appShell.classList.add("hidden");
    els.loginScreen.classList.remove("hidden");
  });
  els.clientSelect.addEventListener("change", () => {
    selectedClient = els.clientSelect.value;
    selectedContactId = null;
    saveState();
    renderAll();
  });
  els.addContactButton.addEventListener("click", () => openContactDialog());
  els.contactForm.addEventListener("submit", saveContact);
  els.contactSearch.addEventListener("input", renderContacts);
  els.eventForm.addEventListener("submit", saveEvent);
  document.querySelector("#new-event-button").addEventListener("click", () => openEventDialog());
  document.querySelector("#delete-event-button").addEventListener("click", deleteCurrentEvent);
  document.querySelector("#prev-date").addEventListener("click", () => moveDate(-1));
  document.querySelector("#next-date").addEventListener("click", () => moveDate(1));
  document.querySelector("#today-button").addEventListener("click", () => { currentDate = startOfDay(new Date()); renderCalendar(); });
  document.querySelectorAll(".view-switcher button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  document.querySelector("#dispatch-button").addEventListener("click", renderDispatch);
  document.querySelector("#close-dispatch").addEventListener("click", () => els.dispatchPanel.classList.add("hidden"));
  els.printDispatch.addEventListener("click", () => window.print());
  document.querySelector("#change-log-toggle").addEventListener("click", openLogDialog);
  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  if (state.loggedIn) showApp();
}

function showApp() {
  els.loginScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  renderAll();
}

function renderAll() {
  els.clientSelect.value = selectedClient;
  els.portalTitle.textContent = `Customer Portal - ${selectedClient}`;
  els.taskCount.textContent = clientData().tasks ? `(${clientData().tasks})` : "";
  renderContacts();
  renderCalendar();
}

function renderContacts() {
  const search = els.contactSearch.value.trim().toLowerCase();
  const contacts = clientData().contacts.filter((contact) => `${contact.first} ${contact.last} ${contact.phone} ${contact.email}`.toLowerCase().includes(search));
  els.contactList.innerHTML = "";
  if (!contacts.length) {
    els.contactList.innerHTML = `<div class="empty-state"><div class="people">♙♙</div><strong>No contacts found.</strong><p>Add a contact to get started.</p></div>`;
  }
  contacts.forEach((contact) => {
    const button = document.createElement("button");
    button.className = `contact-item ${contact.id === selectedContactId ? "active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(contact.first)} ${escapeHtml(contact.last)}</strong><small>${escapeHtml(contact.phone)}</small><small>${escapeHtml(contact.email)}</small>`;
    button.addEventListener("click", () => { selectedContactId = contact.id; renderContacts(); renderContactDetail(contact); });
    els.contactList.append(button);
  });
  const selected = clientData().contacts.find((contact) => contact.id === selectedContactId);
  selected ? renderContactDetail(selected) : els.contactDetail.textContent = "Select a contact to view details.";
}

function renderContactDetail(contact) {
  els.contactDetail.innerHTML = `
    <button class="secondary small edit-contact">Edit</button>
    <h3>${escapeHtml(contact.first)} ${escapeHtml(contact.last)}</h3>
    <dl>
      <dt>Phone</dt><dd>${escapeHtml(contact.phone)}</dd>
      <dt>Email</dt><dd>${escapeHtml(contact.email)}</dd>
      <dt>Best contact</dt><dd>${escapeHtml(contact.best)}</dd>
      <dt>In charge of</dt><dd>${escapeHtml(contact.role || "Not listed")}</dd>
      <dt>Notes</dt><dd>${escapeHtml(contact.notes || "No notes")}</dd>
    </dl>`;
  els.contactDetail.querySelector(".edit-contact").addEventListener("click", () => openContactDialog(contact));
}

function openContactDialog(contact = null) {
  document.querySelector("#contact-dialog-title").textContent = contact ? "Edit Contact" : "Add Contact";
  document.querySelector("#contact-id").value = contact?.id || "";
  document.querySelector("#contact-first").value = contact?.first || "";
  document.querySelector("#contact-last").value = contact?.last || "";
  document.querySelector("#contact-phone").value = contact?.phone || "";
  document.querySelector("#contact-email").value = contact?.email || "";
  document.querySelector("#contact-best").value = contact?.best || "Phone";
  document.querySelector("#contact-role").value = contact?.role || "";
  document.querySelector("#contact-notes").value = contact?.notes || "";
  els.contactDialog.showModal();
}

function saveContact(event) {
  event.preventDefault();
  const id = document.querySelector("#contact-id").value;
  const contact = {
    id: id || crypto.randomUUID(),
    first: document.querySelector("#contact-first").value.trim(),
    last: document.querySelector("#contact-last").value.trim(),
    phone: document.querySelector("#contact-phone").value.trim(),
    email: document.querySelector("#contact-email").value.trim(),
    best: document.querySelector("#contact-best").value,
    role: document.querySelector("#contact-role").value.trim(),
    notes: document.querySelector("#contact-notes").value.trim()
  };
  const contacts = clientData().contacts;
  const index = contacts.findIndex((existing) => existing.id === id);
  if (index >= 0) {
    contacts[index] = contact;
    logChange(`Updated contact ${contact.first} ${contact.last}.`);
  } else {
    contacts.push(contact);
    selectedContactId = contact.id;
    logChange(`Added contact ${contact.first} ${contact.last}.`);
  }
  saveState();
  els.contactDialog.close();
  renderContacts();
}

function setView(view) {
  currentView = view;
  document.querySelectorAll(".view-switcher button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  renderCalendar();
}

function moveDate(direction) {
  const amount = currentView === "year" ? 365 : currentView === "month" ? 30 : currentView === "week" ? 7 : 1;
  currentDate = addDays(currentDate, amount * direction);
  renderCalendar();
}

function renderCalendar() {
  els.dispatchPanel.classList.add("hidden");
  els.calendarGrid.className = "calendar-grid";
  if (currentView === "month") return renderMonth();
  if (currentView === "year") return renderYear();
  return renderTimedGrid(currentView === "day" ? 1 : 7);
}

function renderTimedGrid(days) {
  const start = days === 1 ? startOfDay(currentDate) : startOfWeek(currentDate);
  const range = Array.from({ length: days }, (_, index) => addDays(start, index));
  els.calendarTitle.textContent = days === 1 ? formatDate(start) : `${formatDate(range[0])} - ${formatDate(range[range.length - 1])}`;
  els.calendarGrid.classList.add(days === 1 ? "day-grid" : "week-grid");
  els.calendarGrid.style.setProperty("--days", days);
  els.calendarGrid.innerHTML = `<div class="grid-cell day-head"></div>${range.map((date) => `<div class="grid-cell day-head">${weekday(date)}<br>${shortDate(date)}</div>`).join("")}`;
  for (let hour = 0; hour <= 23; hour += 1) {
    els.calendarGrid.insertAdjacentHTML("beforeend", `<div class="grid-cell time-cell">${formatHour(hour)}</div>`);
    range.forEach((date) => {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.addEventListener("dblclick", () => openEventDialog(null, setHour(date, hour)));
      eventsForDay(date).filter((job) => new Date(job.start).getHours() === hour).forEach((job) => cell.append(eventButton(job)));
      els.calendarGrid.append(cell);
    });
  }
}

function renderMonth() {
  const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const gridStart = startOfWeek(start);
  els.calendarTitle.textContent = `${monthName(currentDate)} ${currentDate.getFullYear()}`;
  els.calendarGrid.classList.add("month-grid");
  els.calendarGrid.innerHTML = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<div class="grid-cell day-head">${day}</div>`).join("");
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);
    const cell = document.createElement("div");
    cell.className = `month-day ${date.getMonth() === currentDate.getMonth() ? "" : "muted"}`;
    cell.innerHTML = `<strong>${date.getDate()}</strong>`;
    cell.addEventListener("dblclick", () => openEventDialog(null, setHour(date, 9)));
    eventsForDay(date).slice(0, 3).forEach((job) => cell.append(eventButton(job)));
    els.calendarGrid.append(cell);
  }
}

function renderYear() {
  els.calendarTitle.textContent = `${currentDate.getFullYear()}`;
  els.calendarGrid.classList.add("year-grid");
  els.calendarGrid.innerHTML = "";
  for (let month = 0; month < 12; month += 1) {
    const first = new Date(currentDate.getFullYear(), month, 1);
    const mini = document.createElement("section");
    mini.className = "month-mini";
    mini.innerHTML = `<h3>${monthName(first)}</h3><div class="mini-days">${["S", "M", "T", "W", "T", "F", "S"].map((day) => `<b>${day}</b>`).join("")}</div>`;
    const days = mini.querySelector(".mini-days");
    for (let blank = 0; blank < first.getDay(); blank += 1) days.insertAdjacentHTML("beforeend", "<span></span>");
    for (let day = 1; day <= new Date(first.getFullYear(), month + 1, 0).getDate(); day += 1) {
      const date = new Date(first.getFullYear(), month, day);
      const span = document.createElement("span");
      span.textContent = day;
      span.className = eventsForDay(date).length ? "has-event" : "";
      span.addEventListener("click", () => { currentDate = date; setView("day"); });
      days.append(span);
    }
    els.calendarGrid.append(mini);
  }
}

function eventButton(job) {
  const button = document.createElement("button");
  button.className = "event-chip";
  button.innerHTML = `${escapeHtml(job.name)}<small>${formatTime(new Date(job.start))} · ${escapeHtml(job.location)}</small>`;
  button.addEventListener("click", (event) => { event.stopPropagation(); openEventDialog(job); });
  return button;
}

function openEventDialog(job = null, defaultStart = new Date()) {
  const start = job ? new Date(job.start) : defaultStart;
  const end = job ? new Date(job.end) : new Date(start.getTime() + 60 * 60 * 1000);
  document.querySelector("#event-dialog-title").textContent = job ? "Edit Job" : "Add Job";
  document.querySelector("#event-id").value = job?.id || "";
  document.querySelector("#event-name").value = job?.name || "";
  document.querySelector("#event-location").value = job?.location || "";
  document.querySelector("#event-start").value = toLocalInput(start);
  document.querySelector("#event-end").value = toLocalInput(end);
  document.querySelector("#event-details").value = job?.details || "";
  document.querySelector("#delete-event-button").classList.toggle("hidden", !job);
  els.eventDialog.showModal();
}

function saveEvent(event) {
  event.preventDefault();
  const id = document.querySelector("#event-id").value;
  const job = {
    id: id || crypto.randomUUID(),
    name: document.querySelector("#event-name").value.trim(),
    location: document.querySelector("#event-location").value.trim(),
    start: new Date(document.querySelector("#event-start").value).toISOString(),
    end: new Date(document.querySelector("#event-end").value).toISOString(),
    details: document.querySelector("#event-details").value.trim()
  };
  const events = clientData().events;
  const index = events.findIndex((existing) => existing.id === id);
  if (index >= 0) {
    events[index] = job;
    logChange(`Updated scheduled job ${job.name}.`);
  } else {
    events.push(job);
    logChange(`Added scheduled job ${job.name}.`);
  }
  saveState();
  els.eventDialog.close();
  renderCalendar();
}

function deleteCurrentEvent() {
  const id = document.querySelector("#event-id").value;
  const events = clientData().events;
  const job = events.find((existing) => existing.id === id);
  state.clients[selectedClient].events = events.filter((existing) => existing.id !== id);
  logChange(`Removed scheduled job ${job?.name || "job"}.`);
  saveState();
  els.eventDialog.close();
  renderCalendar();
}

function renderDispatch() {
  const [start, end] = visibleRange();
  const jobs = clientData().events
    .filter((job) => new Date(job.start) >= start && new Date(job.start) < end)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  els.dispatchPanel.classList.remove("hidden");
  els.printDispatch.disabled = !jobs.length;
  els.dispatchList.className = `dispatch-list ${jobs.length ? "" : "empty-dispatch"}`;
  els.dispatchList.innerHTML = jobs.length ? jobs.map((job) => `
    <article class="dispatch-item">
      <strong>${escapeHtml(job.name)} - ${escapeHtml(job.location)}</strong>
      <small>${formatDate(new Date(job.start))} at ${formatTime(new Date(job.start))}</small>
      <p>${escapeHtml(job.details)}</p>
    </article>`).join("") : `<div class="clipboard">▤</div><p>No jobs in this view.</p><small>Add a job or change views to build a dispatch review.</small>`;
  logChange(`Generated ${currentView} dispatch review with ${jobs.length} job(s).`);
}

function openLogDialog() {
  const logs = clientData().logs;
  els.logList.innerHTML = logs.length ? logs.map((entry) => `<article class="log-entry"><strong>${escapeHtml(entry.message)}</strong><small>${new Date(entry.time).toLocaleString()}</small></article>`).join("") : `<article class="log-entry">No changes logged yet.</article>`;
  els.logDialog.showModal();
}

function visibleRange() {
  if (currentView === "day") return [startOfDay(currentDate), addDays(startOfDay(currentDate), 1)];
  if (currentView === "week") return [startOfWeek(currentDate), addDays(startOfWeek(currentDate), 7)];
  if (currentView === "month") return [new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)];
  return [new Date(currentDate.getFullYear(), 0, 1), new Date(currentDate.getFullYear() + 1, 0, 1)];
}

function eventsForDay(date) {
  return clientData().events.filter((job) => sameDay(new Date(job.start), date)).sort((a, b) => new Date(a.start) - new Date(b.start));
}

function seedDemoEvents() {
  if (clientData().events.length) return;
  clientData().events.push(
    { id: crypto.randomUUID(), name: "Site Walk", location: "Main Gate", start: "2024-05-13T08:00:00.000Z", end: "2024-05-13T09:00:00.000Z", details: "Review weekly post orders with the client." },
    { id: crypto.randomUUID(), name: "Guard Coverage", location: "Warehouse 2", start: "2024-05-15T12:00:00.000Z", end: "2024-05-15T18:00:00.000Z", details: "Provide lunch-to-close coverage for loading dock access." },
    { id: crypto.randomUUID(), name: "Patrol Review", location: "North Lot", start: "2024-05-17T16:00:00.000Z", end: "2024-05-17T17:00:00.000Z", details: "Confirm vehicle patrol route and camera blind spots." }
  );
  saveState();
}

function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function startOfWeek(date) { return addDays(startOfDay(date), -date.getDay()); }
function addDays(date, days) { return new Date(date.getTime() + days * dayMs); }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function setHour(date, hour) { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour); }
function formatHour(hour) { return new Date(2024, 0, 1, hour).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function formatTime(date) { return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function formatDate(date) { return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }); }
function shortDate(date) { return date.toLocaleDateString([], { month: "numeric", day: "numeric" }); }
function weekday(date) { return date.toLocaleDateString([], { weekday: "short" }); }
function monthName(date) { return date.toLocaleDateString([], { month: "long" }); }
function toLocalInput(date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

init();
