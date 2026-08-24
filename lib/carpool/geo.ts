// Distance, bearing, ETA and slippy-map tile math.
// No dependencies: everything here is arithmetic on lat/lng pairs.

export type LatLng = { lat: number; lng: number };

const R_EARTH_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Compass bearing from a to b, in degrees clockwise from north. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Seconds until the driver reaches a stop.
 *
 * Straight-line distance over a speed estimate, then a detour factor because
 * cars follow streets, not great circles. It is a rough number and the UI says
 * so — the point is "start getting your coat on", not turn-by-turn navigation.
 *
 * speedMps is the phone's reported speed when it has one; we fall back to a
 * residential-street default and clamp hard, because a GPS fix at a red light
 * reports 0 m/s and would otherwise predict an infinite ETA.
 */
const DETOUR_FACTOR = 1.35;
const DEFAULT_SPEED_MPS = 8.9; // ~20 mph on neighbourhood streets
const MIN_SPEED_MPS = 3.6; // ~8 mph — floor for stop-and-go
const MAX_SPEED_MPS = 31; // ~70 mph — ceiling for a bad fix

export function etaSeconds(
  from: LatLng,
  to: LatLng,
  speedMps?: number | null
): number {
  const metres = distanceM(from, to) * DETOUR_FACTOR;
  const raw = speedMps == null || !Number.isFinite(speedMps) ? DEFAULT_SPEED_MPS : speedMps;
  const speed = Math.min(MAX_SPEED_MPS, Math.max(MIN_SPEED_MPS, raw));
  return Math.round(metres / speed);
}

/** A speed estimate that survives red lights: recent movement, smoothed. */
export function smoothSpeed(previous: number | null, sample: number | null): number | null {
  if (sample == null || !Number.isFinite(sample) || sample < 0) return previous;
  if (previous == null) return sample;
  return previous * 0.7 + sample * 0.3;
}

export function formatEta(seconds: number): string {
  if (seconds < 45) return "under a minute";
  const mins = Math.round(seconds / 60);
  if (mins <= 1) return "about 1 minute";
  if (mins < 60) return `about ${mins} minutes`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export function formatDistance(metres: number, imperial = true): string {
  if (imperial) {
    const feet = metres * 3.28084;
    if (feet < 1000) return `${Math.round(feet / 10) * 10} ft`;
    return `${(metres / 1609.34).toFixed(feet < 5280 ? 1 : 0)} mi`;
  }
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "12s ago" / "4m ago" — how stale a position fix is. */
export function formatAge(iso: string, now = Date.now()): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 15) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

/** A fix older than this is history, not "live". */
export const STALE_AFTER_MS = 90_000;

export function isLive(iso: string, now = Date.now()): boolean {
  return now - new Date(iso).getTime() < STALE_AFTER_MS;
}

// ---------- slippy-map tile math (Web Mercator) ----------

export function lngToTileX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * 2 ** zoom;
}

export function latToTileY(lat: number, zoom: number): number {
  const rad = toRad(Math.max(-85.05112878, Math.min(85.05112878, lat)));
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
}

/** Pixel position of a point inside a map of `size` px centred on `centre`. */
export function projectToPixels(
  point: LatLng,
  centre: LatLng,
  zoom: number,
  size: { width: number; height: number },
  tileSize = 256
): { x: number; y: number } {
  const scale = tileSize;
  return {
    x: (lngToTileX(point.lng, zoom) - lngToTileX(centre.lng, zoom)) * scale + size.width / 2,
    y: (latToTileY(point.lat, zoom) - latToTileY(centre.lat, zoom)) * scale + size.height / 2
  };
}

export function centreOf(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null;
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  return { lat, lng };
}

/**
 * Largest zoom where every point fits while `centre` stays in the middle.
 * Used when the map follows the driver: the car holds the centre, but the
 * house you care about still has to be on screen.
 */
export function fitZoomAround(
  centre: LatLng,
  points: LatLng[],
  size: { width: number; height: number },
  { min = 3, max = 17, padding = 80, tileSize = 256 } = {}
): number {
  if (points.length === 0) return 16;
  for (let zoom = max; zoom > min; zoom--) {
    const cx = lngToTileX(centre.lng, zoom) * tileSize;
    const cy = latToTileY(centre.lat, zoom) * tileSize;
    let dx = 0;
    let dy = 0;
    for (const p of points) {
      dx = Math.max(dx, Math.abs(lngToTileX(p.lng, zoom) * tileSize - cx));
      dy = Math.max(dy, Math.abs(latToTileY(p.lat, zoom) * tileSize - cy));
    }
    if (dx * 2 <= size.width - padding && dy * 2 <= size.height - padding) return zoom;
  }
  return min;
}

/** Largest zoom where every point still fits inside the viewport. */
export function fitZoom(
  points: LatLng[],
  size: { width: number; height: number },
  { min = 3, max = 17, padding = 64, tileSize = 256 } = {}
): number {
  if (points.length < 2) return 15;
  for (let zoom = max; zoom > min; zoom--) {
    const xs = points.map((p) => lngToTileX(p.lng, zoom) * tileSize);
    const ys = points.map((p) => latToTileY(p.lat, zoom) * tileSize);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    if (w <= size.width - padding && h <= size.height - padding) return zoom;
  }
  return min;
}
