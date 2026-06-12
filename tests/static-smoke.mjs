import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

const idMatches = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const generatedIdMatches = [...script.matchAll(/\bid=\"([^\"]+)\"/g)].map((match) => match[1]);
const htmlIds = new Set([...idMatches, ...generatedIdMatches]);
const duplicateIds = idMatches.filter((id, index) => idMatches.indexOf(id) !== index);
assert.deepEqual(duplicateIds, [], `Duplicate id attributes found: ${duplicateIds.join(", ")}`);

const queriedIds = new Set([
  ...script.matchAll(/querySelector\(\s*["']#([A-Za-z0-9_-]+)["']\s*\)/g)
].map((match) => match[1]));
const missingIds = [...queriedIds].filter((id) => !htmlIds.has(id));
assert.deepEqual(missingIds, [], `script.js queries missing HTML id(s): ${missingIds.join(", ")}`);

const requiredWorkflows = [
  "login-form",
  "client-select",
  "contact-form",
  "event-form",
  "task-form",
  "calendar-grid",
  "dispatch-button",
  "placeholder-page",
  "device-view-button",
  "change-log-toggle",
  "event-form-error",
  "schedule-help",
  "done-task-dialog",
  "done-task-list"
];
for (const id of requiredWorkflows) {
  assert(htmlIds.has(id), `Missing required workflow element #${id}`);
}

const dataPages = new Set([...html.matchAll(/data-page="([^"]+)"/g)].map((match) => match[1]));
for (const page of dataPages) {
  assert(script.includes(`${page}: {`), `Missing portal page config for data-page="${page}"`);
}

const mainViews = new Set([...html.matchAll(/data-main-view="([^"]+)"/g)].map((match) => match[1]));
assert.deepEqual([...mainViews].sort(), ["schedule", "tasks"], "Unexpected main workspace views");

assert(html.includes('<link rel="stylesheet" href="styles.css" />'), "index.html must load styles.css");
assert(html.includes('<script type="module" src="script.js"></script>'), "index.html must load script.js as a module");
assert(stylesheet.includes(".app-shell"), "styles.css should include app shell layout styles");
assert(stylesheet.includes(".task-board"), "styles.css should include task board styles");
assert(stylesheet.includes(".dispatch-page-layout"), "styles.css should include dispatch page styles");

const scheduleRequirements = [
  `document.querySelector("#dispatch-button").addEventListener("click", renderDispatch)`,
  "function validateJob",
  "function eventsForTimeSlot",
  "function jobOverlapsRange",
  "function addMonths"
];
for (const requirement of scheduleRequirements) {
  assert(script.includes(requirement), `Missing schedule functionality: ${requirement}`);
}

assert(script.includes('let currentView = "month"'), "Schedule should default to the month calendar so users can see dates immediately");
assert(html.includes('data-view="month" class="active"'), "Month view button should be active by default");
assert(html.includes("Calendar is ready."), "Schedule helper should explain how to add schedules");
assert(html.includes("Field Office"), "System name should be Field Office");
assert(!html.includes("Safeguard Services"), "Legacy system name should not appear in the UI shell");
assert(!html.includes("SAFEGUARD"), "Legacy system name should not appear in the header brand");
assert(script.includes('const STORAGE_KEY = "field-office-client-portal-state"'), "Storage key should use the Field Office system name");
assert(script.includes("LEGACY_STORAGE_KEY"), "Stored portal data should migrate from the previous localStorage key");
assert(script.includes("localStorage.removeItem(LEGACY_STORAGE_KEY)"), "Legacy localStorage data should be cleaned up after saving");
assert(script.includes("Haven't Started"), "Task board should show a Haven't Started column");
assert(script.includes("In Progress"), "Task board should show an In Progress column");
assert(script.includes("function doneArchiveTemplate"), "Task board should render Done as an archive drop target");

assert(script.includes("function isCurrentHourSlot"), "Timed calendar views should isolate the today highlight to the current hour slot");
assert(script.includes('cell.className = `grid-cell ${isCurrentHourSlot(date, hour) ? "current-hour-slot" : ""}`'), "Timed calendar cells should only highlight the current hour on today");
assert(!script.includes('day-head ${sameDay(date, new Date()) ? "today" : ""}'), "Timed calendar day headers should not use the today highlight");
assert(!script.includes('isCurrentHourSlot(date, hour) ? "today"'), "Timed calendar current-hour highlighting should not reuse the whole-day today class");
assert(stylesheet.includes(".current-hour-slot"), "Timed calendar current-hour cells should use dedicated styling");
assert(!stylesheet.includes(".grid-cell.today"), "Timed calendar grid cells should not use the whole-day today style");
assert(script.includes("function openDoneTaskArchive"), "Done archive should be clickable/openable");
assert(stylesheet.includes(".archive-column"), "Done archive should use skinny archive column styling");

const scheduleButtons = ["prev-date", "next-date", "today-button", "new-event-button", "dispatch-button"];
for (const id of scheduleButtons) {
  assert(new RegExp(`<button[^>]*id=\"${id}\"[^>]*type=\"button\"`).test(html), `#${id} must be an explicit button`);
}

console.log("Static smoke checks passed.");
