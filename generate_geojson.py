#!/usr/bin/env python3
"""
Generate GeoJSON with census tract boundaries for continuous map visualization.
This script creates a GeoJSON file that includes polygon geometries for mapping.
"""

import os
import json
import geopandas as gpd
import pandas as pd
from pathlib import Path

def generate_tract_geojson():
    """Generate GeoJSON with tract boundaries and simulation data."""
    
    # Check if the shapefile exists
    shp_dir = "cb_2023_us_tract_500k"
    shp_file = os.path.join(shp_dir, "cb_2023_us_tract_500k.shp")
    
    if not os.path.exists(shp_file):
        print(f"Shapefile not found at {shp_file}")
        print("Please run the main data loading script first to download census boundaries.")
        return None
    
    print("Loading census tract shapefile...")
    
    # Load the shapefile with geometries
    gdf = gpd.read_file(shp_file)
    
    # Ensure WGS84 projection for web mapping
    gdf = gdf.to_crs(4326)
    
    # Load the existing simulation data
    graph_file = "us_census_graph.json"
    if os.path.exists(graph_file):
        print("Loading simulation data...")
        with open(graph_file, 'r') as f:
            simulation_data = json.load(f)
    else:
        print("No simulation data found, using default values")
        simulation_data = {}
    
    # Create features list for GeoJSON
    features = []
    
    print(f"Processing {len(gdf)} census tracts...")
    
    for _, row in gdf.iterrows():
        geoid = row['GEOID']
        
        # Get simulation data for this tract
        sim_data = simulation_data.get(geoid, {})
        
        # Create feature with geometry and properties
        feature = {
            "type": "Feature",
            "properties": {
                "geoid": geoid,
                "population": sim_data.get("population", 0),
                "population_density": sim_data.get("population_density", 0),
                "area_km2": sim_data.get("area_km2", 0),
                "susceptible_pop": sim_data.get("susceptible_pop", sim_data.get("population", 0)),
                "infectious_pop": sim_data.get("infectious_pop", 0),
                "recovered_pop": sim_data.get("recovered_pop", 0),
                "deceased_pop": sim_data.get("deceased_pop", 0),
                "healthcare_capacity": sim_data.get("healthcare_capacity", 0),
                "is_quarantined": sim_data.get("is_quarantined", False),
                "mobility_factor": sim_data.get("mobility_factor", 1.0),
                "climate_factor": sim_data.get("climate_factor", 1.0),
                "neighbors": sim_data.get("neighbors", [])
            },
            "geometry": row['geometry'].__geo_interface__
        }
        
        features.append(feature)
        
        # Limit for performance testing (remove this for full dataset)
        if len(features) >= 5000:
            print(f"Limited to first {len(features)} tracts for performance")
            break
    
    # Create GeoJSON structure
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    # Save GeoJSON file
    output_file = "us_census_tracts.geojson"
    print(f"Saving GeoJSON to {output_file}...")
    
    with open(output_file, 'w') as f:
        json.dump(geojson, f, indent=2)
    
    print(f"Generated GeoJSON with {len(features)} census tracts")
    print(f"File size: {os.path.getsize(output_file) / 1024 / 1024:.1f} MB")
    
    return output_file

if __name__ == "__main__":
    generate_tract_geojson()