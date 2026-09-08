// Compiled to static/js/manager.js

let locations: LocationRecord[] = [];
let locationsById: Record<string, LocationRecord> = {};
const rowsById: Record<number, HTMLTableRowElement> = {};
const CURRENT_LOCATION_VALUE = "__current_location__";

function locationByName(name: string): LocationRecord | undefined {
  return locations.find((l) => l.name === name);
}

function populateLocationSelects() {
  const toSel = document.getElementById("f-to") as HTMLSelectElement;
  const prevTo = toSel.value;

  const options = locations
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((l) => `<option value="${escapeHtml(l.name)}">${escapeHtml(l.name)}</option>`)
    .join("");

  toSel.innerHTML = `<option value="" disabled>${t("to_placeholder")}</option>${options}`;
  if (prevTo) toSel.value = prevTo;

  refreshFromSelect();
}

function currentLocationOptionLabel(username: string): string | null {
  const emp = employeesState[username];
  if (!emp) return null;
  const status = emp.online ? t("current_location_live") : t("current_location_agency");
  return `📍 ${emp.display_name} — ${status}`;
}

function refreshFromSelect() {
  const fromSel = document.getElementById("f-from") as HTMLSelectElement | null;
  const employeeSel = document.getElementById("f-employee") as HTMLSelectElement | null;
  if (!fromSel) return;
  const prevFrom = fromSel.value;

  const options = locations
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((l) => `<option value="${escapeHtml(l.name)}">${escapeHtml(l.name)}</option>`)
    .join("");

  let currentLocOption = "";
  const selectedUsername = employeeSel ? employeeSel.value : "";
  if (selectedUsername) {
    const label = currentLocationOptionLabel(selectedUsername);
    if (label) currentLocOption = `<option value="${CURRENT_LOCATION_VALUE}">${escapeHtml(label)}</option>`;
  }

  fromSel.innerHTML = `<option value="" disabled>${t("from_placeholder")}</option>${currentLocOption}${options}`;
  if (prevFrom && (prevFrom === CURRENT_LOCATION_VALUE || locations.find((l) => l.name === prevFrom))) {
    fromSel.value = prevFrom;
  }
}

function renderLocationList() {
  const list = document.getElementById("loc-list") as HTMLUListElement;
  list.innerHTML = locations
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (l) =>
        `<li><span>${escapeHtml(l.name)}</span><span class="coords">${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}</span></li>`
    )
    .join("");
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

async function loadLocations() {
  locations = await fetchJSON<LocationRecord[]>("/api/locations");
  locationsById = Object.fromEntries(locations.map((l) => [l.name, l]));
  populateLocationSelects();
  renderLocationList();
}

// ---------------------------------------------------------------- board --

function statusOptionsHtml(current: TaskStatus): string {
  const statuses: TaskStatus[] = ["assigned", "en_route", "done", "cancelled"];
  return statuses
    .map((s) => `<option value="${s}" ${s === current ? "selected" : ""}>${statusLabel(s)}</option>`)
    .join("");
}

function buildRow(task: TaskRecord): HTMLTableRowElement {
  const tr = document.createElement("tr");
  tr.dataset.id = String(task.id);
  tr.dataset.status = task.status;
  fillRow(tr, task);
  return tr;
}

function fillRow(tr: HTMLTableRowElement, task: TaskRecord) {
  tr.innerHTML = `
    <td class="employee-cell" dir="auto">${escapeHtml(task.employee_name)}</td>
    <td class="person-cell">${escapeHtml(task.person_name)}</td>
    <td class="route-cell">${escapeHtml(task.from_location)}<span class="arrow">→</span>${escapeHtml(task.to_location)}</td>
    <td class="time-cell">${escapeHtml(task.task_time || "—")}</td>
    <td>
      <select class="status-select" data-id="${task.id}">
        ${statusOptionsHtml(task.status)}
      </select>
    </td>
    <td class="time-cell" data-updated="${task.updated_at}">${timeAgo(task.updated_at)}</td>
    <td><button class="row-action" data-id="${task.id}" title="${t("delete_task")}" aria-label="${t("delete_task")}">✕</button></td>
  `;
  tr.dataset.status = task.status;
}

function renderEmptyBoard() {
  const body = document.getElementById("board-body") as HTMLTableSectionElement;
  body.innerHTML = `<tr><td colspan="7" class="empty-state">${t("board_empty")}</td></tr>`;
}

async function loadBoard() {
  const dateInput = document.getElementById("board-date") as HTMLInputElement;
  const body = document.getElementById("board-body") as HTMLTableSectionElement;
  body.innerHTML = `<tr><td colspan="7" class="empty-state">${t("board_loading")}</td></tr>`;
  Object.keys(rowsById).forEach((k) => delete rowsById[+k]);

  const tasks = await fetchJSON<TaskRecord[]>(`/api/tasks?date=${dateInput.value}`);
  if (tasks.length === 0) {
    renderEmptyBoard();
    return;
  }
  body.innerHTML = "";
  tasks.forEach((t) => {
    const row = buildRow(t);
    body.appendChild(row);
    rowsById[t.id] = row;
  });
}

function currentBoardDate(): string {
  return (document.getElementById("board-date") as HTMLInputElement).value;
}

function handleTaskCreated(task: TaskRecord) {
  if (task.task_date !== currentBoardDate()) return;
  const body = document.getElementById("board-body") as HTMLTableSectionElement;
  if (!rowsById[task.id] && body.querySelector(".empty-state")) {
    body.innerHTML = "";
  }
  const row = buildRow(task);
  row.classList.add("is-new");
  body.appendChild(row);
  rowsById[task.id] = row;
}

function handleTaskUpdated(task: TaskRecord) {
  if (task.task_date !== currentBoardDate()) return;
  const row = rowsById[task.id];
  if (!row) {
    handleTaskCreated(task);
    return;
  }
  fillRow(row, task);
  row.classList.add("is-updated");
  setTimeout(() => row.classList.remove("is-updated"), 1200);
}

function handleTaskDeleted(payload: { id: number }) {
  const row = rowsById[payload.id];
  if (row) {
    row.remove();
    delete rowsById[payload.id];
  }
  const body = document.getElementById("board-body") as HTMLTableSectionElement;
  if (body.children.length === 0) renderEmptyBoard();
}

function tickRelativeTimes() {
  document.querySelectorAll<HTMLElement>(".time-cell[data-updated]").forEach((cell) => {
    const iso = cell.dataset.updated;
    if (iso) cell.textContent = timeAgo(iso);
  });
}

// ---------------------------------------------------------- live map ----

declare const L: any;
let liveMap: any = null;
const locationMarkers: Record<string, any> = {};
const employeeMarkers: Record<string, any> = {};
let employeesState: Record<string, EmployeeLocationRecord> = {};
let pickMode: "from" | "to" = "from";

function jitterForOfflineEmployee(username: string): { lat: number; lng: number } {
  // Employees without a live GPS fix all default to the same agency point;
  // spread them in a small circle around it so their pins don't stack.
  const order = Object.keys(APP_EMPLOYEE_ORDER_CACHE || {});
  const idx = order.indexOf(username);
  const n = Math.max(order.length, 1);
  const angle = (idx >= 0 ? idx : 0) * ((2 * Math.PI) / n);
  const radiusDeg = 0.0015;
  return { lat: Math.sin(angle) * radiusDeg, lng: Math.cos(angle) * radiusDeg };
}

let APP_EMPLOYEE_ORDER_CACHE: Record<string, boolean> = {};

function locationDivIcon(): any {
  return L.divIcon({
    className: "",
    html: `<div class="map-marker-icon loc"><span>📍</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

function employeeDivIcon(online: boolean): any {
  return L.divIcon({
    className: "",
    html: `<div class="map-marker-icon ${online ? "employee-online" : "employee-offline"}"><span>🚗</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

function initLiveMap() {
  liveMap = L.map("live-map").setView([36.85, 10.22], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(liveMap);
}

function renderLocationMarkersOnLiveMap() {
  locations.forEach((loc) => {
    if (locationMarkers[loc.name]) return;
    const marker = L.marker([loc.lat, loc.lng], { icon: locationDivIcon() }).addTo(liveMap);
    marker.bindPopup(
      `<p class="popup-title">${escapeHtml(loc.name)}</p><span class="popup-meta">${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}</span>`
    );
    marker.on("click", () => {
      const targetSelect = document.getElementById(pickMode === "from" ? "f-from" : "f-to") as HTMLSelectElement;
      targetSelect.value = loc.name;
      flashPickHint(`${pickMode === "from" ? t("pick_from") : t("pick_to")}: ${loc.name}`);
    });
    locationMarkers[loc.name] = marker;
  });
}

function flashPickHint(text: string) {
  const hint = document.querySelector(".pick-hint") as HTMLElement;
  if (!hint) return;
  hint.textContent = text;
  setTimeout(() => {
    hint.textContent = t("pick_hint");
  }, 2200);
}

function employeePopupHtml(emp: EmployeeLocationRecord): string {
  const status = emp.online
    ? t("popup_live_updated", { time: timeAgo(emp.updated_at as string) })
    : t("popup_not_checked_in");
  const phone = emp.phone
    ? `<a class="popup-phone" href="tel:${emp.phone.replace(/\s+/g, "")}">${escapeHtml(emp.phone)}</a>`
    : "";
  return `
    <p class="popup-title" dir="auto">${escapeHtml(emp.display_name)}</p>
    <span class="popup-meta">${status}</span><br>
    ${phone}
    <button class="popup-btn" data-assign="${emp.username}">${t("popup_assign_button")}</button>
  `;
}

function upsertEmployeeMarker(emp: EmployeeLocationRecord) {
  employeesState[emp.username] = emp;
  const offset = emp.online ? { lat: 0, lng: 0 } : jitterForOfflineEmployee(emp.username);
  const latlng: [number, number] = [emp.lat + offset.lat, emp.lng + offset.lng];

  if (employeeMarkers[emp.username]) {
    const marker = employeeMarkers[emp.username];
    marker.setLatLng(latlng);
    marker.setIcon(employeeDivIcon(emp.online));
    marker.setPopupContent(employeePopupHtml(emp));
  } else {
    const marker = L.marker(latlng, { icon: employeeDivIcon(emp.online) }).addTo(liveMap);
    marker.bindPopup(employeePopupHtml(emp));
    marker.on("popupopen", () => {
      const btn = document.querySelector(`.popup-btn[data-assign="${emp.username}"]`) as HTMLButtonElement | null;
      btn?.addEventListener("click", () => assignFormTo(emp.username));
    });
    employeeMarkers[emp.username] = marker;
  }
  renderRoster();

  const employeeSel = document.getElementById("f-employee") as HTMLSelectElement | null;
  if (employeeSel && employeeSel.value === emp.username) refreshFromSelect();
}

function assignFormTo(username: string) {
  const select = document.getElementById("f-employee") as HTMLSelectElement;
  select.value = username;
  liveMap.closePopup();
  (document.getElementById("f-person") as HTMLInputElement).focus();
  document.getElementById("task-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderRoster() {
  const roster = document.getElementById("employee-roster") as HTMLUListElement;
  const items = Object.values(employeesState).sort((a, b) => a.display_name.localeCompare(b.display_name));
  roster.innerHTML = items
    .map(
      (emp) => `
      <li>
        <span class="name" dir="auto">${escapeHtml(emp.display_name)}</span>
        <span class="roster-meta">
          ${emp.phone ? `<a class="phone-link" href="tel:${emp.phone.replace(/\s+/g, "")}">${escapeHtml(emp.phone)}</a>` : ""}
          <span class="online-tag ${emp.online ? "is-online" : ""}"><span class="dot"></span>${emp.online ? t("roster_live") : t("roster_at_agency")}</span>
        </span>
      </li>`
    )
    .join("");
}

async function loadEmployeeLocations() {
  const emps = await fetchJSON<EmployeeLocationRecord[]>("/api/employee-locations");
  APP_EMPLOYEE_ORDER_CACHE = Object.fromEntries(emps.map((e) => [e.username, true]));
  emps.forEach((e) => upsertEmployeeMarker(e));
}

function setupPickModeButtons() {
  document.querySelectorAll<HTMLButtonElement>(".pick-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pick-mode-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      pickMode = btn.dataset.mode as "from" | "to";
    });
  });
}

// ---------------------------------------------------------------- form ---

function setupForm() {
  const form = document.getElementById("task-form") as HTMLFormElement;
  const msg = document.getElementById("form-msg") as HTMLDivElement;
  const swapBtn = document.getElementById("swap-btn") as HTMLButtonElement;

  swapBtn.addEventListener("click", () => {
    const fromSel = document.getElementById("f-from") as HTMLSelectElement;
    const toSel = document.getElementById("f-to") as HTMLSelectElement;
    if (fromSel.value === CURRENT_LOCATION_VALUE) return; // nothing sensible to swap into "To"
    const tmp = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = tmp;
  });

  (document.getElementById("f-employee") as HTMLSelectElement).addEventListener("change", refreshFromSelect);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    msg.className = "form-msg";

    const employee = (document.getElementById("f-employee") as HTMLSelectElement).value;
    const person = (document.getElementById("f-person") as HTMLInputElement).value.trim();
    const fromValue = (document.getElementById("f-from") as HTMLSelectElement).value;
    const to = (document.getElementById("f-to") as HTMLSelectElement).value;
    const taskDate = (document.getElementById("f-date") as HTMLInputElement).value;
    const taskTime = (document.getElementById("f-time") as HTMLInputElement).value;
    const notes = (document.getElementById("f-notes") as HTMLInputElement).value.trim();

    const from = resolveFromValue(fromValue, employee);

    const submitBtn = form.querySelector("button[type=submit]") as HTMLButtonElement;
    submitBtn.disabled = true;

    try {
      await fetchJSON("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          employee_username: employee,
          person_name: person,
          from_location: from,
          to_location: to,
          task_date: taskDate,
          task_time: taskTime,
          notes,
        }),
      });
      msg.textContent = t("task_assigned");
      msg.className = "form-msg ok";
      (document.getElementById("f-person") as HTMLInputElement).value = "";
      (document.getElementById("f-notes") as HTMLInputElement).value = "";
      (document.getElementById("f-employee") as HTMLSelectElement).selectedIndex = 0;
      refreshFromSelect();
      if (taskDate === currentBoardDate()) {
        // handled by the task_created socket event too, but if sockets are
        // slow this keeps the manager's own board snappy
      }
    } catch (err: any) {
      msg.textContent = err.message || t("could_not_assign");
      msg.className = "form-msg err";
    } finally {
      submitBtn.disabled = false;
    }
  });

  (document.getElementById("board-body") as HTMLElement).addEventListener("change", async (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("status-select")) return;
    const select = target as HTMLSelectElement;
    const id = Number(select.dataset.id);
    try {
      await fetchJSON(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: select.value }),
      });
    } catch (err: any) {
      alert(err.message || t("could_not_update_status"));
    }
  });

  (document.getElementById("board-body") as HTMLElement).addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("row-action")) return;
    const id = Number(target.dataset.id);
    if (!confirm(t("delete_confirm"))) return;
    try {
      await fetchJSON(`/api/tasks/${id}`, { method: "DELETE" });
    } catch (err: any) {
      alert(err.message || t("could_not_delete"));
    }
  });

  (document.getElementById("board-date") as HTMLInputElement).addEventListener("change", loadBoard);
}

function resolveFromValue(fromValue: string, employeeUsername: string): string {
  if (fromValue !== CURRENT_LOCATION_VALUE) return fromValue;
  const emp = employeesState[employeeUsername];
  if (!emp) return fromValue;
  const status = emp.online ? t("current_location_live") : t("current_location_agency");
  return `${emp.display_name} — ${status} (${emp.lat.toFixed(4)}, ${emp.lng.toFixed(4)})`;
}

// ------------------------------------------------------------- tabs ------

function setupTabs() {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.tab;
      (document.getElementById("tab-assign") as HTMLElement).style.display = target === "assign" ? "" : "none";
      (document.getElementById("tab-locations") as HTMLElement).style.display = target === "locations" ? "" : "none";
      if (target === "locations") initMapPicker();
    });
  });
}

// ---------------------------------------------------------- map picker ---

let mapPicker: any = null;
let pickerMarker: any = null;

function initMapPicker() {
  if (mapPicker) {
    mapPicker.invalidateSize();
    return;
  }
  mapPicker = L.map("map-picker").setView([36.85, 10.22], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(mapPicker);

  mapPicker.on("click", (e: any) => {
    const { lat, lng } = e.latlng;
    (document.getElementById("loc-lat") as HTMLInputElement).value = lat.toFixed(6);
    (document.getElementById("loc-lng") as HTMLInputElement).value = lng.toFixed(6);
    if (pickerMarker) {
      pickerMarker.setLatLng(e.latlng);
    } else {
      pickerMarker = L.marker(e.latlng).addTo(mapPicker);
    }
  });
}

function setupLocationForm() {
  const btn = document.getElementById("loc-save-btn") as HTMLButtonElement;
  const msg = document.getElementById("loc-msg") as HTMLDivElement;

  btn.addEventListener("click", async () => {
    const name = (document.getElementById("loc-name") as HTMLInputElement).value.trim();
    const lat = (document.getElementById("loc-lat") as HTMLInputElement).value;
    const lng = (document.getElementById("loc-lng") as HTMLInputElement).value;

    if (!name || !lat || !lng) {
      msg.textContent = t("pick_point_hint");
      msg.className = "form-msg err";
      return;
    }

    try {
      await fetchJSON("/api/locations", {
        method: "POST",
        body: JSON.stringify({ name, lat: Number(lat), lng: Number(lng) }),
      });
      msg.textContent = t("location_saved");
      msg.className = "form-msg ok";
      (document.getElementById("loc-name") as HTMLInputElement).value = "";
      (document.getElementById("loc-lat") as HTMLInputElement).value = "";
      (document.getElementById("loc-lng") as HTMLInputElement).value = "";
      if (pickerMarker) {
        mapPicker.removeLayer(pickerMarker);
        pickerMarker = null;
      }
    } catch (err: any) {
      msg.textContent = err.message || t("could_not_save_location");
      msg.className = "form-msg err";
    }
  });
}

// ------------------------------------------------------------- init ------

async function initManager() {
  setupForm();
  setupTabs();
  setupLocationForm();
  setupPickModeButtons();
  initLiveMap();
  const timeInput = document.getElementById("f-time") as HTMLInputElement | null;
  if (timeInput && !timeInput.value) {
    const now = new Date();
    timeInput.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }
  await loadLocations();
  renderLocationMarkersOnLiveMap();
  await loadEmployeeLocations();
  await loadBoard();

  const socket = connectSocket();
  socket.on("task_created", handleTaskCreated);
  socket.on("task_updated", handleTaskUpdated);
  socket.on("task_deleted", handleTaskDeleted);
  socket.on("employee_location_updated", (emp: EmployeeLocationRecord) => upsertEmployeeMarker(emp));
  socket.on("locations_changed", (loc: LocationRecord) => {
    if (!locations.find((l) => l.id === loc.id)) {
      locations.push(loc);
      populateLocationSelects();
      renderLocationList();
      renderLocationMarkersOnLiveMap();
    }
  });

  setInterval(tickRelativeTimes, 30000);

  window.addEventListener("langchange", () => {
    populateLocationSelects();
    renderLocationList();
    renderLocationMarkersOnLiveMap();
    renderRoster();
    loadBoard();
  });
}

initManager();
