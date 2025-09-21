#!/usr/bin/env python3
"""
Generate US Census Graph JSON with polygon geometry data included.
This modifies the existing us_census_graph.json to include actual polygon boundaries.
"""

import json
import os
import geopandas as gpd
from pathlib import Path

def load_existing_graph():
    """Load the existing census graph data."""
    try:
        with open('us_census_graph.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("us_census_graph.json not found. Please run the data loading script first.")
        return {}

def load_tract_geometries():
    """Load census tract geometries from the shapefile."""
    shp_path = os.path.join("cb_2023_us_tract_500k", "cb_2023_us_tract_500k.shp")
    
    if not os.path.exists(shp_path):
        print(f"Shapefile not found at {shp_path}")
        print("Please run the data loading script first to download the shapefile.")
        return None
    
    print("Loading census tract geometries...")
    gdf = gpd.read_file(shp_path)
    
    # Ensure WGS84 projection for web mapping
    gdf = gdf.to_crs(4326)
    
    # Create a dict mapping GEOID to geometry
    geometries = {}
    for _, row in gdf.iterrows():
        geoid = row['GEOID']
        # Convert geometry to GeoJSON format
        geometry = row['geometry'].__geo_interface__
        geometries[geoid] = geometry
    
    print(f"Loaded geometries for {len(geometries)} census tracts")
    return geometries

def main():
    # Load existing graph data
    graph_data = load_existing_graph()
    if not graph_data:
        return
    
    # Load geometries
    geometries = load_tract_geometries()
    if not geometries:
        return
    
    # Add geometries to the graph data
    updated_count = 0
    for geoid, node_data in graph_data.items():
        if geoid in geometries:
            # Add geometry to the extras field
            if 'extras' not in node_data:
                node_data['extras'] = {}
            node_data['extras']['geometry'] = geometries[geoid]
            updated_count += 1
    
    # Write the updated graph data
    output_file = 'us_census_graph_with_geometry.json'
    with open(output_file, 'w') as f:
        json.dump(graph_data, f, indent=2)
    
    print(f"Updated {updated_count} nodes with geometry data")
    print(f"Wrote updated graph to {output_file}")
    
    # Also create a smaller sample for testing (first 10k nodes)
    sample_data = {}
    for i, (geoid, node_data) in enumerate(graph_data.items()):
        if i >= 10000:
            break
        sample_data[geoid] = node_data
    
    sample_file = 'us_census_graph_sample_10k.json'
    with open(sample_file, 'w') as f:
        json.dump(sample_data, f, indent=2)
    
    print(f"Also created sample with {len(sample_data)} nodes: {sample_file}")

if __name__ == "__main__":
    main()