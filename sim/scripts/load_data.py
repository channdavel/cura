import io
import os
import json
import zipfile
import requests
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from libpysal.weights import Queen
from tqdm import tqdm

# NEW: import the Node and helpers
from sim.core.entities import Node, load_nodes_from_csv, attach_neighbors_from_json  # adjust import if needed

# ---- Insecure HTTP session (no TLS verification) ----
import urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_insecure_session() -> requests.Session:
    s = requests.Session()
    s.verify = False  # <- do not verify TLS certs
    s.headers.update({
        "User-Agent": "cura-pandemic-sim/1.0 (+local)",
        "Accept": "*/*",
    })
    retries = Retry(
        total=5,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
        raise_on_status=False,
        respect_retry_after_header=True,
    )
    s.mount("http://", HTTPAdapter(max_retries=retries))
    s.mount("https://", HTTPAdapter(max_retries=retries))
    return s

SESSION = get_insecure_session()

# ----------------------------------------
# CONFIG
# ----------------------------------------
# Force HTTP (not HTTPS)
CB_ZIP_URL = "http://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_tract_500k.zip"  # Cartographic Boundary tracts (nationwide)
CB_ZIP_PATH = "cb_2023_us_tract_500k.zip"
CB_SHP_BASENAME = "cb_2023_us_tract_500k.shp"

# ACS 5-year dataset + variables for total population and median income
ACS_YEAR = 2023
ACS_DATASET = f"http://api.census.gov/data/{ACS_YEAR}/acs/acs5"  # forced http
ACS_POP_VAR = "B01003_001E"  # Total population
ACS_INCOME_VAR = "B19013_001E"  # Median household income in past 12 months

# Optional: set CENSUS_API_KEY in your env for higher rate limits
CENSUS_API_KEY = os.getenv("CENSUS_API_KEY", None)

OUT_NODES_CSV = "tract_nodes.csv"
OUT_NEIGHBORS_JSON = "tract_neighbors.json"
# full graph JSON (nodes with neighbors & SIR fields)
OUT_GRAPH_JSON = "us_census_graph.json"

# 50 states + DC + PR (add territories if you want)
# Removing AK (02), HI (15), PR (72) to focus on contiguous US
STATE_FIPS = [
    "01", "04", "05", "06", "08", "09", "10", "11", "12", "13", "15", "16", "17", "18", "19", "20",
    "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37",
    "38", "39", "40", "41", "42", "44", "45", "46", "47", "48", "49", "50", "51", "53", "54", "55", "56"
]

# ----------------------------------------
# helpers
# ----------------------------------------
def download_cartographic_boundary():
    if os.path.exists(CB_ZIP_PATH):
        return
    print(f"Downloading {CB_ZIP_URL} ...")
    r = SESSION.get(CB_ZIP_URL, timeout=120, stream=True)
    r.raise_for_status()
    with open(CB_ZIP_PATH, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)
    print("Download complete.")

def extract_zip():
    with zipfile.ZipFile(CB_ZIP_PATH, 'r') as z:
        z.extractall("cb_2023_us_tract_500k")

def load_tracts() -> gpd.GeoDataFrame:
    shp_path = os.path.join("cb_2023_us_tract_500k", CB_SHP_BASENAME)
    gdf = gpd.read_file(shp_path)
    # Ensure expected fields: GEOID present in CB files
    assert "GEOID" in gdf.columns, "GEOID not found in shapefile."
    # Reproject to WGS84 for lon/lat output
    gdf = gdf.to_crs(4326)
    # Compute lon/lat via geometric centroids (ok for approx)
    gdf["lon"] = gdf.geometry.centroid.x
    gdf["lat"] = gdf.geometry.centroid.y
    # For area/density, use an equal-area CRS (World Cylindrical Equal Area EPSG:6933)
    equal_area = gdf.to_crs(6933)
    gdf["area_km2"] = equal_area.geometry.area / 1_000_000.0
    return gdf[["GEOID","lon","lat","area_km2","geometry"]]

def fetch_acs_data_for_state(state_fips: str) -> pd.DataFrame:
    """
    Returns a DataFrame with columns: GEOID, population, median_income
    Query: by county:* and tract:* within state
    """
    # Build URL manually to control repeated 'in' params
    query = f"{ACS_DATASET}?get=NAME,{ACS_POP_VAR},{ACS_INCOME_VAR}&for=tract:*&in=state:{state_fips}&in=county:*"
    if CENSUS_API_KEY:
        query += f"&key={CENSUS_API_KEY}"

    r = SESSION.get(query, timeout=60)
    r.raise_for_status()
    rows = r.json()
    header, data = rows[0], rows[1:]
    df = pd.DataFrame(data, columns=header)
    # GEOID = state(2) + county(3) + tract(6)
    df["GEOID"] = df["state"] + df["county"] + df["tract"]
    df["population"] = pd.to_numeric(df[ACS_POP_VAR], errors="coerce")
    df["median_income"] = pd.to_numeric(df[ACS_INCOME_VAR], errors="coerce")
    return df[["GEOID","population","median_income"]]

def fetch_acs_data_all_states() -> pd.DataFrame:
    frames = []
    for s in tqdm(STATE_FIPS, desc="ACS data (population + income)"):
        try:
            frames.append(fetch_acs_data_for_state(s))
        except Exception as e:
            print(f"[WARN] ACS fetch failed for state {s}: {e}")
    data = pd.concat(frames, ignore_index=True).drop_duplicates(subset=["GEOID"])
    return data

def build_queen_neighbors(gdf: gpd.GeoDataFrame) -> dict:
    """
    Build Queen contiguity neighbors: polygons sharing an edge OR a vertex.
    Returns dict GEOID -> [neighbor GEOIDs]
    """
    print("Building Queen contiguity (this can take a few minutes)...")
    W = Queen.from_dataframe(gdf.set_index("GEOID"))
    neighbors = {k: v for k, v in W.neighbors.items()}
    # keys are positional indices; map back to GEOIDs
    gdf_ordered = gdf.set_index("GEOID")
    index_map = {i: geoid for i, geoid in enumerate(gdf_ordered.index)}
    geoid_neighbors = {index_map[i]: [index_map[j] for j in nbrs] for i, nbrs in neighbors.items()}
    return geoid_neighbors

def find_largest_connected_component(nodes: list, neighbors: dict) -> set:
    """
    Finds the largest connected component in a graph.
    Returns a set of the GEOIDs in that component.
    """
    visited = set()
    components = []
    for node in nodes:
        if node not in visited:
            component = set()
            q = [node]
            visited.add(node)
            head = 0
            while head < len(q):
                curr = q[head]
                head += 1
                component.add(curr)
                for neighbor in neighbors.get(curr, []):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        q.append(neighbor)
            components.append(component)
    
    if not components:
        return set()

    # Return the largest component
    return max(components, key=len)

def main():
    download_cartographic_boundary()
    extract_zip()

    tracts = load_tracts()  # GEOID, lon, lat, area_km2, geometry

    acs_data = fetch_acs_data_all_states()  # GEOID, population, median_income
    g = tracts.merge(acs_data, on="GEOID", how="left")

    # compute density (pop per km^2). If missing pop, set to 0/NaN -> 0
    g["population"] = g["population"].fillna(0)
    g["median_income"] = g["median_income"].fillna(0)  # Fill missing income with 0
    g["density_per_km2"] = g["population"] / g["area_km2"].replace({0: pd.NA})
    g["density_per_km2"] = g["density_per_km2"].fillna(0)

    # neighbors
    neighbors = build_queen_neighbors(g[["GEOID","geometry"]].copy())

    # --- NEW: Filter to the largest connected component to remove islands ---
    print("Finding largest connected component to remove islands...")
    all_node_ids = list(g["GEOID"])
    largest_component_ids = find_largest_connected_component(all_node_ids, neighbors)
    
    # Filter the GeoDataFrame and neighbors dict
    g = g[g["GEOID"].isin(largest_component_ids)].copy()
    
    filtered_neighbors = {}
    for geoid, nbrs in neighbors.items():
        if geoid in largest_component_ids:
            # Keep only neighbors that are also in the main component
            filtered_neighbors[geoid] = [n for n in nbrs if n in largest_component_ids]
    
    neighbors = filtered_neighbors
    print(f"Filtered graph to {len(g)} nodes in the largest component.")
    # --- END NEW SECTION ---

    # write nodes table (kept for debug/inspection)
    g[["GEOID","lon","lat","population","area_km2","density_per_km2","median_income"]].to_csv(OUT_NODES_CSV, index=False)
    with open(OUT_NEIGHBORS_JSON, "w") as f:
        json.dump(neighbors, f)

    # ----- build Node objects and emit a single graph JSON -----
    print("Assembling Node graph JSON with geometry...")
    nodes = load_nodes_from_csv(OUT_NODES_CSV)
    attach_neighbors_from_json(nodes, OUT_NEIGHBORS_JSON)

    # Add geometry data to each node's extras field
    print("Adding polygon geometry to nodes...")
    geometry_count = 0
    for _, row in g.iterrows():
        geoid = row["GEOID"]
        if geoid in nodes:
            # Convert geometry to GeoJSON format and store in extras
            geometry_geojson = row["geometry"].__geo_interface__
            nodes[geoid].extras = nodes[geoid].extras or {}
            nodes[geoid].extras["geometry"] = geometry_geojson
            geometry_count += 1
    
    print(f"Added geometry to {geometry_count} nodes")

    serializable_graph = {geoid: node.to_dict() for geoid, node in nodes.items()}
    with open(OUT_GRAPH_JSON, "w") as f:
        json.dump(serializable_graph, f, indent=2)

    print(f"\nWrote {OUT_NODES_CSV}, {OUT_NEIGHBORS_JSON}, and {OUT_GRAPH_JSON}")
    print("Nodes JSON keys: id, lon, lat, population, area_km2, population_density, neighbors, compartments, params...")

if __name__ == "__main__":
    main()
