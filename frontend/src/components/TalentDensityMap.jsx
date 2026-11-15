import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import { Compass, Flame, Layers, MapPin, Navigation, Shield, Users, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const INDIA_CENTER = [20.5937, 78.9629];

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

const esc = (s) =>
  String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export default function TalentDensityMap({
  cityMeta = null,
  subHubs = [],
  heatmapPoints = [],
  densityMetrics = null,
  domainMeta = null,
  onSelectHub = null,
  onPostJobInHub = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Dedicated Layer Groups
  const geofenceGroupRef = useRef(null);
  const clustersGroupRef = useRef(null);
  const heatLayerRef = useRef(null);

  // Layer toggles
  const [showHeat, setShowHeat] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [showGeofence, setShowGeofence] = useState(true);
  const [tileMode, setTileMode] = useState("osm");

  // Initialize Map
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

    geofenceGroupRef.current = L.layerGroup().addTo(m);
    clustersGroupRef.current = L.layerGroup().addTo(m);

    mapRef.current = m;

    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, []);

  // Tile provider toggle
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    const provider = TILE_PROVIDERS[tileMode] || TILE_PROVIDERS.osm;
    tileLayerRef.current.setUrl(provider.url);
  }, [tileMode]);

  // Center map when city changes
  useEffect(() => {
    if (!mapRef.current || !cityMeta?.center) return;
    const zoom = cityMeta.name.includes("All Hubs") ? 5 : 11;
    mapRef.current.flyTo([cityMeta.center.lat, cityMeta.center.lng], zoom, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [cityMeta]);

  // Render Geofence Isochrone Rings around city center
  useEffect(() => {
    const group = geofenceGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showGeofence || !cityMeta?.center?.lat || cityMeta.name.includes("All Hubs")) return;

    const center = [cityMeta.center.lat, cityMeta.center.lng];

    // 35 km Metro Commute Ring
    const ring35 = L.circle(center, {
      radius: 35000,
      color: "#0d9488",
      weight: 2,
      dashArray: "5, 6",
      fillColor: "#14b8a6",
      fillOpacity: 0.08,
    });
    ring35.bindTooltip("<b>Metro Commute Geofence</b><br/>≤ 35 km radius (~30-55 mins)", { sticky: true });
    ring35.addTo(group);

    // 85 km Hybrid Catchment Ring
    const ring85 = L.circle(center, {
      radius: 85000,
      color: "#6366f1",
      weight: 1.5,
      dashArray: "4, 8",
      fillColor: "#818cf8",
      fillOpacity: 0.04,
    });
    ring85.bindTooltip("<b>Suburban & Satellite Ring</b><br/>≤ 85 km radius (1-2 days/week sync)", { sticky: true });
    ring85.addTo(group);
  }, [showGeofence, cityMeta]);

  // Render Sub-hub Talent Density Clusters
  useEffect(() => {
    const group = clustersGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showClusters || !subHubs?.length) return;

    subHubs.forEach((hub) => {
      const isNationwide = cityMeta?.name?.includes("All Hubs");
      const countLabel = hub.candidate_count >= 1000
        ? `${(hub.candidate_count / 1000).toFixed(1)}k`
        : `${hub.candidate_count}`;

      // Custom styled HTML marker badge
      const icon = L.divIcon({
        className: "custom-talent-cluster-marker",
        html: `
          <div style="
            background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
            color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 9999px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 800;
            box-shadow: 0 4px 14px rgba(13, 148, 136, 0.45);
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            white-space: nowrap;
            transform: translate(-50%, -50%);
          ">
            <span style="display:inline-block; width: 7px; height: 7px; border-radius: 9999px; background: #34d399; animation: pulse 2s infinite;"></span>
            <span>${esc(countLabel)} Candidates</span>
            <span style="background: rgba(255,255,255,0.25); border-radius: 9999px; padding: 1px 5px; font-size: 10px;">★ ${hub.avg_benchmark_score}</span>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([hub.lat, hub.lng], { icon });

      // Rich interactive popup with corridor stats and 1-click Post Job button
      const skillsHtml = (hub.top_skills || [])
        .map((s) => `<span style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-size: 10px; color: #334155; margin-right: 4px; display: inline-block;">${esc(s)}</span>`)
        .join("");

      const popupContent = document.createElement("div");
      popupContent.style.minWidth = "230px";
      popupContent.style.padding = "4px";
      popupContent.innerHTML = `
        <div style="font-family: inherit;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="font-size: 13px; color: #0f172a;">${esc(hub.name)}</strong>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            <strong>${esc(hub.corridor || "Tech Corridor")}</strong>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; background: #f8fafc; padding: 6px 8px; border-radius: 6px;">
            <div>
              <div style="font-size: 10px; color: #64748b;">Candidates:</div>
              <div style="font-size: 13px; font-weight: 800; color: #0d9488;">${hub.candidate_count}</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #64748b;">Avg Benchmark:</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${hub.avg_benchmark_score} / 5.0</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #64748b;">Verified Proofs:</div>
              <div style="font-size: 12px; font-weight: 700; color: #10b981;">${hub.verified_pct}%</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #64748b;">Distance:</div>
              <div style="font-size: 12px; font-weight: 700; color: #6366f1;">${hub.distance_km} km</div>
            </div>
          </div>
          ${hub.transit ? `<div style="font-size: 10px; color: #475569; margin-bottom: 6px;">🚇 <strong>Transit:</strong> ${esc(hub.transit)}</div>` : ""}
          <div style="margin-bottom: 10px;">
            <div style="font-size: 10px; color: #64748b; margin-bottom: 3px;">Top Verified Skills:</div>
            <div>${skillsHtml}</div>
          </div>
          <button id="post-job-btn-${hub.geohash}" style="
            width: 100%;
            background: #0d9488;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s;
          ">
            + Post Job in ${esc(hub.name.split(" ")[0])}
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("popupopen", () => {
        const btn = popupContent.querySelector(`#post-job-btn-${hub.geohash}`);
        if (btn) {
          btn.onclick = () => {
            onPostJobInHub?.(hub);
            marker.closePopup();
          };
        }
      });

      marker.addTo(group);
    });
  }, [showClusters, subHubs, cityMeta]);

  // Render Leaflet.heat 2D Kernel Density Layer
  useEffect(() => {
    if (!mapRef.current) return;

    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!showHeat || !heatmapPoints?.length) return;

    try {
      const heat = L.heatLayer(heatmapPoints, {
        radius: 28,
        blur: 20,
        maxZoom: 14,
        max: 1.0,
        gradient: {
          0.2: "#0d9488",
          0.4: "#10b981",
          0.6: "#6366f1",
          0.8: "#f59e0b",
          1.0: "#ef4444",
        },
      });
      heat.addTo(mapRef.current);
      heatLayerRef.current = heat;
    } catch (e) {
      console.error("Heatmap layer error:", e);
    }
  }, [showHeat, heatmapPoints]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-md">
      {/* Map Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 bg-paper/60 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal/15 text-teal">
            <Users size={15} />
          </div>
          <span className="font-display text-xs font-bold text-ink">
            {domainMeta?.title || "Candidate"} Spatial Density Radar
          </span>
          <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold text-teal">
            {densityMetrics?.total_in_radius?.toLocaleString() || 0} in Catchment
          </span>
        </div>

        {/* GIS Layer Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setShowHeat(!showHeat)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
              showHeat ? "bg-teal/15 text-teal border border-teal/30" : "bg-paper text-muted border border-line"
            }`}
          >
            <Flame size={13} />
            <span>KDE Heatmap</span>
          </button>

          <button
            type="button"
            onClick={() => setShowClusters(!showClusters)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
              showClusters ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30" : "bg-paper text-muted border border-line"
            }`}
          >
            <Users size={13} />
            <span>Talent Clusters ({subHubs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGeofence(!showGeofence)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
              showGeofence ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-paper text-muted border border-line"
            }`}
          >
            <Shield size={13} />
            <span>Commute Rings</span>
          </button>

          {/* Basemap Switcher */}
          <button
            type="button"
            onClick={() => setTileMode(tileMode === "osm" ? "esri" : "osm")}
            className="flex items-center gap-1 rounded-lg border border-line bg-paper px-2 py-1 text-[11px] font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
            title="Toggle between OpenStreetMap and Esri World Map"
          >
            <Layers size={12} />
            <span>{TILE_PROVIDERS[tileMode]?.name || "Map"}</span>
          </button>
        </div>
      </div>

      {/* Leaflet Map DOM Container */}
      <div ref={containerRef} className="h-[460px] w-full bg-[#0b0f19]" />

      {/* Map Bottom Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-3 rounded-2xl border border-line/60 bg-surface/90 px-3.5 py-2 text-[11px] font-medium text-ink shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-teal" />
          <span>Talent Clusters</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border border-emerald-400" />
          <span>≤ 35km Metro Ring</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 border border-indigo-400" />
          <span>≤ 85km Satellite Ring</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-10 rounded-full bg-gradient-to-r from-teal via-indigo-500 to-red-500" />
          <span>Candidate Density</span>
        </div>
      </div>
    </div>
  );
}
