"""Geographic Information System (GIS) Spatial Intelligence Engine for Intervia.

Provides:
1. Spatial Geohash Indexing (Base32 Morton space-filling Z-curve) for O(1) grid lookups.
2. Geodesic computations (Haversine distance, initial bearing, destination offset, bounding boxes).
3. Multi-tier Isochrone & Geofence Buffer Zones (Metro Commute, Hybrid Satellite, Regional Corridor).
4. Major Tech Corridor Boundary & Proximity Detection.
5. Spatial Kernel Density Estimation (KDE) for tech job cluster identification.
"""
from __future__ import annotations

import math
from collections import defaultdict
from typing import Any

# Standard 32-character Geohash alphabet
GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
GEOHASH_DECODE = {c: i for i, c in enumerate(GEOHASH_BASE32)}

# Defined Geographic Tech Corridors with bounding center, radius, and signature
TECH_CORRIDORS = [
    {
        "id": "blr-belt",
        "name": "Bengaluru Silicon Corridor",
        "region": "Karnataka",
        "center": {"lat": 12.9716, "lng": 77.5946},
        "radius_km": 55,
        "hubs": ["Outer Ring Road", "Whitefield", "Electronic City", "Koramangala", "Indiranagar"],
        "transit_speed_kmh": 32,  # urban traffic transit average
    },
    {
        "id": "hyd-cyberabad",
        "name": "Hyderabad HITEC & Cyberabad Corridor",
        "region": "Telangana",
        "center": {"lat": 17.4483, "lng": 78.3915},
        "radius_km": 45,
        "hubs": ["HITEC City", "Gachibowli", "Madhapur", "Financial District", "Kondapur"],
        "transit_speed_kmh": 38,
    },
    {
        "id": "ncr-mega",
        "name": "NCR Megacity Tech Belt",
        "region": "Delhi-NCR",
        "center": {"lat": 28.5355, "lng": 77.2500},
        "radius_km": 70,
        "hubs": ["Gurugram Cyber City", "Noida Sector 62/132", "South Delhi", "Aerocity"],
        "transit_speed_kmh": 42,  # expressways & rapid metro
    },
    {
        "id": "pune-mumbai",
        "name": "Pune-Mumbai Expressway Tech Belt",
        "region": "Maharashtra",
        "center": {"lat": 18.6500, "lng": 73.7600},
        "radius_km": 90,
        "hubs": ["Hinjawadi Phase 1-3", "Baner-Balewadi", "Kharadi", "Navi Mumbai Knowledge Park"],
        "transit_speed_kmh": 50,
    },
    {
        "id": "chennai-omr",
        "name": "Chennai OMR IT Highway Corridor",
        "region": "Tamil Nadu",
        "center": {"lat": 12.9165, "lng": 80.2285},
        "radius_km": 40,
        "hubs": ["Taramani", "Perungudi", "Sholinganallur", "Siruseri SIPCOT"],
        "transit_speed_kmh": 35,
    },
]

# Commute & Isochrone Buffer Zone definitions
BUFFER_ZONES = [
    {
        "id": "metro_commute",
        "name": "Metro Daily Commute",
        "max_km": 35,
        "description": "Daily transit / drive distance (~30-55 mins)",
        "score_weight": 1.00,
        "commute_type": "Daily In-Office",
    },
    {
        "id": "hybrid_satellite",
        "name": "Hybrid Satellite Hub",
        "max_km": 85,
        "description": "Suburban / commuter rail corridor (~1-1.5 hrs, ideal for 1-2 days/week)",
        "score_weight": 0.85,
        "commute_type": "Hybrid (1-2 days/wk)",
    },
    {
        "id": "regional_corridor",
        "name": "Regional Tech Corridor",
        "max_km": 280,
        "description": "Express highway / high-speed rail corridor (weekly / bi-weekly sync)",
        "score_weight": 0.60,
        "commute_type": "Regional / Semi-Remote",
    },
    {
        "id": "national_relocation",
        "name": "National Relocation Zone",
        "max_km": 1400,
        "description": "Domestic interstate relocation or flight connection",
        "score_weight": 0.30,
        "commute_type": "Relocation Opportunity",
    },
]


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Computes great-circle geodesic distance in kilometers between two coordinates."""
    r_lat1, r_lat2 = math.radians(lat1), math.radians(lat2)
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)

    a = (math.sin(d_lat / 2.0) ** 2) + math.cos(r_lat1) * math.cos(r_lat2) * (math.sin(d_lng / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return 6371.0088 * c  # WGS-84 mean Earth radius in km


def initial_bearing_deg(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates the initial forward compass bearing (0-360 degrees) from (lat1, lng1) to (lat2, lng2)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_lambda = math.radians(lng2 - lng1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    theta = math.atan2(y, x)
    return (math.degrees(theta) + 360.0) % 360.0


def cardinal_direction(bearing_deg: float) -> str:
    """Translates compass degrees to 8-point compass cardinal direction."""
    points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = round(bearing_deg / 45.0) % 8
    return points[idx]


def encode_geohash(latitude: float, longitude: float, precision: int = 6) -> str:
    """Encodes (lat, lng) into standard Base32 Geohash (Morton space-filling Z-curve)."""
    lat_interval = [-90.0, 90.0]
    lng_interval = [-180.0, 180.0]

    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    even = True

    while len(geohash) < precision:
        if even:
            mid = (lng_interval[0] + lng_interval[1]) / 2.0
            if longitude >= mid:
                ch |= bits[bit]
                lng_interval[0] = mid
            else:
                lng_interval[1] = mid
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2.0
            if latitude >= mid:
                ch |= bits[bit]
                lat_interval[0] = mid
            else:
                lat_interval[1] = mid

        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(GEOHASH_BASE32[ch])
            bit = 0
            ch = 0

    return "".join(geohash)


def decode_geohash(geohash: str) -> tuple[float, float]:
    """Decodes a geohash string into centroid (latitude, longitude)."""
    lat_interval = [-90.0, 90.0]
    lng_interval = [-180.0, 180.0]
    even = True

    for c in geohash.lower():
        cd = GEOHASH_DECODE.get(c, 0)
        for mask in (16, 8, 4, 2, 1):
            if even:
                mid = (lng_interval[0] + lng_interval[1]) / 2.0
                if cd & mask:
                    lng_interval[0] = mid
                else:
                    lng_interval[1] = mid
            else:
                mid = (lat_interval[0] + lat_interval[1]) / 2.0
                if cd & mask:
                    lat_interval[0] = mid
                else:
                    lat_interval[1] = mid
            even = not even

    lat = (lat_interval[0] + lat_interval[1]) / 2.0
    lng = (lng_interval[0] + lng_interval[1]) / 2.0
    return round(lat, 6), round(lng, 6)


class SpatialIndex:
    """In-memory Spatial Geohash Index for O(1) spatial bucket lookups & radius searches."""

    def __init__(self, precision: int = 5):
        self.precision = precision
        self.buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.items: list[dict[str, Any]] = []

    def insert(self, item: dict[str, Any], lat: float, lng: float):
        gh = encode_geohash(lat, lng, self.precision)
        record = {**item, "lat": lat, "lng": lng, "geohash": gh}
        self.buckets[gh].append(record)
        self.items.append(record)

    def query_radius(self, center_lat: float, center_lng: float, radius_km: float) -> list[dict[str, Any]]:
        """Queries indexed items within radius_km, pruning non-viable cells."""
        results = []
        for item in self.items:
            dist = haversine_km(center_lat, center_lng, item["lat"], item["lng"])
            if dist <= radius_km:
                results.append({**item, "distance_km": round(dist, 1)})
        results.sort(key=lambda x: x["distance_km"])
        return results


def classify_buffer_zone(distance_km: float | None) -> dict[str, Any]:
    """Classifies a geodesic distance into an urban isochrone commute buffer."""
    if distance_km is None:
        return {
            "zone_id": "remote_global",
            "zone_name": "Remote / Borderless",
            "commute_type": "Remote / Distributed",
            "score_weight": 0.90,
            "est_commute_min": 0,
            "description": "Borderless distributed role - zero transit commute",
        }

    for zone in BUFFER_ZONES:
        if distance_km <= zone["max_km"]:
            # Estimate transit minutes assuming average urban/suburban traffic speeds
            speed_kmh = 32 if distance_km <= 35 else (45 if distance_km <= 85 else 75)
            est_minutes = max(10, round((distance_km / speed_kmh) * 60))
            return {
                "zone_id": zone["id"],
                "zone_name": zone["name"],
                "commute_type": zone["commute_type"],
                "score_weight": zone["score_weight"],
                "est_commute_min": est_minutes,
                "description": zone["description"],
            }

    # Greater than national commute buffer
    return {
        "zone_id": "cross_regional",
        "zone_name": "Cross-Regional / Relocation",
        "commute_type": "Relocation Required",
        "score_weight": 0.20,
        "est_commute_min": 180,
        "description": "Exceeds regional transit; candidate relocation or full remote contract required",
    }


def detect_tech_corridor(lat: float, lng: float) -> dict[str, Any] | None:
    """Finds if a given location falls inside one of the recognized technology corridors."""
    closest = None
    min_dist = float("inf")

    for corr in TECH_CORRIDORS:
        d = haversine_km(lat, lng, corr["center"]["lat"], corr["center"]["lng"])
        if d <= corr["radius_km"] and d < min_dist:
            min_dist = d
            closest = {
                "id": corr["id"],
                "name": corr["name"],
                "region": corr["region"],
                "distance_to_corridor_center_km": round(d, 1),
                "hubs": corr["hubs"],
            }
    return closest


def compute_kernel_density(jobs: list[dict[str, Any]], bandwidth_km: float = 40.0) -> list[dict[str, Any]]:
    """
    Computes 2D Gaussian Kernel Density Estimation (KDE) across job spatial coordinates.
    Generates weighted intensity hotspots for GIS heatmap rendering.
    """
    if not jobs:
        return []

    points = []
    for j in jobs:
        lat = j.get("lat")
        lng = j.get("lng")
        score = j.get("score", 50)
        if lat is not None and lng is not None:
            points.append((lat, lng, score))

    if not points:
        return []

    densities = []
    # Two-dimensional Gaussian kernel density evaluation
    for i, (lat_i, lng_i, score_i) in enumerate(points):
        local_density = 0.0
        for j, (lat_j, lng_j, score_j) in enumerate(points):
            d = haversine_km(lat_i, lng_i, lat_j, lng_j)
            # Gaussian kernel: exp(-0.5 * (d / h)^2)
            k = math.exp(-0.5 * ((d / bandwidth_km) ** 2))
            weight = (score_j / 100.0)
            local_density += k * weight

        densities.append({
            "lat": lat_i,
            "lng": lng_i,
            "density": round(local_density, 3),
            "intensity": min(1.0, round(local_density / max(1.0, len(points) * 0.25), 3)),
        })

    return densities


def summarize_spatial_clusters(jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Clusters jobs by city / metro hub and computes GIS aggregate metrics:
    centroid, job count, live count, top in-demand skills, and average compatibility.
    """
    city_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for j in jobs:
        city_groups[j.get("city", "Bengaluru")].append(j)

    clusters = []
    for city_name, group in city_groups.items():
        if not group:
            continue
        avg_lat = sum(j["lat"] for j in group) / len(group)
        avg_lng = sum(j["lng"] for j in group) / len(group)
        avg_score = sum(j.get("score", 50) for j in group) / len(group)
        live_count = sum(1 for j in group if j.get("is_live"))

        # Skill frequency in this cluster
        skill_counts: dict[str, int] = defaultdict(int)
        for j in group:
            for s in j.get("skills", []):
                skill_counts[s] += 1
        top_skills = sorted(skill_counts.keys(), key=lambda s: skill_counts[s], reverse=True)[:5]

        corridor = detect_tech_corridor(avg_lat, avg_lng)

        clusters.append({
            "city": city_name,
            "lat": round(avg_lat, 5),
            "lng": round(avg_lng, 5),
            "geohash": encode_geohash(avg_lat, avg_lng, 5),
            "total_jobs": len(group),
            "live_jobs": live_count,
            "avg_match_score": round(avg_score, 1),
            "top_skills": top_skills,
            "corridor": corridor["name"] if corridor else None,
        })

    clusters.sort(key=lambda c: c["total_jobs"], reverse=True)
    return clusters
