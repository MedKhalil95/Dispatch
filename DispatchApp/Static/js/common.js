"use strict";
const APP_USER = window.APP_USER;
function statusLabel(status) {
    return t(`status_${status}`);
}
function formatClock(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit" });
}
function timeAgo(iso) {
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 5)
        return t("time_just_now");
    if (seconds < 60)
        return t("time_seconds_ago", { n: seconds });
    const minutes = Math.round(seconds / 60);
    if (minutes < 60)
        return t("time_minutes_ago", { n: minutes });
    const hours = Math.round(minutes / 60);
    if (hours < 24)
        return t("time_hours_ago", { n: hours });
    return formatClock(iso) + " · " + new Date(iso).toLocaleDateString(localeTag());
}
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
async function fetchJSON(url, options = {}) {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
            const body = await res.json();
            if (body && body.error)
                message = body.error;
        }
        catch (_) { }
        throw new Error(message);
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
function googleMapsUrl(origin, destination, destName) {
    let destParam = "";
    if (destination) {
        destParam = `${destination.lat},${destination.lng}`;
    }
    else if (destName) {
        destParam = encodeURIComponent(destName);
    }
    if (!destParam)
        return "https://www.google.com/maps";
    if (origin) {
        return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destParam}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${destParam}&travelmode=driving`;
}
function connectSocket() {
    const socket = io({ transports: ["websocket", "polling"] });
    const pill = document.getElementById("live-pill");
    const text = document.getElementById("live-text");
    socket.on("connect", () => {
        pill === null || pill === void 0 ? void 0 : pill.classList.add("is-connected");
        if (text)
            text.textContent = t("live");
    });
    socket.on("disconnect", () => {
        pill === null || pill === void 0 ? void 0 : pill.classList.remove("is-connected");
        if (text)
            text.textContent = t("reconnecting");
    });
    return socket;
}
function todayISO() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
