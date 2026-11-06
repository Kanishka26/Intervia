import pytest
from app import gis


def test_haversine_distance():
    # Bengaluru to Hyderabad is roughly 490 - 520 km
    d = gis.haversine_km(12.9716, 77.5946, 17.3850, 78.4867)
    assert 480 < d < 520
    # Zero distance to itself
    assert gis.haversine_km(12.9716, 77.5946, 12.9716, 77.5946) == 0.0


def test_bearing_and_cardinal_direction():
    # North: (10, 0) to (20, 0)
    b_north = gis.initial_bearing_deg(10, 0, 20, 0)
    assert round(b_north) == 0 or round(b_north) == 360
    assert gis.cardinal_direction(b_north) == "N"

    # East: (0, 10) to (0, 20)
    b_east = gis.initial_bearing_deg(0, 10, 0, 20)
    assert round(b_east) == 90
    assert gis.cardinal_direction(b_east) == "E"


def test_geohash_encoding_and_decoding():
    lat, lng = 12.9716, 77.5946
    gh = gis.encode_geohash(lat, lng, precision=6)
    assert gh.startswith("tdr1")

    dec_lat, dec_lng = gis.decode_geohash(gh)
    assert abs(dec_lat - lat) < 0.05
    assert abs(dec_lng - lng) < 0.05


def test_spatial_index_query_radius():
    index = gis.SpatialIndex(precision=5)
    index.insert({"title": "Role BLR"}, 12.9716, 77.5946)
    index.insert({"title": "Role HYD"}, 17.3850, 78.4867)

    # Within 50km of BLR: only Role BLR
    res_50 = index.query_radius(12.9716, 77.5946, 50)
    assert len(res_50) == 1
    assert res_50[0]["title"] == "Role BLR"

    # Within 600km: both roles
    res_600 = index.query_radius(12.9716, 77.5946, 600)
    assert len(res_600) == 2


def test_classify_buffer_zones():
    # Metro Commute (<= 35km)
    z1 = gis.classify_buffer_zone(15)
    assert z1["zone_id"] == "metro_commute"
    assert z1["score_weight"] == 1.00

    # Hybrid Satellite Hub (35 - 85km)
    z2 = gis.classify_buffer_zone(60)
    assert z2["zone_id"] == "hybrid_satellite"
    assert z2["score_weight"] == 0.85

    # Regional Tech Corridor (85 - 280km)
    z3 = gis.classify_buffer_zone(150)
    assert z3["zone_id"] == "regional_corridor"
    assert z3["score_weight"] == 0.60

    # Remote (None)
    z_remote = gis.classify_buffer_zone(None)
    assert z_remote["zone_id"] == "remote_global"


def test_detect_tech_corridor():
    # Coordinates in Bengaluru
    corr = gis.detect_tech_corridor(12.9716, 77.5946)
    assert corr is not None
    assert corr["name"] == "Bengaluru Silicon Corridor"

    # Middle of ocean: no corridor
    assert gis.detect_tech_corridor(0.0, 80.0) is None


def test_kde_and_spatial_clusters():
    sample_jobs = [
        {"id": "j1", "title": "Dev", "city": "Bengaluru", "lat": 12.97, "lng": 77.59, "score": 80, "is_live": True, "skills": ["Python"]},
        {"id": "j2", "title": "Lead", "city": "Bengaluru", "lat": 12.98, "lng": 77.60, "score": 90, "is_live": False, "skills": ["Python", "SQL"]},
        {"id": "j3", "title": "Cloud", "city": "Hyderabad", "lat": 17.38, "lng": 78.48, "score": 70, "is_live": True, "skills": ["AWS"]},
    ]

    kde = gis.compute_kernel_density(sample_jobs, bandwidth_km=50)
    assert len(kde) == 3
    assert all("intensity" in pt for pt in kde)

    clusters = gis.summarize_spatial_clusters(sample_jobs)
    assert len(clusters) == 2
    blr_cluster = next(c for c in clusters if c["city"] == "Bengaluru")
    assert blr_cluster["total_jobs"] == 2
    assert blr_cluster["live_jobs"] == 1
    assert "Python" in blr_cluster["top_skills"]
