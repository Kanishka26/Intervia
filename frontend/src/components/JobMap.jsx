import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import { Compass, Flame, Layers, MapPin, Navigation, Shield, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const INDIA_CENTER = [22.5, 79];

// Standalone Tech Corridor definitions (built-in GIS knowledge base)
export const FALLBACK_TECH_CORRIDORS = [
  {
    id: "blr-belt",
    name: "Bengaluru Silicon Corridor",
    region: "Karnataka",
    center: { lat: 12.9716, lng: 77.5946 },
    radius_km: 65,
    hubs: ["Outer Ring Road", "Whitefield", "Electronic City", "Koramangala", "Indiranagar"],
  },
  {
    id: "hyd-cyberabad",
    name: "Hyderabad HITEC & Cyberabad",
    region: "Telangana",
    center: { lat: 17.4483, lng: 78.3915 },
    radius_km: 55,
    hubs: ["HITEC City", "Gachibowli", "Madhapur", "Financial District"],
  },
  {
    id: "ncr-mega",
    name: "NCR Megacity Tech Belt",
    region: "Delhi-NCR",
    center: { lat: 28.5355, lng: 77.25 },
    radius_km: 75,
    hubs: ["Gurugram Cyber City", "Noida Sectors", "South Delhi", "Aerocity"],
  },
  {
    id: "pune-mumbai",
    name: "Pune-Mumbai Expressway Corridor",
    region: "Maharashtra",
    center: { lat: 18.65, lng: 73.76 },
    radius_km: 95,
    hubs: ["Hinjawadi", "Baner", "Kharadi", "Navi Mumbai Knowledge Park"],
  },
  {
    id: "chennai-omr",
    name: "Chennai OMR IT Corridor",
    region: "Tamil Nadu",
    center: { lat: 12.9165, lng: 80.2285 },
    radius_km: 50,
    hubs: ["Taramani", "Perungudi", "Sholinganallur", "Siruseri SIPCOT"],
  },
];

// 100% Free Open Basemap Tile Providers (zero API keys required)
const TILE_PROVIDERS = {
  osm: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    name: "OpenStreetMap",
  },
  esri: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attr: "Tiles &copy; Esri &mdash; Open GIS World Street Map",
    name: "Esri GIS World",
  },
};

const colorForScore = (score) => {
  if (score >= 80) return "#10b981"; // Emerald
  if (score >= 60) return "#6366f1"; // Indigo
  if (score >= 40) return "#f59e0b"; // Amber
  return "#94a3b8"; // Slate
};

const esc = (s) =>
  String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export default function JobMap({
  jobs = [],
  selectedId = null,
  onSelect = null,
  origin = null,
  gisMeta = null,
  onSelectCity = null,
  onCustomOrigin = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Dedicated Layer Groups
  const jobsGroupRef = useRef(null);
  const geofenceGroupRef = useRef(null);
  const corridorGroupRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const trajectoryGroupRef = useRef(null);
  const heatLayerRef = useRef(null);

  const markersRef = useRef(new Map());
  const onSelectRef = useRef(onSelect);

  // Active Hub coordinate (user-selected city, or clicked point, or default Bengaluru)
  const [clickedOrigin, setClickedOrigin] = useState(null);

  // GIS Layer Toggles - all active by default for immediate visual feedback
  const [showGeofence, setShowGeofence] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [showHeat, setShowHeat] = useState(false);
  const [tileMode, setTileMode] = useState("osm"); // Default to 100% free OSM

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Determine active origin: either explicit origin, user-clicked point, or default to Bengaluru
  const activeHub = useMemo(() => {
    if (clickedOrigin) return clickedOrigin;
    if (origin?.lat && origin?.lng) return origin;
    // Default to Bengaluru hub if nationwide
    return {
      lat: 12.9716,
      lng: 77.5946,
      city: "Bengaluru",
      name: "Bengaluru",
      geohash: "tdr1v9",
      isDefault: true,
    };
  }, [origin, clickedOrigin]);

  // Compute spatial clusters from jobs (fallback if backend doesn't supply clusters)
  const activeClusters = useMemo(() => {
    if (gisMeta?.clusters && gisMeta.clusters.length > 0) {
      return gisMeta.clusters;
    }
    const groups = {};
    for (const j of jobs) {
      const c = j.city || "Other";
      if (!groups[c]) {
        groups[c] = { city: c, lats: [], lngs: [], total: 0, live: 0, scores: [] };
      }
      if (j.lat != null && j.lng != null) {
        groups[c].lats.push(j.lat);
        groups[c].lngs.push(j.lng);
      }
      groups[c].total += 1;
      if (j.is_live) groups[c].live += 1;
      groups[c].scores.push(j.score || 50);
    }
    return Object.values(groups)
      .filter((g) => g.lats.length > 0)
      .map((g) => ({
        city: g.city,
        lat: g.lats.reduce((a, b) => a + b, 0) / g.lats.length,
        lng: g.lngs.reduce((a, b) => a + b, 0) / g.lngs.length,
        total_jobs: g.total,
        live_jobs: g.live,
        avg_match_score: Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length),
      }));
  }, [jobs, gisMeta?.clusters]);

  const activeCorridors = gisMeta?.tech_corridors || FALLBACK_TECH_CORRIDORS;

  // 1. Initialize Leaflet Map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const m = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView(INDIA_CENTER, 5);

    tileLayerRef.current = L.tileLayer(TILE_PROVIDERS.osm.url, {
      maxZoom: 18,
      attribution: TILE_PROVIDERS.osm.attr,
    }).addTo(m);

    // Layer groups in rendering order
    geofenceGroupRef.current = L.layerGroup().addTo(m);
    corridorGroupRef.current = L.layerGroup().addTo(m);
    clusterGroupRef.current = L.layerGroup().addTo(m);
    trajectoryGroupRef.current = L.layerGroup().addTo(m);
    jobsGroupRef.current = L.layerGroup().addTo(m);

    // Allow user to click anywhere on the map to set a custom commute hub!
    m.on("click", (e) => {
      const lat = Number(e.latlng.lat.toFixed(4));
      const lng = Number(e.latlng.lng.toFixed(4));
      const customHub = {
        lat,
        lng,
        city: `Custom Hub (${lat}, ${lng})`,
        name: `Custom Hub`,
        geohash: "custom",
      };
      setClickedOrigin(customHub);
      onCustomOrigin?.(customHub);
    });

    mapRef.current = m;

    return () => {
      m.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // 2. Tile Provider switching
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    const provider = TILE_PROVIDERS[tileMode] || TILE_PROVIDERS.osm;
    tileLayerRef.current.setUrl(provider.url);
  }, [tileMode]);

  // 3. Render Geofence Isochrone Buffer Rings
  useEffect(() => {
    const group = geofenceGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showGeofence || !activeHub?.lat || !activeHub?.lng) return;

    const center = [activeHub.lat, activeHub.lng];

    // Zone 1: Metro Daily Commute (35 km)
    const ring35 = L.circle(center, {
      radius: 35000,
      color: "#0d9488",
      weight: 2.5,
      dashArray: "5, 5",
      fillColor: "#14b8a6",
      fillOpacity: 0.12,
    });
    ring35.bindTooltip("<b>Zone 1: Metro Commute Buffer</b><br/>≤ 35 km · ~30-55 mins transit", { sticky: true });
    ring35.addTo(group);

    // Zone 2: Hybrid Satellite Ring (85 km)
    const ring85 = L.circle(center, {
      radius: 85000,
      color: "#6366f1",
      weight: 2,
      dashArray: "6, 8",
      fillColor: "#818cf8",
      fillOpacity: 0.06,
    });
    ring85.bindTooltip("<b>Zone 2: Hybrid Satellite Ring</b><br/>≤ 85 km · Commuter rail / express highway (~1-1.5 hrs)", { sticky: true });
    ring85.addTo(group);

    // Zone 3: Regional Tech Corridor (280 km)
    const ring280 = L.circle(center, {
      radius: 280000,
      color: "#8b5cf6",
      weight: 1.5,
      dashArray: "4, 10",
      fillColor: "#a78bfa",
      fillOpacity: 0.03,
    });
    ring280.bindTooltip("<b>Zone 3: Regional Tech Corridor</b><br/>≤ 280 km · Interstate corridor / weekly sync", { sticky: true });
    ring280.addTo(group);

    // Candidate Hub Center Pin
    const originPin = L.circleMarker(center, {
      radius: 9,
      color: "#ffffff",
      weight: 3,
      fillColor: "#0f172a",
      fillOpacity: 1.0,
    });
    originPin.bindTooltip(`📍 <b>Active Commute Center: ${esc(activeHub.name || activeHub.city)}</b><br/>Click anywhere on map to reposition`, {
      permanent: false,
    });
    originPin.addTo(group);
  }, [showGeofence, activeHub]);

  // 4. Render Tech Corridors
  useEffect(() => {
    const group = corridorGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showCorridors) return;

    for (const corr of activeCorridors) {
      // Shaded boundary circle
      const circle = L.circle([corr.center.lat, corr.center.lng], {
        radius: corr.radius_km * 1000,
        color: "#f59e0b",
        weight: 2.5,
        dashArray: "7, 5",
        fillColor: "#fbbf24",
        fillOpacity: 0.16,
      });

      const hubsList = (corr.hubs || []).slice(0, 4).join(" · ");
      circle.bindTooltip(
        `<div class="p-1">
          <div class="font-bold text-amber-700">⚡ ${esc(corr.name)}</div>
          <div class="text-[11px] text-slate-500">${esc(corr.region)} · Radius ${corr.radius_km} km</div>
          <div class="text-[10px] mt-0.5 text-slate-400">Hubs: ${esc(hubsList)}</div>
        </div>`,
        { sticky: true }
      );
      circle.addTo(group);

      // Highly visible interactive Corridor Badge Pin
      const badgeIcon = L.divIcon({
        className: "custom-corridor-badge",
        html: `
          <div style="
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #ffffff;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 800;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.45);
            border: 2px solid #ffffff;
            white-space: nowrap;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          ">
            <span>⚡ ${esc(corr.name)}</span>
          </div>
        `,
        iconAnchor: [60, 14],
      });

      const badgeMarker = L.marker([corr.center.lat, corr.center.lng], { icon: badgeIcon });
      badgeMarker.on("click", () => {
        if (corr.hubs && corr.hubs.length > 0 && onSelectCity) {
          // If corridor has a known city hub name
          const matchCity = corr.name.includes("Bengaluru") ? "Bengaluru" :
                            corr.name.includes("Hyderabad") ? "Hyderabad" :
                            corr.name.includes("NCR") ? "Delhi" :
                            corr.name.includes("Pune") ? "Pune" :
                            corr.name.includes("Chennai") ? "Chennai" : "";
          if (matchCity) onSelectCity(matchCity);
        }
      });
      badgeMarker.addTo(group);
    }
  }, [showCorridors, activeCorridors, onSelectCity]);

  // 5. Render Hub Clusters
  useEffect(() => {
    const group = clusterGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showClusters) return;

    for (const cl of activeClusters) {
      const clusterIcon = L.divIcon({
        className: "custom-hub-cluster-badge",
        html: `
          <div style="
            background: #0f172a;
            color: #ffffff;
            padding: 3px 9px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            border: 2px solid #6366f1;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
            cursor: pointer;
          ">
            <span>📍 ${esc(cl.city)}</span>
            <span style="background: #10b981; color: #ffffff; border-radius: 9999px; padding: 1px 6px; font-size: 10px; font-weight: 800;">
              ${cl.total_jobs}
            </span>
          </div>
        `,
        iconAnchor: [45, 12],
      });

      const marker = L.marker([cl.lat, cl.lng], { icon: clusterIcon });
      marker.bindTooltip(
        `<div class="p-1 text-xs">
          <b>${esc(cl.city)} Tech Cluster</b><br/>
          <span>${cl.total_jobs} total roles (${cl.live_jobs} real live)</span><br/>
          <span class="text-emerald-600 font-semibold">Avg Match: ${cl.avg_match_score || 50}%</span>
        </div>`
      );
      marker.on("click", () => {
        onSelectCity?.(cl.city);
        if (mapRef.current) {
          mapRef.current.setView([cl.lat, cl.lng], 8, { animate: true });
        }
      });
      marker.addTo(group);
    }
  }, [showClusters, activeClusters, onSelectCity]);

  // 6. Render Job Markers
  useEffect(() => {
    const group = jobsGroupRef.current;
    if (!group) return;
    group.clearLayers();
    markersRef.current.clear();

    for (const j of jobs) {
      const isLive = Boolean(j.is_live);
      const isSelected = j.id === selectedId;
      const markerColor = colorForScore(j.score);

      const dot = L.circleMarker([j.lat, j.lng], {
        radius: isSelected ? 10 : 6.5,
        color: isSelected ? "#0f172a" : "#ffffff",
        weight: isSelected ? 3 : 1.5,
        fillColor: markerColor,
        fillOpacity: 0.95,
      });

      const distInfo = j.distance_km != null ? ` · 📍 ${j.distance_km} km` : "";
      const liveBadge = isLive ? `<span style="color:#10b981;font-weight:700;">🟢 Live</span> ` : "";

      dot.bindTooltip(
        `<div class="p-1">
          <div class="font-bold text-xs">${liveBadge}${esc(j.title)}</div>
          <div class="text-[11px] text-slate-500">${esc(j.company)} · ${esc(j.city)}${distInfo}</div>
          <div class="text-[11px] font-semibold" style="color:${markerColor}">
            Match: ${j.score}% · ${esc(j.gis_zone || "Remote")}
          </div>
        </div>`,
        { sticky: true }
      );

      dot.on("click", () => onSelectRef.current?.(j.id));
      dot.addTo(group);
      markersRef.current.set(j.id, dot);
    }
  }, [jobs, selectedId]);

  // 7. Render Trajectory Geodesic Vector Line to Selected Job
  useEffect(() => {
    const group = trajectoryGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!selectedId || !activeHub?.lat || !activeHub?.lng) return;

    const selJob = jobs.find((j) => j.id === selectedId);
    if (!selJob?.lat || !selJob?.lng) return;

    const latlngs = [
      [activeHub.lat, activeHub.lng],
      [selJob.lat, selJob.lng],
    ];

    const line = L.polyline(latlngs, {
      color: "#6366f1",
      weight: 3,
      dashArray: "6, 8",
      opacity: 0.9,
    });

    const bearingTxt = selJob.cardinal_dir ? ` (${selJob.cardinal_dir})` : "";
    const commuteTxt = selJob.est_commute_min ? ` · ~${selJob.est_commute_min} min` : "";

    line.bindTooltip(
      `<div class="text-xs font-semibold text-indigo-700 bg-white/95 px-2 py-1 rounded shadow">
        📐 Geodesic: ${selJob.distance_km != null ? `${selJob.distance_km} km` : "Direct vector"}${bearingTxt}${commuteTxt}
      </div>`,
      { permanent: true, direction: "center" }
    );
    line.addTo(group);

    if (mapRef.current) {
      mapRef.current.panTo([selJob.lat, selJob.lng], { animate: true, duration: 0.6 });
    }
  }, [selectedId, activeHub, jobs]);

  // 8. Render KDE Heatmap Layer
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    if (heatLayerRef.current) {
      m.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (showHeat && jobs.length) {
      const heatData = (gisMeta?.density_points || jobs).map((pt) => [
        pt.lat,
        pt.lng,
        Math.max(0.2, (pt.density || pt.score || 50) / 100),
      ]);

      heatLayerRef.current = L.heatLayer(heatData, {
        radius: 34,
        blur: 24,
        maxZoom: 9,
        minOpacity: 0.35,
        gradient: {
          0.2: "#3b82f6",
          0.4: "#10b981",
          0.6: "#f59e0b",
          0.8: "#ef4444",
          1.0: "#7c3aed",
        },
      }).addTo(m);
    }
  }, [showHeat, jobs, gisMeta?.density_points]);

  // 9. Recenter when origin changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (origin?.lat && origin?.lng) {
      mapRef.current.setView([origin.lat, origin.lng], 8);
    }
  }, [origin?.lat, origin?.lng]);

  return (
    <div className="relative w-full rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
      {/* Interactive GIS Control Toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-wrap items-center gap-1.5 rounded-xl border border-line/80 bg-surface/90 p-1.5 shadow-md backdrop-blur-md">
        <button
          type="button"
          onClick={() => setShowGeofence((v) => !v)}
          title="Toggle Isochrone Commute Buffer Rings"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
            showGeofence
              ? "bg-teal/15 text-teal border border-teal/40"
              : "text-muted hover:text-ink hover:bg-paper"
          }`}
        >
          <Shield size={13} />
          <span>Geofence Rings</span>
        </button>

        <button
          type="button"
          onClick={() => setShowCorridors((v) => !v)}
          title="Toggle Tech Corridors"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
            showCorridors
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40"
              : "text-muted hover:text-ink hover:bg-paper"
          }`}
        >
          <Zap size={13} />
          <span>Tech Corridors</span>
        </button>

        <button
          type="button"
          onClick={() => setShowClusters((v) => !v)}
          title="Toggle Spatial Clusters"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
            showClusters
              ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/40"
              : "text-muted hover:text-ink hover:bg-paper"
          }`}
        >
          <MapPin size={13} />
          <span>Hub Clusters</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHeat((v) => !v)}
          title="Toggle Spatial Kernel Density Heatmap"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
            showHeat
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/40"
              : "text-muted hover:text-ink hover:bg-paper"
          }`}
        >
          <Flame size={13} />
          <span>KDE Heatmap</span>
        </button>

        <div className="h-4 w-px bg-line/80 mx-0.5" />

        <button
          type="button"
          onClick={() => setTileMode((m) => (m === "osm" ? "esri" : "osm"))}
          title="Switch Basemap Style (OpenStreetMap / Esri GIS)"
          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:text-ink hover:bg-paper transition-all"
        >
          <Layers size={13} />
          <span className="capitalize">{tileMode === "osm" ? "OSM" : "Esri GIS"}</span>
        </button>
      </div>

      {/* GIS Status Pill (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] hidden sm:flex items-center gap-2 rounded-lg border border-line/70 bg-surface/90 px-3 py-1.5 text-[11px] font-medium text-muted shadow-sm backdrop-blur-md">
        <Navigation size={12} className="text-teal" />
        <span>
          Commute Center: <strong className="text-ink">{activeHub.name || activeHub.city}</strong>
          <span className="text-slate-400 ml-1.5">(Click anywhere on map to reposition buffer rings)</span>
        </span>
      </div>

      {/* Map DOM Element */}
      <div
        ref={containerRef}
        className="h-[30rem] w-full"
        aria-label="GIS Spatial Intelligence Map"
      />
    </div>
  );
}
