import L from "leaflet";
import "leaflet.heat"; // must come after leaflet: it attaches L.heatLayer
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

const INDIA = [22.5, 79];
const colorFor = (score) => (score >= 70 ? "#4f33e9" : score >= 40 ? "#e08a1e" : "#6b6d8c");
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export default function JobMap({ jobs, selectedId, onSelect, showHeat, origin }) {
  const el = useRef(null);
  const map = useRef(null);
  const group = useRef(null);
  const renderer = useRef(null);
  const heat = useRef(null);
  const markers = useRef(new Map());
  const lastPanned = useRef(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Create the map once
  useEffect(() => {
    const m = L.map(el.current, { scrollWheelZoom: false }).setView(INDIA, 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    group.current = L.layerGroup().addTo(m);
    renderer.current = L.svg({ pane: "markerPane" }); // keeps dots above the heat layer
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      heat.current = null;
      markers.current.clear();
    };
  }, []);

  // Rebuild dots and heat layer when the data changes
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    group.current.clearLayers();
    markers.current.clear();

    for (const j of jobs) {
      const dot = L.circleMarker([j.lat, j.lng], {
        renderer: renderer.current,
        radius: 7,
        color: "#ffffff",
        weight: 1.5,
        fillColor: colorFor(j.score),
        fillOpacity: 0.9,
      });
      dot.bindTooltip(`${esc(j.title)} · ${esc(j.company)} · ${j.score}%`);
      dot.on("click", () => onSelectRef.current?.(j.id));
      dot.addTo(group.current);
      markers.current.set(j.id, dot);
    }

    if (origin) {
      L.circleMarker([origin.lat, origin.lng], {
        renderer: renderer.current,
        radius: 14,
        color: "#1c2040",
        weight: 2,
        fill: false,
        interactive: false,
      }).addTo(group.current);
    }

    if (heat.current) {
      m.removeLayer(heat.current);
      heat.current = null;
    }
    if (showHeat && jobs.length) {
      heat.current = L.heatLayer(
        jobs.map((j) => [j.lat, j.lng, Math.max(0.15, j.score / 100)]),
        { radius: 28, blur: 22, maxZoom: 8, minOpacity: 0.3 }
      ).addTo(m);
    }
  }, [jobs, showHeat, origin?.lat, origin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight the selected job
  useEffect(() => {
    markers.current.forEach((dot, id) => {
      const on = id === selectedId;
      dot.setRadius(on ? 11 : 7);
      dot.setStyle({ weight: on ? 3 : 1.5, color: on ? "#1c2040" : "#ffffff" });
      if (on) dot.bringToFront();
    });
    const dot = markers.current.get(selectedId);
    if (dot && lastPanned.current !== selectedId) {
      map.current.panTo(dot.getLatLng());
      dot.openTooltip();
    }
    lastPanned.current = selectedId;
  }, [selectedId, jobs, showHeat]);

  // Recentre when the preferred city changes
  useEffect(() => {
    if (!map.current) return;
    if (origin) map.current.setView([origin.lat, origin.lng], 7);
    else map.current.setView(INDIA, 5);
  }, [origin?.lat, origin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={el}
      className="h-[26rem] w-full overflow-hidden rounded-xl border border-line"
      aria-label="Map of matching jobs. The list below has the same jobs."
    />
  );
}