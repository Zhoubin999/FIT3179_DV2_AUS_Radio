# Merge every source table into ONE file: data/australian_radio_data.csv
# Run from the DV2 folder:  python data/build_merged_data.py
#
# The original downloads live in data/raw/. Each row of the merged file has a
# "dataset" column that says which kind of row it is, so each chart can filter
# to the rows it needs:
#   Audience survey      - Infinite Dial (national + regional) and ACMA survey results
#   Station ratings      - GfK metro radio ratings, Surveys 3-6, one row per station per survey
#   DAB+ transmitter     - ACMA DAB+ licences grouped into transmitter sites
#   State infrastructure - ACMA radio sites + FM relays joined with ABS population, by state
import csv
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")

COLUMNS = [
    # every row
    "dataset", "source", "geography",
    # audience survey rows
    "section", "population_base", "metric", "subgroup_type", "subgroup", "year", "value", "unit",
    # station rating rows
    "market", "station", "program_format", "survey", "share", "rank", "latest_rank",
    # rows that are drawn on a map
    "latitude", "longitude",
    # DAB+ transmitter rows
    "region", "site_state", "site_name", "site_place", "frequency_blocks", "power_kw", "site_type", "label_side",
    "nearby_sites", "nearby_index",
    # state infrastructure rows
    "state", "state_name", "population", "all_radio_sites", "dab_sites", "radio_sites_per_100k",
    "dab_share_of_sites_pct", "fm_records", "fm_retransmission_records", "fm_retransmission_pct",
    "label_lon", "label_lat",
]


def read(name):
    with open(os.path.join(RAW, name), encoding="utf-8") as f:
        return list(csv.DictReader(f))


merged = []

# ---------------------------------------------------------------------------
# 1. Audience survey rows (already in long format: one number per row)
# ---------------------------------------------------------------------------
for name in ["infinite_dial_national_2026.csv", "infinite_dial_regional_2026.csv", "acma_listening_2026.csv"]:
    for r in read(name):
        merged.append({
            "dataset": "Audience survey",
            "source": r["source_name"],
            "geography": r["geography"],
            "section": r["dataset_section"],
            "population_base": r["population_base"],
            "metric": r["metric"],
            "subgroup_type": r["subgroup_type"],
            "subgroup": r["subgroup"],
            "year": r["year"],
            "value": r["value"],
            "unit": r["unit"],
        })

# ---------------------------------------------------------------------------
# 2. Station ratings = GfK Surveys 3-6 + program type of each station
#    + city centre coordinates for the map
# ---------------------------------------------------------------------------
# Program type comes from an explicit table (raw/station_program_types.csv) that
# records the basis for every label. A station missing from it is "Unclassified",
# never silently counted as music.
TYPES = {r["station"]: r["program_format"] for r in read("station_program_types.csv")}

CITY = {
    "Sydney": (-33.869, 151.209), "Melbourne": (-37.814, 144.963),
    "Brisbane": (-27.470, 153.026), "Adelaide": (-34.929, 138.601),
    "Perth": (-31.952, 115.861),
}

# share of each station in each survey (Surveys 3-5 from the rank history, Survey 6 report)
shares = {}
for r in read("gfk_station_rank_history_2026.csv"):
    shares[(r["market"], r["station"], int(r["survey"]))] = float(r["share"])
for r in read("gfk_metro_survey6_2026.csv"):
    shares[(r["market"], r["station"], 6)] = float(r["share"])


def rank_in_survey(market, survey, share):
    """1 = highest share; stations with equal share get the same rank."""
    higher = [v for (m, st, sv), v in shares.items() if m == market and sv == survey and v > share]
    return 1 + len(higher)


unclassified = sorted({st for (m, st, sv) in shares if st not in TYPES})
if unclassified:
    print("WARNING - stations without a program type:", unclassified)

for (market, station, survey), share in sorted(shares.items()):
    lat, lon = CITY[market]
    latest = shares.get((market, station, 6))
    merged.append({
        "dataset": "Station ratings",
        "source": "GfK / Commercial Radio & Audio metro ratings",
        "geography": market,
        "year": 2026,
        "market": market,
        "station": station,
        "program_format": TYPES.get(station, "Unclassified"),
        "survey": survey,
        "share": share,
        "rank": rank_in_survey(market, survey, share),
        "latest_rank": rank_in_survey(market, 6, latest) if latest is not None else "",
        "latitude": lat,
        "longitude": lon,
    })

# ---------------------------------------------------------------------------
# 3. DAB+ transmitters: one row per site (several frequency blocks can share
#    one tower), keeping the strongest transmitter power.
# ---------------------------------------------------------------------------
# Each licensed area belongs to one of eleven DAB+ service regions
REGION = {
    "Sydney City": "Sydney", "Collaroy Plateau": "Sydney", "Penrith": "Sydney",
    "Campbelltown": "Sydney", "Sutherland": "Sydney", "Sydney Northern Beaches": "Sydney",
    "Melbourne City": "Melbourne", "Port Melbourne": "Melbourne", "Werribee": "Melbourne",
    "Bacchus Marsh/Melton": "Melbourne", "Caboolture": "Brisbane",
    "Perth City": "Perth", "Perth Northern Beaches": "Perth",
    "Tuggeranong": "Canberra", "Taroona": "Hobart", "Darwin City": "Darwin",
}

# Which side of the circle each main site's label goes on (keeps labels apart)
LABEL_SIDE = {"Adelaide": "left", "Mandurah": "below", "Canberra": "below",
              "Gold Coast": "below"}

# Short place name for each high-power site (low-power sites use their licensed area name)
MAIN_SITE_PLACE = {
    "crafers": "Mount Lofty", "coot-tha": "Mount Coot-tha", "ornata road": "Mount Dandenong (Ornata Rd)",
    "ridge rd": "Mount Dandenong (Ridge Rd)", "carmel": "Carmel", "artarmon": "Artarmon",
    "beechmont": "Lower Beechmont", "tamborine": "Mount Tamborine", "black mountain": "Black Mountain",
    "shoal bay": "Shoal Bay", "wellington": "Mount Wellington", "pinjarra": "Pinjarra",
}


def site_place(site, power_kw):
    if power_kw < 10:
        return site["area_served"]
    for key, place in MAIN_SITE_PLACE.items():
        if key in site["site_name"].lower():
            return place
    return site["area_served"]


def km_between(a, b):
    dy = (a["latitude"] - b["latitude"]) * 111.2
    dx = (a["longitude"] - b["longitude"]) * 111.2 * math.cos(math.radians(a["latitude"]))
    return math.hypot(dx, dy)


dab_sites = {}
for r in read("acma_dab_transmitters_july2026.csv"):
    key = (r["area_served"], r["site_name"])
    site = dab_sites.setdefault(key, {
        "area_served": r["area_served"],
        "state": r["state"],
        "site_name": r["site_name"].title(),
        "latitude": round(float(r["latitude"]), 4),
        "longitude": round(float(r["longitude"]), 4),
        "blocks": [],
        "power_w": 0.0,
    })
    site["blocks"].append(r["frequency_block"].replace("DAB", ""))
    site["power_w"] = max(site["power_w"], float(r["power_w"]))

# Sites less than 1 km apart overlap on any map, so number them for the zoomable map to fan out
site_list = sorted(dab_sites.values(), key=lambda s: -s["power_w"])
for site in site_list:
    group = [s for s in site_list if km_between(site, s) < 1]
    site["nearby_sites"] = len(group)
    site["nearby_index"] = group.index(site)

for site in site_list:
    power_kw = site["power_w"] / 1000
    merged.append({
        "dataset": "DAB+ transmitter",
        "source": "ACMA list of licensed broadcast transmitters, July 2026",
        "geography": site["area_served"],
        "latitude": site["latitude"],
        "longitude": site["longitude"],
        "region": REGION.get(site["area_served"], site["area_served"]),
        "site_state": site["state"],
        "site_name": site["site_name"],
        "site_place": site_place(site, power_kw),
        "frequency_blocks": ", ".join(sorted(site["blocks"])),
        "power_kw": round(power_kw, 1),
        "site_type": "Main high-power site" if power_kw >= 10 else "Low-power infill site",
        "label_side": LABEL_SIDE.get(site["area_served"], "right") if power_kw >= 10 else "none",
        "nearby_sites": site["nearby_sites"],
        "nearby_index": site["nearby_index"],
    })

# ---------------------------------------------------------------------------
# 4. State infrastructure = ACMA radio sites + ACMA FM relays + ABS population
# ---------------------------------------------------------------------------
STATE_NAMES = {
    "NSW": "New South Wales", "VIC": "Victoria", "QLD": "Queensland",
    "SA": "South Australia", "WA": "Western Australia", "TAS": "Tasmania",
    "ACT": "Australian Capital Territory", "NT": "Northern Territory",
}
# Where each state's label sits on the map (longitude, latitude)
LABEL_POS = {
    "WA": (121.5, -25.5), "NT": (133.5, -19.5), "QLD": (144.5, -22.5),
    "SA": (135.5, -30.0), "NSW": (146.5, -32.5), "VIC": (144.0, -37.0),
    "TAS": (146.6, -42.0), "ACT": (153.2, -36.0),
}

sites = {r["state"]: r for r in read("acma_radio_sites_by_state_2026.csv")}
relays = {r["state"]: r for r in read("acma_fm_retransmission_by_state_2026.csv")}
population = {r["geography"]: r for r in read("abs_population_march2026.csv")}

for code, name in STATE_NAMES.items():
    s, f = sites[code], relays[code]
    people = float(population[name]["value"]) * 1000
    merged.append({
        "dataset": "State infrastructure",
        "source": "ACMA transmitter list (July 2026) + ABS population (March 2026)",
        "geography": name,
        "state": code,
        "state_name": name,
        "population": round(people),
        "all_radio_sites": s["unique_all_radio_sites"],
        "dab_sites": s["dab_sites"],
        "radio_sites_per_100k": round(int(s["unique_all_radio_sites"]) / people * 100000, 1),
        "dab_share_of_sites_pct": round(float(s["digital_site_share_pct"]), 1),
        "fm_records": f["fm_issued_unique_records"],
        "fm_retransmission_records": f["fm_retransmission_total"],
        "fm_retransmission_pct": round(float(f["fm_retransmission_share_pct"]), 1),
        "label_lon": LABEL_POS[code][0],
        "label_lat": LABEL_POS[code][1],
    })

with open(os.path.join(HERE, "australian_radio_data.csv"), "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=COLUMNS)
    writer.writeheader()
    writer.writerows(merged)
print("wrote australian_radio_data.csv with", len(merged), "rows")
