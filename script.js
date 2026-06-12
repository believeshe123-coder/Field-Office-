const STORAGE_KEY = "safeguard-client-portal-state";
const dayMs = 86_400_000;
const hourMs = 3_600_000;
const clients = ["Test 1", "Acme Logistics", "North Ridge Medical"];
const deviceViews = ["auto", "computer", "tablet", "phone"];
const portalPages = {
  customer: {
    icon: "▥",
    kicker: "Customer Portal",
    title: "Customer Portal",
    copy: "This basic customer portal screen is ready for client dashboard content, requests, and shared account updates."
  },
  recruiting: {
    icon: "👥",
    kicker: "Recruiting Portal",
    title: "Recruiting Portal",
    copy: "This basic recruiting screen is ready for applicant tracking, open posts, interview notes, and onboarding tools."
  },
  records: {
    icon: "💵",
    kicker: "Invoicing / Records",
    title: "Invoicing / Records Portal",
    copy: "This basic records screen is ready for invoices, payment history, contract files, and important client documents."
  },
  tasks: {
    icon: "▣",
    kicker: "Tasks",
    title: "Tasks Portal",
    copy: "This basic tasks screen is ready for follow-ups, assigned work, priority items, and reminders."
  },
  dispatch: {
    icon: "▣",
    kicker: "Dispatching",
    title: "Dispatch Review",
    copy: "Review the schedules in the current calendar view before printing or assigning dispatch coverage."
  }
};
const state = loadState();
let selectedClient = state.selectedClient || clients[0];
let selectedContactId = null;
let currentDate = startOfDay(new Date());
let currentView = "month";
let activeMainView = "schedule";
let dispatchStartDate = null;
let dispatchEndDate = null;

const els = {
  loginScreen: document.querySelector("#login-screen"),
  appShell: document.querySelector("#app-shell"),
  loginForm: document.querySelector("#login-form"),
  loginUsername: document.querySelector("#login-username"),
  loginPassword: document.querySelector("#login-password"),
  loginError: document.querySelector("#login-error"),
  logoutButton: document.querySelector("#logout-button"),
  deviceViewButton: document.querySelector("#device-view-button"),
  portalLayout: document.querySelector("#portal-layout"),
  placeholderPage: document.querySelector("#placeholder-page"),
  backToDashboard: document.querySelector("#back-to-dashboard"),
  placeholderIcon: document.querySelector("#placeholder-icon"),
  placeholderKicker: document.querySelector("#placeholder-kicker"),
  placeholderTitle: document.querySelector("#placeholder-title"),
  placeholderCopy: document.querySelector("#placeholder-copy"),
  placeholderContent: document.querySelector("#placeholder-content"),
  clientSelect: document.querySelector("#client-select"),
  portalTitle: document.querySelector("#portal-title"),
  taskCount: document.querySelector("#task-count"),
  scheduleMainView: document.querySelector("#schedule-main-view"),
  taskMainView: document.querySelector("#task-main-view"),
  taskForm: document.querySelector("#task-form"),
  taskTitleInput: document.querySelector("#task-title-input"),
  taskBoard: document.querySelector("#task-board"),
  doneTaskDialog: document.querySelector("#done-task-dialog"),
  doneTaskList: document.querySelector("#done-task-list"),
  memoryNotes: document.querySelector("#memory-notes"),
  memoryStatus: document.querySelector("#memory-status"),
  saveMemoryButton: document.querySelector("#save-memory-button"),
  clearMemoryButton: document.querySelector("#clear-memory-button"),
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
  logList: document.querySelector("#change-log-list"),
  eventFormError: document.querySelector("#event-form-error")
};

function loadState() {
  const fallback = {
    loggedIn: false,
    selectedClient: clients[0],
    deviceView: "auto",
    clients: Object.fromEntries(clients.map((client) => [client, { contacts: [], events: [], logs: [], memory: { notes: "", updatedAt: null }, tasks: [] }]))
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
    stored.clients[client].memory = normalizeMemory(stored.clients[client].memory);
    stored.clients[client].tasks = normalizeTasks(stored.clients[client].tasks);
  });
  return { ...fallback, ...stored };
}

function normalizeTasks(tasks) {
  return Array.isArray(tasks) ? tasks : [];
}


function normalizeMemory(memory) {
  if (typeof memory === "string") return { notes: memory, updatedAt: null };
  return {
    notes: typeof memory?.notes === "string" ? memory.notes : "",
    updatedAt: typeof memory?.updatedAt === "string" ? memory.updatedAt : null
  };
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
  els.deviceViewButton.addEventListener("click", cycleDeviceView);
  applyDeviceView(state.deviceView || "auto");
  els.backToDashboard.addEventListener("click", showDashboard);
  document.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => openPortalPage(button.dataset.page)));
  document.querySelectorAll("[data-main-view]").forEach((button) => button.addEventListener("click", () => setMainView(button.dataset.mainView)));
  els.taskForm.addEventListener("submit", addTask);
  els.saveMemoryButton.addEventListener("click", saveMemory);
  els.clearMemoryButton.addEventListener("click", clearMemory);
  els.memoryNotes.addEventListener("input", () => setMemoryStatus("Unsaved", true));
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
  els.taskCount.textContent = clientData().tasks.length ? `(${clientData().tasks.length})` : "";
  renderContacts();
  renderMemory();
  renderCalendar();
  renderTasks();
  setMainView(activeMainView);
}

function showDashboard() {
  els.placeholderPage.classList.add("hidden");
  els.portalLayout.classList.remove("hidden");
  renderAll();
}

function renderMemory() {
  const memory = clientData().memory;
  els.memoryNotes.value = memory.notes;
  setMemoryStatus(memory.updatedAt ? `Saved ${new Date(memory.updatedAt).toLocaleString()}` : "Ready");
}

function saveMemory() {
  const notes = els.memoryNotes.value.trim();
  clientData().memory = { notes, updatedAt: new Date().toISOString() };
  logChange(notes ? "Updated local memory." : "Cleared local memory.");
  setMemoryStatus("Saved just now");
}

function clearMemory() {
  els.memoryNotes.value = "";
  saveMemory();
}

function setMemoryStatus(message, isUnsaved = false) {
  els.memoryStatus.textContent = message;
  els.memoryStatus.classList.toggle("unsaved", isUnsaved);
}

function setMainView(view) {
  activeMainView = view === "tasks" ? "tasks" : "schedule";
  els.scheduleMainView.classList.toggle("hidden", activeMainView !== "schedule");
  els.taskMainView.classList.toggle("hidden", activeMainView !== "tasks");
  document.querySelectorAll("[data-main-view]").forEach((button) => button.classList.toggle("active", button.dataset.mainView === activeMainView));
}

function addTask(event) {
  event.preventDefault();
  const title = els.taskTitleInput.value.trim();
  if (!title) return;
  clientData().tasks.push({ id: crypto.randomUUID(), title, status: "todo", createdAt: new Date().toISOString() });
  els.taskTitleInput.value = "";
  logChange(`Added task ${title}.`);
  renderTasks();
}

function renderTasks() {
  const columns = [
    { status: "todo", title: "Haven't Started" },
    { status: "progress", title: "In Progress" },
    { status: "done", title: "Done", archive: true }
  ];
  els.taskBoard.innerHTML = columns.map((column) => taskColumnTemplate(column)).join("");
  els.taskBoard.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", card.dataset.taskId));
  });
  els.taskBoard.querySelectorAll(".done-archive-button").forEach((button) => button.addEventListener("click", openDoneTaskArchive));
  els.taskBoard.querySelectorAll(".task-column").forEach((column) => {
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.classList.add("drag-over");
    });
    column.addEventListener("dragleave", () => column.classList.remove("drag-over"));
    column.addEventListener("drop", (event) => {
      event.preventDefault();
      column.classList.remove("drag-over");
      moveTask(event.dataTransfer.getData("text/plain"), column.dataset.status);
    });
  });
  els.taskCount.textContent = clientData().tasks.length ? `(${clientData().tasks.length})` : "";
}

function taskColumnTemplate(column) {
  const tasks = clientData().tasks.filter((task) => task.status === column.status);
  const archiveClass = column.archive ? " archive-column" : "";
  return `
    <section class="task-column${archiveClass}" data-status="${column.status}">
      <div class="task-column-header">
        <h3>${column.title}</h3>
        <span>${tasks.length}</span>
      </div>
      <div class="task-drop-zone">
        ${column.archive ? doneArchiveTemplate(tasks) : tasks.length ? tasks.map(taskCardTemplate).join("") : `<p class="empty-task-column">Drop tasks here.</p>`}
      </div>
    </section>`;
}

function doneArchiveTemplate(tasks) {
  return `
    <button class="done-archive-button" type="button">
      <strong>${tasks.length}</strong>
      <span>Open Done Archive</span>
      <small>Drop completed tasks here.</small>
    </button>`;
}

function taskCardTemplate(task) {
  return `<article class="task-card" draggable="true" data-task-id="${escapeHtml(task.id)}"><strong>${escapeHtml(task.title)}</strong><small>Added ${new Date(task.createdAt).toLocaleDateString()}</small></article>`;
}

function moveTask(taskId, status) {
  const task = clientData().tasks.find((item) => item.id === taskId);
  if (!task || task.status === status) return;
  task.status = status;
  logChange(`Moved task ${task.title} to ${statusLabel(status)}.`);
  saveState();
  renderTasks();
}

function openDoneTaskArchive() {
  const doneTasks = clientData().tasks
    .filter((task) => task.status === "done")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  els.doneTaskList.innerHTML = doneTasks.length ? doneTasks.map((task) => `
    <article class="done-task-item">
      <strong>${escapeHtml(task.title)}</strong>
      <small>Added ${new Date(task.createdAt).toLocaleDateString()}</small>
    </article>`).join("") : `<article class="done-task-item empty-done-archive">No completed tasks archived yet.</article>`;
  els.doneTaskDialog.showModal();
}

function statusLabel(status) {
  return { todo: "Haven't Started", progress: "In Progress", done: "Done Archive" }[status] || status;
}

function openPortalPage(pageKey) {
  const page = portalPages[pageKey] || portalPages.customer;
  els.portalLayout.classList.add("hidden");
  els.placeholderPage.classList.remove("hidden");
  els.placeholderIcon.textContent = page.icon;
  els.placeholderKicker.textContent = page.kicker;
  els.placeholderTitle.textContent = page.title;
  els.placeholderCopy.textContent = page.copy;
  if (pageKey === "dispatch") {
    const [start, end] = visibleRange();
    dispatchStartDate = startOfDay(start);
    dispatchEndDate = addDays(startOfDay(end), -1);
    renderDispatchPage();
    logChange(`Opened ${currentView} dispatch page.`);
    return;
  }
  els.placeholderContent.innerHTML = basicPortalContent(pageKey, page);
}

function basicPortalContent(pageKey, page) {
  return `
    <article class="basic-screen-panel">
      <h2>${escapeHtml(page.title)} Coming Soon</h2>
      <p>For now, this button opens a basic screen so the ${escapeHtml(page.kicker.toLowerCase())} has a clear destination while the full workflow is built.</p>
      <ul>
        <li>Selected client: <strong>${escapeHtml(selectedClient)}</strong></li>
        <li>Screen key: <strong>${escapeHtml(pageKey)}</strong></li>
        <li>Status: <strong>Placeholder ready</strong></li>
      </ul>
    </article>`;
}

function renderDispatchPage() {
  normalizeDispatchRange();
  els.placeholderContent.innerHTML = dispatchPageContent();
  document.querySelector("#dispatch-range-start").addEventListener("change", updateDispatchRange);
  document.querySelector("#dispatch-range-end").addEventListener("change", updateDispatchRange);
  els.placeholderContent.querySelector("[data-print-dispatch]").addEventListener("click", () => window.print());
}

function updateDispatchRange() {
  dispatchStartDate = parseDateInput(document.querySelector("#dispatch-range-start").value) || dispatchStartDate;
  dispatchEndDate = parseDateInput(document.querySelector("#dispatch-range-end").value) || dispatchEndDate;
  renderDispatchPage();
}

function normalizeDispatchRange() {
  dispatchStartDate = startOfDay(dispatchStartDate || currentDate);
  dispatchEndDate = startOfDay(dispatchEndDate || dispatchStartDate);
  if (dispatchEndDate < dispatchStartDate) [dispatchStartDate, dispatchEndDate] = [dispatchEndDate, dispatchStartDate];
}

function dispatchPageContent() {
  const jobs = jobsForDispatchRange();
  return `
    <div class="dispatch-range-toolbar">
      <label>Start date<input id="dispatch-range-start" type="date" value="${dateInputValue(dispatchStartDate)}" /></label>
      <label>End date<input id="dispatch-range-end" type="date" value="${dateInputValue(dispatchEndDate)}" /></label>
      <button class="secondary" type="button" data-print-dispatch>▣ Print Dispatch</button>
    </div>
    <section class="dispatch-page-layout">
      <section class="dispatch-schedule-panel">
        <div class="dispatch-section-heading">
          <h2>Schedule</h2>
          <small>${formatDate(dispatchStartDate)} - ${formatDate(dispatchEndDate)}</small>
        </div>
        ${dispatchCalendarGrid()}
      </section>
      <aside class="dispatch-list-panel">
        <div class="dispatch-section-heading">
          <h2>Dispatch List</h2>
          <small>${jobs.length} schedule(s) selected</small>
        </div>
        <div class="dispatch-page-list">${dispatchJobCards(jobs)}</div>
      </aside>
    </section>`;
}

function dispatchCalendarGrid() {
  const gridStart = startOfWeek(dispatchStartDate);
  const gridEnd = addDays(startOfWeek(dispatchEndDate), 6);
  const totalDays = Math.round((gridEnd - gridStart) / dayMs) + 1;
  const headings = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<div class="dispatch-calendar-head">${day}</div>`).join("");
  const cells = Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(gridStart, index);
    const dayJobs = eventsForDay(date);
    const classes = ["dispatch-calendar-day"];
    if (date < dispatchStartDate || date > dispatchEndDate) classes.push("muted");
    if (date >= dispatchStartDate && date <= dispatchEndDate) classes.push("in-range");
    if (sameDay(date, new Date())) classes.push("today");
    return `
      <article class="${classes.join(" ")}">
        <strong>${shortDate(date)}</strong>
        ${dayJobs.slice(0, 2).map((job) => `<span>${escapeHtml(job.name)}</span>`).join("")}
      </article>`;
  }).join("");
  return `<div class="dispatch-calendar-title">Selected schedule range</div><div class="dispatch-calendar-grid">${headings}${cells}</div>`;
}

function jobsForDispatchRange() {
  const rangeEnd = addDays(dispatchEndDate, 1);
  return clientData().events
    .filter((job) => jobOverlapsRange(job, dispatchStartDate, rangeEnd))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

function dispatchJobCards(jobs) {
  if (!jobs.length) return `<article class="dispatch-page-item empty-dispatch"><div class="clipboard">▤</div><p>No schedules in this date range.</p><small>Change the range above or add a schedule from the main calendar.</small></article>`;
  return jobs.map((job) => {
    const start = new Date(job.start);
    const classes = `dispatch-page-item ${sameDay(start, new Date()) ? "today" : ""}`;
    return `
      <article class="${classes}">
        <strong>${escapeHtml(job.name)} - ${escapeHtml(job.location)}</strong>
        <small>${formatDate(start)} at ${formatTime(start)}</small>
        <p>${escapeHtml(job.details)}</p>
      </article>`;
  }).join("");
}


function cycleDeviceView() {
  const currentIndex = deviceViews.indexOf(state.deviceView || "auto");
  const nextView = deviceViews[(currentIndex + 1) % deviceViews.length];
  applyDeviceView(nextView);
}

function applyDeviceView(view) {
  const safeView = deviceViews.includes(view) ? view : "auto";
  state.deviceView = safeView;
  els.appShell.dataset.deviceView = safeView;
  els.deviceViewButton.textContent = `${viewLabel(safeView)} View`;
  els.deviceViewButton.setAttribute("aria-label", `Switch device preview. Current view: ${viewLabel(safeView)}`);
  els.deviceViewButton.setAttribute("aria-pressed", safeView === "auto" ? "false" : "true");
  saveState();
}

function viewLabel(view) {
  return { auto: "Auto", computer: "Computer", tablet: "Tablet", phone: "Phone" }[view];
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
  if (!["day", "week", "month", "year"].includes(view)) return;
  currentView = view;
  document.querySelectorAll(".view-switcher button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  renderCalendar();
}

function moveDate(direction) {
  if (currentView === "year") currentDate = addMonths(currentDate, 12 * direction);
  else if (currentView === "month") currentDate = addMonths(currentDate, direction);
  else currentDate = addDays(currentDate, (currentView === "week" ? 7 : 1) * direction);
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
  els.calendarGrid.innerHTML = `<div class="grid-cell day-head"></div>${range.map((date) => `<div class="grid-cell day-head ${sameDay(date, new Date()) ? "today" : ""}">${weekday(date)}<br>${shortDate(date)}</div>`).join("")}`;
  for (let hour = 0; hour <= 23; hour += 1) {
    els.calendarGrid.insertAdjacentHTML("beforeend", `<div class="grid-cell time-cell">${formatHour(hour)}</div>`);
    range.forEach((date) => {
      const cell = document.createElement("div");
      cell.className = `grid-cell ${sameDay(date, new Date()) ? "today" : ""}`;
      cell.title = `Add a schedule on ${formatDate(date)} at ${formatHour(hour)}`;
      cell.addEventListener("click", () => openEventDialog(null, setHour(date, hour)));
      eventsForTimeSlot(date, hour).forEach((job) => cell.append(eventButton(job)));
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
    cell.className = `month-day ${date.getMonth() === currentDate.getMonth() ? "" : "muted"} ${sameDay(date, new Date()) ? "today" : ""}`;
    cell.innerHTML = `<strong>${date.getDate()}</strong>`;
    cell.title = `Add a schedule on ${formatDate(date)}`;
    cell.addEventListener("click", () => openEventDialog(null, setHour(date, 9)));
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
      span.className = `${eventsForDay(date).length ? "has-event" : ""} ${sameDay(date, new Date()) ? "today" : ""}`.trim();
      span.addEventListener("click", () => { currentDate = date; setView("day"); });
      days.append(span);
    }
    els.calendarGrid.append(mini);
  }
}

function eventButton(job) {
  const button = document.createElement("button");
  button.className = "event-chip";
  const start = new Date(job.start);
  const end = eventEnd(job);
  button.innerHTML = `${escapeHtml(job.name)}<small>${formatTime(start)}-${formatTime(end)} · ${escapeHtml(job.location)}</small>`;
  button.addEventListener("click", (event) => { event.stopPropagation(); openEventDialog(job); });
  return button;
}

function openEventDialog(job = null, defaultStart = new Date()) {
  const start = job ? new Date(job.start) : defaultStart;
  const end = job ? new Date(job.end) : new Date(start.getTime() + 60 * 60 * 1000);
  document.querySelector("#event-dialog-title").textContent = job ? "Edit Schedule" : "Add Schedule";
  document.querySelector("#event-id").value = job?.id || "";
  document.querySelector("#event-name").value = job?.name || "";
  document.querySelector("#event-location").value = job?.location || "";
  document.querySelector("#event-start").value = toLocalInput(start);
  document.querySelector("#event-end").value = toLocalInput(end);
  document.querySelector("#event-details").value = job?.details || "";
  els.eventFormError.textContent = "";
  document.querySelector("#delete-event-button").classList.toggle("hidden", !job);
  els.eventDialog.showModal();
}

function saveEvent(event) {
  event.preventDefault();
  const id = document.querySelector("#event-id").value;
  const start = new Date(document.querySelector("#event-start").value);
  const end = new Date(document.querySelector("#event-end").value);
  const draft = {
    name: document.querySelector("#event-name").value.trim(),
    location: document.querySelector("#event-location").value.trim(),
    details: document.querySelector("#event-details").value.trim()
  };
  const validationError = validateJob(draft, start, end);
  if (validationError) {
    els.eventFormError.textContent = validationError;
    return;
  }
  const job = {
    id: id || crypto.randomUUID(),
    ...draft,
    start: start.toISOString(),
    end: end.toISOString()
  };
  const events = clientData().events;
  const index = events.findIndex((existing) => existing.id === id);
  if (index >= 0) {
    events[index] = job;
    logChange(`Updated schedule ${job.name}.`);
  } else {
    events.push(job);
    logChange(`Added schedule ${job.name}.`);
  }
  currentDate = startOfDay(start);
  saveState();
  els.eventDialog.close();
  renderCalendar();
}

function deleteCurrentEvent() {
  const id = document.querySelector("#event-id").value;
  if (!id) return els.eventDialog.close();
  const events = clientData().events;
  const job = events.find((existing) => existing.id === id);
  state.clients[selectedClient].events = events.filter((existing) => existing.id !== id);
  logChange(`Removed schedule ${job?.name || "schedule"}.`);
  saveState();
  els.eventDialog.close();
  renderCalendar();
}

function renderDispatch() {
  const [start, end] = visibleRange();
  const jobs = clientData().events
    .filter((job) => jobOverlapsRange(job, start, end))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  els.dispatchPanel.classList.remove("hidden");
  els.printDispatch.disabled = !jobs.length;
  els.dispatchList.className = `dispatch-list ${jobs.length ? "" : "empty-dispatch"}`;
  els.dispatchList.innerHTML = jobs.length ? jobs.map((job) => `
    <article class="dispatch-item">
      <strong>${escapeHtml(job.name)} - ${escapeHtml(job.location)}</strong>
      <small>${formatDate(new Date(job.start))} at ${formatTime(new Date(job.start))}</small>
      <p>${escapeHtml(job.details)}</p>
    </article>`).join("") : `<div class="clipboard">▤</div><p>No schedules in this view.</p><small>Add a schedule or change views to build a dispatch review.</small>`;
  logChange(`Generated ${currentView} dispatch review with ${jobs.length} schedule(s).`);
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
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  return clientData().events.filter((job) => jobOverlapsRange(job, dayStart, dayEnd)).sort((a, b) => new Date(a.start) - new Date(b.start));
}

function eventsForTimeSlot(date, hour) {
  const slotStart = setHour(date, hour);
  const slotEnd = new Date(slotStart.getTime() + hourMs);
  return clientData().events.filter((job) => jobOverlapsRange(job, slotStart, slotEnd)).sort((a, b) => new Date(a.start) - new Date(b.start));
}

function seedDemoEvents() {
  if (clientData().events.length) return;
  const weekStart = startOfWeek(currentDate);
  const demoJobs = [
    { name: "Site Walk", location: "Main Gate", dayOffset: 1, startHour: 8, endHour: 9, details: "Review weekly post orders with the client." },
    { name: "Guard Coverage", location: "Warehouse 2", dayOffset: 3, startHour: 12, endHour: 18, details: "Provide lunch-to-close coverage for loading dock access." },
    { name: "Patrol Review", location: "North Lot", dayOffset: 5, startHour: 16, endHour: 17, details: "Confirm vehicle patrol route and camera blind spots." }
  ];
  clientData().events.push(...demoJobs.map((job) => {
    const start = setHour(addDays(weekStart, job.dayOffset), job.startHour);
    const end = setHour(addDays(weekStart, job.dayOffset), job.endHour);
    return { id: crypto.randomUUID(), name: job.name, location: job.location, start: start.toISOString(), end: end.toISOString(), details: job.details };
  }));
  saveState();
}

function validateJob(job, start, end) {
  if (!job.name || !job.location || !job.details) return "Complete the schedule name, location, and details before saving.";
  if (!isValidDate(start) || !isValidDate(end)) return "Enter valid start and end times for this schedule.";
  if (end <= start) return "End time must be after start time.";
  return "";
}

function jobOverlapsRange(job, rangeStart, rangeEnd) {
  const start = new Date(job.start);
  if (!isValidDate(start)) return false;
  const end = eventEnd(job);
  return start < rangeEnd && end > rangeStart;
}

function eventEnd(job) {
  const start = new Date(job.start);
  const end = new Date(job.end);
  return isValidDate(end) && end > start ? end : new Date(start.getTime() + hourMs);
}

function isValidDate(date) { return date instanceof Date && !Number.isNaN(date.getTime()); }
function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function startOfWeek(date) { return addDays(startOfDay(date), -date.getDay()); }
function addDays(date, days) { return new Date(date.getTime() + days * dayMs); }
function addMonths(date, months) {
  const target = new Date(date);
  const day = target.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  target.setDate(Math.min(day, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
  return startOfDay(target);
}
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function setHour(date, hour) { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour); }
function formatHour(hour) { return new Date(2024, 0, 1, hour).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function formatTime(date) { return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function formatDate(date) { return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }); }
function shortDate(date) { return date.toLocaleDateString([], { month: "numeric", day: "numeric" }); }
function weekday(date) { return date.toLocaleDateString([], { weekday: "short" }); }
function monthName(date) { return date.toLocaleDateString([], { month: "long" }); }
function dateInputValue(date) { return toLocalInput(date).slice(0, 10); }
function parseDateInput(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function toLocalInput(date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

init();
