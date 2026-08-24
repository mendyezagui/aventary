"use client";

// A small slippy map with no map library: OpenStreetMap raster tiles laid out
// in a grid, markers positioned by Web Mercator projection. Everything the
// carpool needs (see the cars, see the houses) without shipping Leaflet.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  centreOf,
  fitZoom,
  fitZoomAround,
  latToTileY,
  lngToTileX,
  projectToPixels,
  type LatLng
} from "@/lib/carpool/geo";

const TILE_SIZE = 256;
const TILE_URL =
  process.env.NEXT_PUBLIC_CARPOOL_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  kind: "driver" | "stop" | "me" | "school";
  label: string;
  heading?: number | null;
  dimmed?: boolean;
};

export default function CarpoolMap({
  markers,
  focus,
  fit,
  height = 280
}: {
  markers: MapMarker[];
  /** Marker id to keep centred (the active driver, usually). */
  focus?: string | null;
  /** Marker ids that must stay on screen — the car and the house it's heading to. */
  fit?: string[];
  height?: number;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height });
  const [zoomAdjust, setZoomAdjust] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points: LatLng[] = useMemo(
    () => markers.map((m) => ({ lat: m.lat, lng: m.lng })),
    [markers]
  );

  // Fit to the markers that matter, falling back to everything.
  const fitPoints: LatLng[] = useMemo(() => {
    if (!fit || fit.length === 0) return points;
    const chosen = markers.filter((m) => fit.includes(m.id));
    return chosen.length > 0 ? chosen.map((m) => ({ lat: m.lat, lng: m.lng })) : points;
  }, [fit, markers, points]);

  const focused = focus ? markers.find((m) => m.id === focus) : undefined;
  const centre = useMemo(
    () => (focused ? { lat: focused.lat, lng: focused.lng } : centreOf(points)) ?? null,
    [focused, points]
  );

  const zoom = useMemo(() => {
    if (!centre || size.width === 0) return 15;
    const base = focused
      ? fitZoomAround(centre, fitPoints, size)
      : fitZoom(fitPoints, size);
    return Math.max(3, Math.min(18, base + zoomAdjust));
  }, [centre, focused, fitPoints, size, zoomAdjust]);

  const tiles = useMemo(() => {
    if (!centre || size.width === 0) return [];
    const centreX = lngToTileX(centre.lng, zoom);
    const centreY = latToTileY(centre.lat, zoom);
    const cols = Math.ceil(size.width / TILE_SIZE) + 2;
    const rows = Math.ceil(size.height / TILE_SIZE) + 2;
    const startX = Math.floor(centreX - cols / 2);
    const startY = Math.floor(centreY - rows / 2);
    const max = 2 ** zoom;
    const out: { key: string; url: string; left: number; top: number }[] = [];

    for (let dx = 0; dx <= cols; dx++) {
      for (let dy = 0; dy <= rows; dy++) {
        const x = startX + dx;
        const y = startY + dy;
        if (y < 0 || y >= max) continue;
        const wrappedX = ((x % max) + max) % max;
        out.push({
          key: `${zoom}/${x}/${y}`,
          url: TILE_URL.replace("{z}", String(zoom))
            .replace("{x}", String(wrappedX))
            .replace("{y}", String(y)),
          left: (x - centreX) * TILE_SIZE + size.width / 2,
          top: (y - centreY) * TILE_SIZE + size.height / 2
        });
      }
    }
    return out;
  }, [centre, size, zoom]);

  if (!centre) {
    return (
      <div className="cp-map cp-map-empty" style={{ height }} ref={boxRef}>
        <p>No locations yet. Set your stop, or start driving to appear here.</p>
      </div>
    );
  }

  return (
    <div className="cp-map" style={{ height }} ref={boxRef}>
      <div className="cp-map-tiles">
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={t.key}
            src={t.url}
            alt=""
            width={TILE_SIZE}
            height={TILE_SIZE}
            loading="lazy"
            style={{ left: t.left, top: t.top }}
          />
        ))}
      </div>

      {markers.map((m) => {
        const { x, y } = projectToPixels({ lat: m.lat, lng: m.lng }, centre, zoom, size, TILE_SIZE);
        if (x < -40 || y < -40 || x > size.width + 40 || y > size.height + 40) return null;
        return (
          <div
            key={m.id}
            className={`cp-pin cp-pin-${m.kind}${m.dimmed ? " cp-pin-dim" : ""}`}
            style={{ left: x, top: y }}
            title={m.label}
          >
            <span className="cp-pin-dot" aria-hidden="true">
              {m.kind === "driver" ? "🚗" : m.kind === "school" ? "🏫" : m.kind === "me" ? "📍" : "🏠"}
            </span>
            <span className="cp-pin-label">{m.label}</span>
          </div>
        );
      })}

      <div className="cp-map-zoom">
        <button type="button" onClick={() => setZoomAdjust((z) => Math.min(3, z + 1))} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => setZoomAdjust((z) => Math.max(-4, z - 1))} aria-label="Zoom out">
          −
        </button>
      </div>

      <a
        className="cp-map-credit"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer noopener"
      >
        © OpenStreetMap
      </a>
    </div>
  );
}
