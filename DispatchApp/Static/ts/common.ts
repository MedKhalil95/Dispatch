// Shared across manager.ts and employee.ts. Compiled to static/js/common.js.

interface AppUser {
  username: string;
  role: "manager" | "employee";
  display_name: string;
}

interface LocationRecord {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

type TaskStatus = "assigned" | "en_route" | "done" | "cancelled";

interface TaskRecord {
  id: number;
  employee_username: string;
  employee_name: string;
  employee_phone: string;
  person_name: string;
  from_location: string;
  to_location: string;
  status: TaskStatus;
  notes: string;
  task_date: string;
  task_time: string;
  created_at: string;
  updated_at: string;
}

interface EmployeeLocationRecord {
  username: string;
  display_name: string;
  phone: string;
  lat: number;
  lng: number;
  updated_at: string | null;
  online: boolean;
}

declare const io: (opts?: any) => any;

const APP_USER: AppUser = (window as any).APP_USER;

function statusLabel(status: TaskStatus): string {
  return t(`status_${status}`);
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return t("time_just_now");
  if (seconds < 60) return t("time_seconds_ago", { n: seconds });
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("time_minutes_ago", { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("time_hours_ago", { n: hours });
  return formatClock(iso) + " · " + new Date(iso).toLocaleDateString(localeTag());
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && body.error) message = body.error;
    } catch (_) { /* ignore */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

function googleMapsUrl(
  origin: { lat: number; lng: number } | undefined,
  destination: { lat: number; lng: number } | undefined,
  destName?: string
): string {
  let destParam = "";
  if (destination) {
    destParam = `${destination.lat},${destination.lng}`;
  } else if (destName) {
    // No coordinates on hand for some reason — let Google Maps geocode
    // the place name itself rather than showing no destination at all.
    destParam = encodeURIComponent(destName);
  }
  if (!destParam) return "https://www.google.com/maps";

  // Destination alone is enough — Google Maps falls back to the device's
  // current location as the starting point automatically. Origin is only
  // an enhancement for when we already have a fresher GPS fix than
  // whatever Maps itself would use.
  if (origin) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destParam}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destParam}&travelmode=driving`;
}

function connectSocket(): any {
  const socket = io({ transports: ["websocket", "polling"] });
  const pill = document.getElementById("live-pill");
  const text = document.getElementById("live-text");

  socket.on("connect", () => {
    pill?.classList.add("is-connected");
    if (text) text.textContent = t("live");
  });
  socket.on("disconnect", () => {
    pill?.classList.remove("is-connected");
    if (text) text.textContent = t("reconnecting");
  });
  return socket;
}

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
