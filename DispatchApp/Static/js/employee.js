"use strict";
let myLocations = [];
const cardsById = {};
let currentPos = null;
const taskMaps = {};
function locByName(name) {
    return myLocations.find((l) => l.name === name);
}
function nextActionFor(status) {
    if (status === "assigned")
        return { next: "en_route", labelKey: "mark_en_route" };
    if (status === "en_route")
        return { next: "done", labelKey: "mark_done" };
    return null;
}
function buildCard(task) {
    const card = document.createElement("div");
    card.className = "task-card";
    card.dataset.id = String(task.id);
    fillCard(card, task);
    return card;
}
function destroyCardMap(taskId) {
    const entry = taskMaps[taskId];
    if (entry) {
        entry.map.remove();
        delete taskMaps[taskId];
    }
}
function fillCard(card, task) {
    card.dataset.status = task.status;
    const action = nextActionFor(task.status);
    card.innerHTML = `
    <div class="task-card__top">
      <div>
        <span class="task-card__label">${t("pickup_label")}${task.task_time ? ` · ${escapeHtmlE(task.task_time)}` : ""}</span>
        <p class="task-card__person">${escapeHtmlE(task.person_name)}</p>
      </div>
      <span class="status-tag status-${task.status}">${statusLabel(task.status)}</span>
    </div>

    <div class="task-card__route">
      <div class="pt"><span class="loc-label">${t("from_label")}</span>${escapeHtmlE(task.from_location)}</div>
      <span class="arrow">→</span>
      <div class="pt"><span class="loc-label">${t("to_label")}</span>${escapeHtmlE(task.to_location)}</div>
    </div>

    <div class="task-card__map" id="task-map-${task.id}"></div>
    <div class="task-card__distance" id="task-distance-${task.id}" style="display:none;"></div>
    <div class="task-card__map-note" id="task-map-note-${task.id}"></div>

    ${task.notes ? `<div class="task-card__meta">${t("note_prefix")} ${escapeHtmlE(task.notes)}</div>` : ""}

    <div class="task-card__actions">
      <a class="map-link" href="#" data-task-id="${task.id}" data-to-name="${escapeHtmlE(task.to_location)}" target="_blank" rel="noopener">${t("open_route_maps")}</a>
      ${action
        ? `<button class="btn-primary" style="width:auto;padding:8px 14px;" data-next="${action.next}" data-id="${task.id}">${t(action.labelKey)}</button>`
        : ""}
    </div>
    <div class="task-card__meta" data-updated="${task.updated_at}">${t("last_updated_prefix")} ${timeAgo(task.updated_at)}</div>
  `;
    destroyCardMap(task.id);
    initCardMap(card, task);
}
function youDivIcon() {
    return L.divIcon({
        className: "",
        html: `<div class="you-marker"><div class="you-marker__pulse"></div></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });
}
function destDivIcon() {
    return L.divIcon({
        className: "",
        html: `<div class="map-marker-icon loc"><span>📍</span></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
        popupAnchor: [0, -24],
    });
}
function initCardMap(card, task) {
    const container = card.querySelector(`#task-map-${task.id}`);
    const note = card.querySelector(`#task-map-note-${task.id}`);
    const distanceEl = card.querySelector(`#task-distance-${task.id}`);
    if (!container)
        return;
    const toLoc = locByName(task.to_location);
    if (!toLoc) {
        container.style.display = "none";
        if (note)
            note.textContent = "";
        return;
    }
    const map = L.map(container, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
    }).setView([toLoc.lat, toLoc.lng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    const destMarker = L.marker([toLoc.lat, toLoc.lng], { icon: destDivIcon() }).addTo(map);
    destMarker.bindPopup(`<p class="popup-title">${escapeHtmlE(task.to_location)}</p>`);
    const entry = {
        map,
        destMarker,
        youMarker: null,
        line: null,
        toLat: toLoc.lat,
        toLng: toLoc.lng,
        noteEl: note,
        distanceEl,
    };
    taskMaps[task.id] = entry;
    requestAnimationFrame(() => map.invalidateSize());
    if (currentPos) {
        placeYouMarker(task.id, currentPos.lat, currentPos.lng, true);
    }
    else {
        map.setView([toLoc.lat, toLoc.lng], 13);
        if (note)
            note.textContent = t("waiting_location_note");
    }
}
function placeYouMarker(taskId, lat, lng, fitBounds) {
    const entry = taskMaps[taskId];
    if (!entry)
        return;
    if (entry.youMarker) {
        entry.youMarker.setLatLng([lat, lng]);
    }
    else {
        entry.youMarker = L.marker([lat, lng], { icon: youDivIcon() }).addTo(entry.map);
        entry.youMarker.bindPopup(t("you_are_here"));
    }
    if (entry.line) {
        entry.line.setLatLngs([
            [lat, lng],
            [entry.toLat, entry.toLng],
        ]);
    }
    else {
        entry.line = L.polyline([
            [lat, lng],
            [entry.toLat, entry.toLng],
        ], { color: "#f2b705", weight: 2, dashArray: "5,7", opacity: 0.8 }).addTo(entry.map);
    }
    if (fitBounds) {
        entry.map.fitBounds(entry.line.getBounds(), { padding: [28, 28] });
    }
    if (entry.noteEl)
        entry.noteEl.textContent = "";
    if (entry.distanceEl) {
        const km = haversineKm(lat, lng, entry.toLat, entry.toLng);
        entry.distanceEl.textContent = t("distance_to_destination", { n: km < 10 ? km.toFixed(1) : Math.round(km) });
        entry.distanceEl.style.display = "inline-block";
    }
}
function updateAllCardMapsWithPosition(lat, lng) {
    Object.keys(taskMaps).forEach((idStr) => {
        const id = Number(idStr);
        const firstFix = !taskMaps[id].youMarker;
        placeYouMarker(id, lat, lng, firstFix);
    });
}
function escapeHtmlE(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}
function renderEmpty() {
    const stack = document.getElementById("card-stack");
    stack.innerHTML = `<div class="empty-state">${t("empty_tasks")}</div>`;
}
async function loadMyTasks() {
    const stack = document.getElementById("card-stack");
    const tasks = await fetchJSON(`/api/tasks?date=${todayISO()}`);
    Object.keys(cardsById).forEach((k) => delete cardsById[+k]);
    Object.keys(taskMaps).forEach((k) => destroyCardMap(Number(k)));
    if (tasks.length === 0) {
        renderEmpty();
        return;
    }
    stack.innerHTML = "";
    tasks.forEach((t) => {
        const card = buildCard(t);
        stack.appendChild(card);
        cardsById[t.id] = card;
    });
}
function handleCreated(task) {
    if (task.employee_username !== APP_USER.username || task.task_date !== todayISO())
        return;
    const stack = document.getElementById("card-stack");
    if (stack.querySelector(".empty-state"))
        stack.innerHTML = "";
    const card = buildCard(task);
    stack.prepend(card);
    cardsById[task.id] = card;
}
function handleUpdated(task) {
    if (task.employee_username !== APP_USER.username || task.task_date !== todayISO())
        return;
    const card = cardsById[task.id];
    if (!card) {
        handleCreated(task);
        return;
    }
    fillCard(card, task);
}
function handleDeleted(payload) {
    if (payload.employee_username !== APP_USER.username)
        return;
    destroyCardMap(payload.id);
    const card = cardsById[payload.id];
    if (card) {
        card.remove();
        delete cardsById[payload.id];
    }
    const stack = document.getElementById("card-stack");
    if (stack.children.length === 0)
        renderEmpty();
}
function setupActions() {
    const stack = document.getElementById("card-stack");
    stack.addEventListener("click", async (e) => {
        const target = e.target;
        const mapLink = target.closest(".map-link");
        if (mapLink) {
            e.preventDefault();
            const taskId = Number(mapLink.dataset.taskId);
            openRouteInMaps(taskId, mapLink.dataset.toName || "");
            return;
        }
        if (target.tagName !== "BUTTON" || !target.dataset.next)
            return;
        const id = Number(target.dataset.id);
        const next = target.dataset.next;
        target.setAttribute("disabled", "true");
        try {
            await fetchJSON(`/api/tasks/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: next }),
            });
        }
        catch (err) {
            alert(err.message || t("could_not_update_task"));
            target.removeAttribute("disabled");
        }
    });
}
function openRouteInMaps(taskId, toName) {
    const entry = taskMaps[taskId];
    const dest = entry ? { lat: entry.toLat, lng: entry.toLng } : undefined;
    const origin = currentPos || undefined;
    window.open(googleMapsUrl(origin, dest, toName), "_blank", "noopener");
}
function tickTimes() {
    document.querySelectorAll(".task-card__meta[data-updated]").forEach((el) => {
        const iso = el.dataset.updated;
        if (iso)
            el.textContent = t("last_updated_prefix") + " " + timeAgo(iso);
    });
}
function setDateHeading() {
    const heading = document.getElementById("date-heading");
    const today = new Date();
    heading.textContent = today.toLocaleDateString(localeTag(), {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
}
let lastLocationSentAt = 0;
const LOCATION_SEND_INTERVAL_MS = 20000;
const LOCATION_DISMISS_KEY = "dispatch_location_prompt_dismissed";
function showLocationBanner(text, showButton) {
    const banner = document.getElementById("location-banner");
    const textEl = document.getElementById("location-banner-text");
    const btn = document.getElementById("location-banner-btn");
    textEl.textContent = text;
    btn.style.display = showButton ? "" : "none";
    banner.style.display = "flex";
}
function hideLocationBanner() {
    document.getElementById("location-banner").style.display = "none";
}
function sendMyLocation(lat, lng, force = false) {
    const now = Date.now();
    if (!force && now - lastLocationSentAt < LOCATION_SEND_INTERVAL_MS)
        return;
    lastLocationSentAt = now;
    fetchJSON("/api/my-location", {
        method: "POST",
        body: JSON.stringify({ lat, lng }),
    }).catch(() => {
    });
}
function startLocationTracking() {
    if (!("geolocation" in navigator)) {
        showLocationBanner(t("location_banner_unsupported"), false);
        return;
    }
    navigator.geolocation.watchPosition((pos) => {
        hideLocationBanner();
        currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        updateAllCardMapsWithPosition(currentPos.lat, currentPos.lng);
        sendMyLocation(currentPos.lat, currentPos.lng, lastLocationSentAt === 0);
    }, () => {
        showLocationBanner(t("location_banner_denied"), true);
    }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 });
}
function showLocationModal() {
    document.getElementById("location-modal").classList.add("is-open");
}
function hideLocationModal() {
    document.getElementById("location-modal").classList.remove("is-open");
}
function markPromptDismissed() {
    try {
        sessionStorage.setItem(LOCATION_DISMISS_KEY, "1");
    }
    catch (_) {
    }
}
function promptAlreadyDismissed() {
    try {
        return sessionStorage.getItem(LOCATION_DISMISS_KEY) === "1";
    }
    catch (_) {
        return false;
    }
}
function setupLocationModal() {
    const activateBtn = document.getElementById("location-modal-activate");
    const laterBtn = document.getElementById("location-modal-later");
    activateBtn.addEventListener("click", () => {
        hideLocationModal();
        startLocationTracking();
    });
    laterBtn.addEventListener("click", () => {
        hideLocationModal();
        markPromptDismissed();
        showLocationBanner(t("location_banner_text"), true);
    });
}
function setupLocationSharing() {
    const btn = document.getElementById("location-banner-btn");
    btn.addEventListener("click", () => {
        hideLocationModal();
        startLocationTracking();
    });
    if (!("geolocation" in navigator)) {
        showLocationBanner(t("location_banner_unsupported"), false);
        return;
    }
    if ("permissions" in navigator) {
        navigator.permissions
            .query({ name: "geolocation" })
            .then((status) => {
            if (status.state === "granted") {
                startLocationTracking();
            }
            else if (status.state === "denied") {
                showLocationBanner(t("location_banner_denied"), true);
            }
            else if (!promptAlreadyDismissed()) {
                showLocationModal();
            }
            else {
                showLocationBanner(t("location_banner_text"), true);
            }
        })
            .catch(() => {
            if (!promptAlreadyDismissed())
                showLocationModal();
            else
                showLocationBanner(t("location_banner_text"), true);
        });
    }
    else if (!promptAlreadyDismissed()) {
        showLocationModal();
    }
    else {
        showLocationBanner(t("location_banner_text"), true);
    }
}
async function initEmployee() {
    setDateHeading();
    setupActions();
    setupLocationModal();
    setupLocationSharing();
    myLocations = await fetchJSON("/api/locations");
    await loadMyTasks();
    const socket = connectSocket();
    socket.on("task_created", handleCreated);
    socket.on("task_updated", handleUpdated);
    socket.on("task_deleted", handleDeleted);
    socket.on("locations_changed", (loc) => {
        if (!myLocations.find((l) => l.id === loc.id))
            myLocations.push(loc);
    });
    setInterval(tickTimes, 30000);
    window.addEventListener("langchange", () => {
        setDateHeading();
        loadMyTasks();
    });
}
initEmployee();
