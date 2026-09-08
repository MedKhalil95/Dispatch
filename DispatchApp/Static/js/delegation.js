"use strict";
let delegEmployeesState = {};
const delegEmployeeMarkers = {};
let delegLiveMap = null;
let delegEmployeeOrder = [];
function delegEmployeeDivIcon(online) {
    return L.divIcon({
        className: "",
        html: `<div class="map-marker-icon ${online ? "employee-online" : "employee-offline"}"><span>🚗</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
    });
}
function delegJitterForOfflineEmployee(username) {
    const idx = delegEmployeeOrder.indexOf(username);
    const n = Math.max(delegEmployeeOrder.length, 1);
    const angle = (idx >= 0 ? idx : 0) * ((2 * Math.PI) / n);
    const radiusDeg = 0.0015;
    return { lat: Math.sin(angle) * radiusDeg, lng: Math.cos(angle) * radiusDeg };
}
function delegEscapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}
function delegEmployeePopupHtml(emp) {
    const status = emp.online
        ? t("popup_live_updated", { time: timeAgo(emp.updated_at) })
        : t("popup_not_checked_in");
    const phone = emp.phone
        ? `<a class="action-btn call-btn" href="tel:${emp.phone.replace(/\s+/g, "")}">${t("call_button")}</a>`
        : "";
    return `
    <p class="popup-title" dir="auto">${delegEscapeHtml(emp.display_name)}</p>
    <span class="popup-meta">${status}</span>
    <div class="action-buttons" style="margin-top:10px;">
      ${phone}
      <button type="button" class="action-btn directions-btn" data-directions-username="${emp.username}">${t("directions_button")}</button>
    </div>
  `;
}
function delegBindPopupDirectionsButton(username) {
    const btn = document.querySelector(`.directions-btn[data-directions-username="${username}"]`);
    btn === null || btn === void 0 ? void 0 : btn.addEventListener("click", () => delegOpenDirectionsFor(username));
}
function delegUpsertEmployeeMarker(emp) {
    delegEmployeesState[emp.username] = emp;
    const offset = emp.online ? { lat: 0, lng: 0 } : delegJitterForOfflineEmployee(emp.username);
    const latlng = [emp.lat + offset.lat, emp.lng + offset.lng];
    if (delegEmployeeMarkers[emp.username]) {
        const marker = delegEmployeeMarkers[emp.username];
        marker.setLatLng(latlng);
        marker.setIcon(delegEmployeeDivIcon(emp.online));
        marker.setPopupContent(delegEmployeePopupHtml(emp));
    }
    else {
        const marker = L.marker(latlng, { icon: delegEmployeeDivIcon(emp.online) }).addTo(delegLiveMap);
        marker.bindPopup(delegEmployeePopupHtml(emp));
        marker.on("popupopen", () => delegBindPopupDirectionsButton(emp.username));
        delegEmployeeMarkers[emp.username] = marker;
    }
}
function delegOpenDirectionsFor(username) {
    const emp = delegEmployeesState[username];
    if (!emp)
        return;
    window.open(googleMapsUrl(undefined, { lat: emp.lat, lng: emp.lng }, emp.display_name), "_blank", "noopener");
}
async function delegLoadEmployeeLocations() {
    const emps = await fetchJSON("/api/employee-locations");
    delegEmployeeOrder = emps.map((e) => e.username);
    emps.forEach((e) => delegUpsertEmployeeMarker(e));
    if (emps.length > 0) {
        const bounds = L.latLngBounds(emps.map((e) => [e.lat, e.lng]));
        delegLiveMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
}
function delegInitLiveMap() {
    delegLiveMap = L.map("live-map").setView([36.85, 10.22], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
    }).addTo(delegLiveMap);
}
function delegStatusTagHtml(status) {
    return `<span class="status-tag status-${status}">${statusLabel(status)}</span>`;
}
function delegTaskRowHtml(task) {
    const phoneBtn = task.employee_phone
        ? `<a class="action-btn call-btn" href="tel:${task.employee_phone.replace(/\s+/g, "")}">${t("call_button")}</a>`
        : "";
    return `
    <tr data-id="${task.id}">
      <td class="employee-cell" dir="auto">${delegEscapeHtml(task.employee_name)}</td>
      <td class="person-cell">${delegEscapeHtml(task.person_name)}</td>
      <td class="route-cell">${delegEscapeHtml(task.from_location)}<span class="arrow">→</span>${delegEscapeHtml(task.to_location)}</td>
      <td class="time-cell">${delegEscapeHtml(task.task_time || "—")}</td>
      <td>${delegStatusTagHtml(task.status)}</td>
      <td class="time-cell" data-updated="${task.updated_at}">${timeAgo(task.updated_at)}</td>
      <td>
        <div class="action-buttons">
          ${phoneBtn}
          <button type="button" class="action-btn directions-btn" data-directions-username="${task.employee_username}">${t("directions_button")}</button>
        </div>
      </td>
    </tr>
  `;
}
function delegRenderEmptyBoard() {
    const body = document.getElementById("board-body");
    body.innerHTML = `<tr><td colspan="7" class="empty-state">${t("board_empty")}</td></tr>`;
}
const delegRowsById = {};
function delegCurrentBoardDate() {
    return document.getElementById("board-date").value;
}
async function delegLoadBoard() {
    const body = document.getElementById("board-body");
    body.innerHTML = `<tr><td colspan="7" class="empty-state">${t("board_loading")}</td></tr>`;
    Object.keys(delegRowsById).forEach((k) => delete delegRowsById[+k]);
    const tasks = await fetchJSON(`/api/tasks?date=${delegCurrentBoardDate()}`);
    if (tasks.length === 0) {
        delegRenderEmptyBoard();
        return;
    }
    body.innerHTML = tasks.map(delegTaskRowHtml).join("");
    tasks.forEach((task) => {
        const row = body.querySelector(`tr[data-id="${task.id}"]`);
        if (row)
            delegRowsById[task.id] = row;
    });
}
function delegUpsertRow(task) {
    if (task.task_date !== delegCurrentBoardDate())
        return;
    const body = document.getElementById("board-body");
    if (body.querySelector(".empty-state"))
        body.innerHTML = "";
    const existing = delegRowsById[task.id];
    const html = delegTaskRowHtml(task);
    if (existing) {
        existing.outerHTML = html;
    }
    else {
        body.insertAdjacentHTML("beforeend", html);
    }
    const row = body.querySelector(`tr[data-id="${task.id}"]`);
    if (row) {
        delegRowsById[task.id] = row;
        row.classList.add("is-updated");
        setTimeout(() => row.classList.remove("is-updated"), 1200);
    }
}
function delegRemoveRow(taskId) {
    const row = delegRowsById[taskId];
    if (row) {
        row.remove();
        delete delegRowsById[taskId];
    }
    const body = document.getElementById("board-body");
    if (body.children.length === 0)
        delegRenderEmptyBoard();
}
function delegTickRelativeTimes() {
    document.querySelectorAll(".time-cell[data-updated]").forEach((cell) => {
        const iso = cell.dataset.updated;
        if (iso)
            cell.textContent = timeAgo(iso);
    });
}
function delegSetupTable() {
    const body = document.getElementById("board-body");
    body.addEventListener("click", (e) => {
        const target = e.target;
        const btn = target.closest(".directions-btn");
        if (btn && btn.dataset.directionsUsername) {
            delegOpenDirectionsFor(btn.dataset.directionsUsername);
        }
    });
    document.getElementById("board-date").addEventListener("change", delegLoadBoard);
}
async function initDelegation() {
    delegSetupTable();
    delegInitLiveMap();
    await delegLoadEmployeeLocations();
    await delegLoadBoard();
    const socket = connectSocket();
    socket.on("task_created", delegUpsertRow);
    socket.on("task_updated", delegUpsertRow);
    socket.on("task_deleted", (payload) => delegRemoveRow(payload.id));
    socket.on("employee_location_updated", (emp) => delegUpsertEmployeeMarker(emp));
    setInterval(delegTickRelativeTimes, 30000);
    window.addEventListener("langchange", () => {
        delegLoadBoard();
        Object.values(delegEmployeesState).forEach((emp) => delegUpsertEmployeeMarker(emp));
    });
}
initDelegation();
