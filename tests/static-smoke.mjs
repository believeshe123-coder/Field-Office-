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
assert(script.includes("Haven't Started"), "Task board should show a Haven't Started column");
assert(script.includes("In Progress"), "Task board should show an In Progress column");
assert(script.includes("function doneArchiveTemplate"), "Task board should render Done as an archive drop target");
assert(script.includes("function openDoneTaskArchive"), "Done archive should be clickable/openable");
assert(stylesheet.includes(".archive-column"), "Done archive should use skinny archive column styling");

const scheduleButtons = ["prev-date", "next-date", "today-button", "new-event-button", "dispatch-button"];
for (const id of scheduleButtons) {
  assert(new RegExp(`<button[^>]*id=\"${id}\"[^>]*type=\"button\"`).test(html), `#${id} must be an explicit button`);
}

console.log("Static smoke checks passed.");
