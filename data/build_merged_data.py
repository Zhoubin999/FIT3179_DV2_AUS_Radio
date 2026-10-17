# Build the three merged CSV files used by the redesigned charts.
# Run from the DV2 folder:  python data/build_merged_data.py
import csv
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def read(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write(name, rows):
    with open(os.path.join(HERE, name), "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print("wrote", name, len(rows), "rows")


# ---------------------------------------------------------------------------
# 1. State radio infrastructure = ABS population + ACMA radio sites
#    + ACMA FM retransmission records (joined on state code)
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

sites = {r["state"]: r for r in read("c11_radio_sites_by_state_2026.csv")}
retrans = {r["state"]: r for r in read("c11_fm_retransmission_by_state_2026.csv")}

state_rows = []
for code, name in STATE_NAMES.items():
    s, f = sites[code], retrans[code]
    state_rows.append({
        "state": code,
        "state_name": name,
        "population": s["population_mar2026"],
        "am_sites": s["am_sites"],
        "fm_sites": s["fm_sites"],
        "dab_sites": s["dab_sites"],
        "all_radio_sites": s["unique_all_radio_sites"],
        "radio_sites_per_100k": round(float(s["radio_sites_per_100k"]), 1),
        "dab_share_of_sites_pct": round(float(s["digital_site_share_pct"]), 1),
        "fm_records": f["fm_issued_unique_records"],
        "fm_retransmission_records": f["fm_retransmission_total"],
        "fm_retransmission_pct": round(float(f["fm_retransmission_share_pct"]), 1),
        "label_lon": LABEL_POS[code][0],
        "label_lat": LABEL_POS[code][1],
    })
write("state_radio_infrastructure_2026.csv", state_rows)


# ---------------------------------------------------------------------------
# 2. Metro station shares = GfK surveys 3-5 (share + rank)
#    + program format of each station (author's classification)
#    + city centre coordinates for the map
# ---------------------------------------------------------------------------
TALK = {"2GB", "3AW", "4BC 882", "FIVEaa", "6PR"}
SPORT = {"SEN 1170am", "SKY Sports Radio", "SEN 1116am", "SENQ 693am"}
ABC_TALK = {"ABC SYD", "ABC MEL", "ABC BRIS", "ABC ADE", "ABC PER",
            "2RN", "3RN", "4RN", "5RN", "6RN", "ABC NEWSRADIO"}
ABC_MUSIC = {"2JJJ", "3JJJ", "4JJJ", "5JJJ", "6JJJ", "ABC CLASSIC"}


def program_format(station):
    if station in TALK:
        return "Commercial talk & news"
    if station in SPORT:
        return "Sport"
    if station in ABC_TALK:
        return "ABC talk & news"
    if station in ABC_MUSIC:
        return "ABC music"
    return "Commercial music"


CITY = {
    "Sydney": (-33.869, 151.209), "Melbourne": (-37.814, 144.963),
    "Brisbane": (-27.470, 153.026), "Adelaide": (-34.929, 138.601),
    "Perth": (-31.952, 115.861),
}

station_rows = []
for r in read("c05_station_rank_history_2026.csv"):
    lat, lon = CITY[r["market"]]
    station_rows.append({
        "market": r["market"],
        "station": r["station"],
        "program_format": program_format(r["station"]),
        "survey": r["survey"],
        "share": r["share"],
        "rank": r["rank"],
        "latest_rank": r["latest_rank"],
        "latitude": lat,
        "longitude": lon,
    })
write("metro_station_share_2026.csv", station_rows)


# ---------------------------------------------------------------------------
# 3. DAB+ transmitter sites: one row per site (several frequency blocks
#    can share one tower), keeping the strongest transmitter power.
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

dab_rows = []
for site in dab_sites.values():
    power_kw = site["power_w"] / 1000
    dab_rows.append({
        "region": REGION.get(site["area_served"], site["area_served"]),
        "area_served": site["area_served"],
        "state": site["state"],
        "site_name": site["site_name"],
        "latitude": site["latitude"],
        "longitude": site["longitude"],
        "frequency_blocks": ", ".join(sorted(site["blocks"])),
        "block_count": len(site["blocks"]),
        "power_kw": round(power_kw, 1),
        "site_type": "Main high-power site" if power_kw >= 10 else "Low-power infill site",
        "label_side": LABEL_SIDE.get(site["area_served"], "right") if power_kw >= 10 else "none",
    })
dab_rows.sort(key=lambda r: -r["power_kw"])
write("dab_transmitter_sites_2026.csv", dab_rows)
