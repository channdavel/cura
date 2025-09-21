# sim/core/entities.py

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional
import csv
import json

@dataclass
class Node:
    """
    Pandemic-simulation node representing a single Census tract.

    Designed to match the outputs of the data fetching script:
      - tract_nodes.csv: GEOID, lon, lat, population, area_km2, density_per_km2
      - tract_neighbors.json: { GEOID: [neighbor GEOIDs] }

    Geometry polygons are NOT required here; adjacency comes from precomputed neighbors.
    """
    # ---- Core identifiers / position ----
    id: str
    lon: float
    lat: float

    # ---- Real-world properties ----
    population: int
    area_km2: float
    population_density: float  # people per km^2
    median_income: float = 0.0  # median household income in dollars

    # ---- Graph / topology ----
    neighbors: List[str] = field(default_factory=list)

    # ---- SIR compartments ----
    susceptible_pop: int = 0
    infectious_pop: int = 0
    recovered_pop: int = 0
    deceased_pop: int = 0

    # ---- Tunable model parameters ----
    mobility_factor: float = 1.0          # relative mobility (edge weight scaler)
    climate_factor: float = 1.0           # transmission modifier
    healthcare_capacity: int = 0          # e.g., beds; default set from population below

    # ---- Flags / state ----
    is_quarantined: bool = False

    # ---- Optional extras (extensible bag for future features) ----
    extras: Optional[Dict] = field(default_factory=dict)

    # -------- Constructors --------

    @classmethod
    def from_csv_row(cls, row: Dict[str, str]) -> "Node":
        """
        Build a Node from a CSV row produced by tract_nodes.csv.
        Expected keys: GEOID, lon, lat, population, area_km2, density_per_km2, median_income
        """
        geoid = row["GEOID"]
        lon = float(row["lon"])
        lat = float(row["lat"])
        population = int(float(row["population"]))  # handles "123.0"
        area_km2 = float(row["area_km2"])
        density = float(row["density_per_km2"])
        median_income = float(row.get("median_income", 0))  # Default to 0 if missing

        node = cls(
            id=geoid,
            lon=lon,
            lat=lat,
            population=population,
            area_km2=area_km2,
            population_density=density,
            median_income=median_income,
        )
        # Initialize compartments and healthcare capacity
        node.susceptible_pop = population
        node.healthcare_capacity = max(1, int(round(population * 0.001)))  # ~1 bed per 1,000 people
        return node

    # -------- Utilities --------

    def to_dict(self) -> Dict:
        """
        JSON-serializable dict compatible with your previous graph dump.
        """
        d = asdict(self)
        # Keep key names aligned with earlier expectations, if any
        d["population_density"] = self.population_density
        return d

    def set_neighbors(self, neighbor_ids: List[str]) -> None:
        self.neighbors = list(dict.fromkeys(n for n in neighbor_ids if n != self.id))  # dedupe, drop self

    # Optional: handy degree getter
    @property
    def degree(self) -> int:
        return len(self.neighbors)

    # Optional: quick distance (Haversine) if you ever need proximity heuristics
    def distance_km_to(self, other: "Node") -> float:
        R = 6371.0
        from math import radians, sin, cos, asin, sqrt
        lat1, lon1, lat2, lon2 = map(radians, [self.lat, self.lon, other.lat, other.lon])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
        return 2 * R * asin(min(1.0, sqrt(a)))


# -------- Graph assembly helpers (plug-and-play with your fetcher outputs) --------

def load_nodes_from_csv(nodes_csv_path: str) -> Dict[str, Node]:
    """
    Load all nodes from tract_nodes.csv and return a dict { GEOID: Node }.
    """
    nodes: Dict[str, Node] = {}
    with open(nodes_csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            node = Node.from_csv_row(row)
            nodes[node.id] = node
    return nodes


def attach_neighbors_from_json(nodes: Dict[str, Node], neighbors_json_path: str) -> None:
    """
    Attach neighbor lists from tract_neighbors.json into existing Node objects.
    """
    with open(neighbors_json_path, "r") as f:
        nbrs = json.load(f)
    for geoid, adj in nbrs.items():
        if geoid in nodes:
            nodes[geoid].set_neighbors(adj)


def load_graph(nodes_csv_path: str, neighbors_json_path: str) -> Dict[str, Node]:
    """
    Convenience one-liner: load nodes and neighbors together.
    Usage:
        nodes = load_graph("tract_nodes.csv", "tract_neighbors.json")
    """
    nodes = load_nodes_from_csv(nodes_csv_path)
    attach_neighbors_from_json(nodes, neighbors_json_path)
    return nodes