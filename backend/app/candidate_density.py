"""Candidate Density & Spatial Talent Intelligence Engine for Recruiters & Employers."""
from __future__ import annotations

import math
import random
import time
from typing import Any
from .gis import (
    haversine_km,
    encode_geohash,
    detect_tech_corridor,
    TECH_CORRIDORS,
    BUFFER_ZONES,
)

DOMAINS = [
    {
        "id": "fullstack",
        "title": "Full-Stack Web & Mobile",
        "badge": "Full Stack",
        "skills": ["React", "TypeScript", "Node.js", "Python", "PostgreSQL", "Next.js", "Tailwind CSS"],
        "description": "Architects modern web applications from fluid frontend UI to scalable backend API servers.",
        "national_pool": 14250,
        "avg_benchmark": 4.28,
        "verified_rate": 81.4,
    },
    {
        "id": "backend",
        "title": "Backend & Distributed Systems",
        "badge": "Backend",
        "skills": ["Python", "FastAPI", "Go", "PostgreSQL", "Redis", "Kafka", "Docker", "Kubernetes"],
        "description": "High-throughput microservices, low-latency APIs, event streaming, and distributed data systems.",
        "national_pool": 12800,
        "avg_benchmark": 4.35,
        "verified_rate": 84.2,
    },
    {
        "id": "aiml",
        "title": "AI, Machine Learning & Data Science",
        "badge": "AI / ML",
        "skills": ["Python", "PyTorch", "Hugging Face", "LLMs", "RAG", "Transformers", "LangChain", "Vector DBs"],
        "description": "Specialists in generative models, agentic LLM pipelines, fine-tuning, embeddings, and MLOps.",
        "national_pool": 8600,
        "avg_benchmark": 4.41,
        "verified_rate": 87.0,
    },
    {
        "id": "devops",
        "title": "DevOps, Cloud & Site Reliability (SRE)",
        "badge": "Cloud / SRE",
        "skills": ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "Prometheus", "GCP"],
        "description": "Cloud native infrastructure, automated CI/CD deployment pipelines, container orchestration, and reliability.",
        "national_pool": 7900,
        "avg_benchmark": 4.19,
        "verified_rate": 79.5,
    },
    {
        "id": "frontend",
        "title": "Frontend & UI Systems",
        "badge": "Frontend",
        "skills": ["React", "TypeScript", "Next.js", "Vue", "Tailwind CSS", "Web Vitals", "State Management"],
        "description": "Crafts accessible, high-performance web applications, fluid micro-interactions, and design systems.",
        "national_pool": 9800,
        "avg_benchmark": 4.22,
        "verified_rate": 76.8,
    },
    {
        "id": "mobile",
        "title": "Mobile Engineering (iOS / Android)",
        "badge": "Mobile",
        "skills": ["React Native", "Flutter", "Swift", "Kotlin", "Android SDK", "iOS SDK", "Offline Sync"],
        "description": "Cross-platform and native mobile apps with smooth 60fps animations and offline-first capabilities.",
        "national_pool": 5400,
        "avg_benchmark": 4.15,
        "verified_rate": 75.0,
    },
    {
        "id": "data",
        "title": "Data Engineering & Analytics",
        "badge": "Data Eng",
        "skills": ["Apache Spark", "Airflow", "Snowflake", "SQL", "Databricks", "Python", "dbt", "Kafka"],
        "description": "Scalable data ingestion pipelines, warehouse modeling, lakehouse architectures, and real-time streaming.",
        "national_pool": 6900,
        "avg_benchmark": 4.31,
        "verified_rate": 82.5,
    },
    {
        "id": "security",
        "title": "Cybersecurity & InfoSec",
        "badge": "Security",
        "skills": ["Network Security", "Penetration Testing", "IAM", "OWASP", "Cryptography", "SOC", "Zero Trust"],
        "description": "Defensive and offensive security engineering, identity governance, zero-trust architectures, and compliance.",
        "national_pool": 4300,
        "avg_benchmark": 4.45,
        "verified_rate": 88.0,
    },
]

DOMAIN_MAP = {d["id"]: d for d in DOMAINS}

CITY_TALENT_HUBS = [
    {
        "city": "Bengaluru",
        "region": "Karnataka",
        "corridor": "Bengaluru Silicon Corridor",
        "center": {"lat": 12.9716, "lng": 77.5946},
        "base_share": 0.32,  # 32% of tech candidate volume
        "feeder_institutions": [
            "IIIT Bangalore", "RV College of Engineering", "PES University",
            "BMS College of Engineering", "IISc Bangalore", "MS Ramaiah Institute"
        ],
        "sub_hubs": [
            {
                "name": "Outer Ring Road (Bellandur / Kadubeesanahalli)",
                "lat": 12.9298,
                "lng": 77.6835,
                "share": 0.38,
                "transit": "ORR Bus Rapid Transit / Metro Phase 2A",
                "prominent_employers": ["Cisco", "Adobe", "JPMorgan", "Wells Fargo", "Flipkart"],
            },
            {
                "name": "Whitefield ITPL & EPIP Zone",
                "lat": 12.9863,
                "lng": 77.7381,
                "share": 0.24,
                "transit": "Purple Line Metro (Whitefield Terminal)",
                "prominent_employers": ["SAP Labs", "Dell", "Oracle", "Schneider Electric"],
            },
            {
                "name": "Koramangala & HSR Startup Enclave",
                "lat": 12.9279,
                "lng": 77.6271,
                "share": 0.16,
                "transit": "Hosur Road Arterial & Inner Ring Road",
                "prominent_employers": ["Swiggy", "Khatabook", "Razorpay", "CRED"],
            },
            {
                "name": "Electronic City (Phase 1 & 2)",
                "lat": 12.8452,
                "lng": 77.6602,
                "share": 0.14,
                "transit": "Namma Metro Yellow Line / Elevated Expressway",
                "prominent_employers": ["Infosys", "Wipro", "TCS", "Siemens Healthineers"],
            },
            {
                "name": "Indiranagar & Domlur EGL",
                "lat": 12.9614,
                "lng": 77.6443,
                "share": 0.08,
                "transit": "Purple Line Metro (Indiranagar) / Airport Corridor",
                "prominent_employers": ["IBM", "Target", "McAfee", "Goldman Sachs"],
            },
        ],
    },
    {
        "city": "Hyderabad",
        "region": "Telangana",
        "corridor": "Hyderabad HITEC & Cyberabad Corridor",
        "center": {"lat": 17.4483, "lng": 78.3915},
        "base_share": 0.22,
        "feeder_institutions": [
            "IIIT Hyderabad", "BITS Pilani Hyderabad", "IIT Hyderabad",
            "JNTU Hyderabad", "CBIT Hyderabad", "VNR VJIET"
        ],
        "sub_hubs": [
            {
                "name": "HITEC City Cyber Towers & Mindspace",
                "lat": 17.4483,
                "lng": 78.3748,
                "share": 0.40,
                "transit": "Blue Line Metro (HITEC City / Raidurg)",
                "prominent_employers": ["Qualcomm", "Oracle", "Broadcom", "Deloitte"],
            },
            {
                "name": "Gachibowli Financial District & Nanakramguda",
                "lat": 17.4156,
                "lng": 78.3432,
                "share": 0.32,
                "transit": "Nehru Outer Ring Road Expressway",
                "prominent_employers": ["Microsoft IDC", "Amazon HYD13", "Google", "Apple"],
            },
            {
                "name": "Madhapur Tech Zone",
                "lat": 17.4486,
                "lng": 78.3908,
                "share": 0.16,
                "transit": "Durgam Cheruvu Cable Bridge & Metro Link",
                "prominent_employers": ["TCS Synergy", "Tech Mahindra", "Virtusa"],
            },
            {
                "name": "Kondapur & Botanical Garden Belt",
                "lat": 17.4699,
                "lng": 78.3578,
                "share": 0.12,
                "transit": "Gachibowli-Miyapur Transit Corridor",
                "prominent_employers": ["Cognizant", "Genpact", "Invesco"],
            },
        ],
    },
    {
        "city": "NCR",
        "region": "Delhi-NCR",
        "corridor": "NCR Megacity Tech Belt",
        "center": {"lat": 28.5355, "lng": 77.2500},
        "base_share": 0.20,
        "feeder_institutions": [
            "IIT Delhi", "Delhi Technological University (DTU)", "NSUT Delhi",
            "IIIT Delhi", "Jaypee Institute (JIIT)", "Beni Prasad IITM"
        ],
        "sub_hubs": [
            {
                "name": "Gurugram Cyber City & DLF Phase 2",
                "lat": 28.4950,
                "lng": 77.0895,
                "share": 0.36,
                "transit": "Delhi Metro Yellow Line & Rapid Metro Cyber City",
                "prominent_employers": ["Google Gurugram", "Microsoft", "Zomato", "MakeMyTrip"],
            },
            {
                "name": "Noida Sector 62/63 IT Park",
                "lat": 28.6280,
                "lng": 77.3649,
                "share": 0.28,
                "transit": "Blue Line Metro (Noida Electronic City)",
                "prominent_employers": ["Samsung R&D", "HCL Tech", "Paytm HQ", "Adobe Noida"],
            },
            {
                "name": "Gurugram Golf Course Road & Extension",
                "lat": 28.4350,
                "lng": 77.1020,
                "share": 0.20,
                "transit": "Golf Course Road Rapid Metro / NH-48",
                "prominent_employers": ["American Express", "Dell EMC", "Genpact", "PolicyBazaar"],
            },
            {
                "name": "Noida Sector 132-142 Expressway",
                "lat": 28.5020,
                "lng": 77.3820,
                "share": 0.16,
                "transit": "Aqua Line Metro / Noida-Greater Noida Expressway",
                "prominent_employers": ["MetLife", "GlobalLogic", "KPMG", "Wipro"],
            },
        ],
    },
    {
        "city": "Pune",
        "region": "Maharashtra",
        "corridor": "Pune-Mumbai Expressway Tech Belt",
        "center": {"lat": 18.6500, "lng": 73.7600},
        "base_share": 0.14,
        "feeder_institutions": [
            "COEP Technological University", "PICT Pune", "MIT World Peace University",
            "VIT Pune", "Cummins College of Engineering"
        ],
        "sub_hubs": [
            {
                "name": "Hinjewadi Rajiv Gandhi Infotech Park Phase 1",
                "lat": 18.5913,
                "lng": 73.7389,
                "share": 0.42,
                "transit": "Pune Metro Line 3 (Hinjewadi-Shivajinagar Line)",
                "prominent_employers": ["Infosys Hinjewadi", "TCS Sahyadri", "Wipro", "Cognizant"],
            },
            {
                "name": "Kharadi EON Free Zone & WTC",
                "lat": 18.5516,
                "lng": 73.9535,
                "share": 0.28,
                "transit": "Ahmednagar Highway & Ramwadi Metro Line",
                "prominent_employers": ["Barclays", "Credit Suisse", "UBS", "Citi Corp"],
            },
            {
                "name": "Baner - Balewadi High Street",
                "lat": 18.5642,
                "lng": 73.7769,
                "share": 0.18,
                "transit": "Mumbai-Pune Expressway Gateway / Katraj Bypass",
                "prominent_employers": ["Siemens", "PTC", "Cybage", "Media.net"],
            },
            {
                "name": "Magarpatta Cybercity (Hadapsar)",
                "lat": 18.5134,
                "lng": 73.9272,
                "share": 0.12,
                "transit": "Solapur Road Transit Arterial",
                "prominent_employers": ["Amdocs", "Accenture", "BNY Mellon", "Deutsche Bank"],
            },
        ],
    },
    {
        "city": "Chennai",
        "region": "Tamil Nadu",
        "corridor": "Chennai OMR IT Highway Corridor",
        "center": {"lat": 12.9165, "lng": 80.2285},
        "base_share": 0.08,
        "feeder_institutions": [
            "IIT Madras", "College of Engineering Guindy (Anna Univ)", "SSN College of Engineering",
            "SRM Institute", "Madras Institute of Technology (MIT)"
        ],
        "sub_hubs": [
            {
                "name": "Taramani TIDEL Park & Ascendas",
                "lat": 12.9863,
                "lng": 80.2432,
                "share": 0.35,
                "transit": "MRTS Railway (Thiruvanmiyur / Taramani) & Metro Phase 2",
                "prominent_employers": ["Amazon Chennai", "Cognizant", "TCS", "Accenture"],
            },
            {
                "name": "Sholinganallur ELCOT SEZ",
                "lat": 12.9010,
                "lng": 80.2279,
                "share": 0.35,
                "transit": "OMR Expressway / Medavakkam Link",
                "prominent_employers": ["Ford Global Technology", "Wipro", "HCL", "Cognizant KITS"],
            },
            {
                "name": "Siruseri SIPCOT IT Park",
                "lat": 12.8250,
                "lng": 80.2210,
                "share": 0.30,
                "transit": "OMR 6-Lane Expressway Extension",
                "prominent_employers": ["TCS Siruseri Signature Campus", "Hexaware", "Aspire Systems"],
            },
        ],
    },
]

CITY_MAP = {c["city"]: c for c in CITY_TALENT_HUBS}


def get_candidate_density(
    domain: str = "fullstack",
    city: str | None = "Bengaluru",
    level: str = "all",
    radius_km: int = 35,
) -> dict[str, Any]:
    """
    Computes spatial candidate density, talent pool distribution,
    corridor clusters, feeder networks, and KDE heatmap coordinates for recruiters.
    """
    domain_key = domain.lower() if domain in DOMAIN_MAP else "fullstack"
    d_meta = DOMAIN_MAP[domain_key]

    selected_city_data = CITY_MAP.get(city) if city and city in CITY_MAP else None
    
    # Calculate pool for the domain and target region
    total_national_pool = d_meta["national_pool"]

    if selected_city_data:
        city_share = selected_city_data["base_share"]
        city_center = selected_city_data["center"]
        base_city_pool = int(total_national_pool * city_share)
    else:
        # Nationwide overview
        city_center = {"lat": 20.5937, "lng": 78.9629}
        base_city_pool = total_national_pool

    # Experience level distribution filter
    level_multipliers = {
        "all": 1.0,
        "fresher": 0.35,
        "mid": 0.45,
        "senior": 0.20,
    }
    level_mult = level_multipliers.get(level.lower(), 1.0)
    adjusted_pool = int(base_city_pool * level_mult)

    # Sub-hub level distribution
    sub_hubs_output = []
    heatmap_points = []
    
    # Random seed based on domain and city for stable reproducible data
    rnd = random.Random(hash(f"{domain_key}_{city}_{level}"))

    if selected_city_data:
        sub_hubs = selected_city_data["sub_hubs"]
        for sh in sub_hubs:
            dist_to_center = haversine_km(city_center["lat"], city_center["lng"], sh["lat"], sh["lng"])
            
            # Check if within radius filter (or if radius is 0 / unbounded)
            in_radius = radius_km <= 0 or dist_to_center <= radius_km
            
            hub_count = int(adjusted_pool * sh["share"])
            hub_score = round(d_meta["avg_benchmark"] + rnd.uniform(-0.15, 0.15), 2)
            hub_score = max(3.8, min(4.9, hub_score))
            verified_pct = round(d_meta["verified_rate"] + rnd.uniform(-3.0, 4.0), 1)

            # Sample top skills emphasizing domain stack
            domain_skills = d_meta["skills"]
            sh_skills = domain_skills[:4] + [rnd.choice(["Docker", "PostgreSQL", "AWS", "Git", "REST APIs"])]
            sh_skills = list(dict.fromkeys(sh_skills))

            sub_hubs_output.append({
                "name": sh["name"],
                "lat": sh["lat"],
                "lng": sh["lng"],
                "geohash": encode_geohash(sh["lat"], sh["lng"], 6),
                "corridor": selected_city_data["corridor"],
                "candidate_count": hub_count,
                "in_radius": in_radius,
                "distance_km": round(dist_to_center, 1),
                "transit": sh.get("transit", ""),
                "prominent_employers": sh.get("prominent_employers", []),
                "avg_benchmark_score": hub_score,
                "verified_pct": verified_pct,
                "top_skills": sh_skills,
            })

            # Generate fine-grained 2D KDE points around this sub-hub for the heatmap layer
            n_points = max(8, int(hub_count / 30))
            for _ in range(n_points):
                # Small jitter (~0.8 to 2.5 km Gaussian dispersion around the tech park)
                j_lat = sh["lat"] + rnd.gauss(0, 0.012)
                j_lng = sh["lng"] + rnd.gauss(0, 0.012)
                intensity = round(rnd.uniform(0.65, 1.0), 2)
                heatmap_points.append([round(j_lat, 5), round(j_lng, 5), intensity])

    else:
        # Nationwide aggregation across all hubs
        for c in CITY_TALENT_HUBS:
            c_pool = int(adjusted_pool * c["base_share"])
            sub_hubs_output.append({
                "name": f"{c['city']} Metro Hub",
                "lat": c["center"]["lat"],
                "lng": c["center"]["lng"],
                "geohash": encode_geohash(c["center"]["lat"], c["center"]["lng"], 5),
                "corridor": c["corridor"],
                "candidate_count": c_pool,
                "in_radius": True,
                "distance_km": 0,
                "transit": "Interstate Metro & Air Express",
                "prominent_employers": [sh["name"].split()[0] for sh in c["sub_hubs"][:3]],
                "avg_benchmark_score": d_meta["avg_benchmark"],
                "verified_pct": d_meta["verified_rate"],
                "top_skills": d_meta["skills"][:5],
            })
            for sh in c["sub_hubs"]:
                for _ in range(6):
                    heatmap_points.append([
                        round(sh["lat"] + rnd.gauss(0, 0.02), 5),
                        round(sh["lng"] + rnd.gauss(0, 0.02), 5),
                        round(rnd.uniform(0.5, 0.95), 2),
                    ])

    # Commute Isochrone breakdown
    commute_35km_pct = 74.0 if selected_city_data else 45.0
    commute_85km_pct = 20.0 if selected_city_data else 35.0
    commute_regional_pct = 6.0 if selected_city_data else 20.0

    in_radius_total = sum(sh["candidate_count"] for sh in sub_hubs_output if sh.get("in_radius", True))
    active_seekers = int(in_radius_total * 0.72)
    verified_total = int(in_radius_total * (d_meta["verified_rate"] / 100.0))

    # Anonymized Candidate Samples matching this domain in this area
    SAMPLE_NAMES = [
        ("Aarav S.", "fresher", 4.7, 8.4, ["React", "TypeScript", "Node.js", "PostgreSQL"]),
        ("Priya N.", "mid", 4.8, 12.1, ["Python", "FastAPI", "Docker", "Redis", "Kafka"]),
        ("Rohan M.", "senior", 4.6, 6.5, ["Go", "Kubernetes", "AWS", "Microservices", "PostgreSQL"]),
        ("Ananya V.", "mid", 4.5, 14.8, ["PyTorch", "LLMs", "LangChain", "Python", "RAG"]),
        ("Dev K.", "fresher", 4.4, 9.2, ["React", "Next.js", "Tailwind CSS", "TypeScript"]),
        ("Neha P.", "mid", 4.7, 18.0, ["AWS", "Terraform", "Docker", "CI/CD", "Linux"]),
        ("Siddharth R.", "senior", 4.9, 11.3, ["Distributed Systems", "Python", "Kafka", "PostgreSQL"]),
        ("Kavya B.", "fresher", 4.6, 7.0, ["Python", "Machine Learning", "SQL", "Scikit-Learn"]),
    ]
    
    sample_candidates = []
    for idx, (name, cand_level, score, dist, skills) in enumerate(SAMPLE_NAMES):
        if level != "all" and cand_level != level:
            continue
        sample_candidates.append({
            "id": f"cand-{domain_key}-{idx+1}",
            "name": name,
            "target_domain": d_meta["title"],
            "experience_level": cand_level,
            "benchmark_score": score,
            "distance_km": dist,
            "commute_zone": "≤ 15 km (Express Metro)" if dist <= 15 else "≤ 35 km (Daily Commute)",
            "anchored": True,
            "skills": [s for s in skills if s in d_meta["skills"]] + [d_meta["skills"][0]],
            "top_strength": "High technical depth in core architecture and state synchronization" if cand_level != "fresher" else "Clean problem decomposition & sound CS fundamentals",
            "available_status": "Actively Reviewing Opportunities",
        })

    return {
        "domain": d_meta,
        "all_domains": [
            {"id": d["id"], "title": d["title"], "badge": d["badge"], "national_pool": d["national_pool"]}
            for d in DOMAINS
        ],
        "city": {
            "name": selected_city_data["city"] if selected_city_data else "All Hubs (Nationwide)",
            "region": selected_city_data["region"] if selected_city_data else "India",
            "corridor": selected_city_data["corridor"] if selected_city_data else "All National Tech Corridors",
            "center": city_center,
            "geohash": encode_geohash(city_center["lat"], city_center["lng"], 6),
        },
        "all_cities": [
            {"name": c["city"], "region": c["region"], "corridor": c["corridor"], "center": c["center"]}
            for c in CITY_TALENT_HUBS
        ],
        "density_metrics": {
            "total_in_radius": in_radius_total,
            "active_seekers": active_seekers,
            "verified_count": verified_total,
            "verified_pct": d_meta["verified_rate"],
            "avg_benchmark_score": d_meta["avg_benchmark"],
            "radius_km": radius_km,
            "experience_filter": level,
            "commute_breakdown": {
                "metro_35km_pct": commute_35km_pct,
                "satellite_85km_pct": commute_85km_pct,
                "regional_280km_pct": commute_regional_pct,
            },
        },
        "sub_hubs": sub_hubs_output,
        "feeder_institutions": selected_city_data["feeder_institutions"] if selected_city_data else [
            "IIT Bombay", "IIT Delhi", "IIT Madras", "IIIT Bangalore", "IIIT Hyderabad", "BITS Pilani"
        ],
        "heatmap_points": heatmap_points,
        "sample_candidates": sample_candidates,
    }
