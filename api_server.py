"""
Cura Pandemic Simulation API Server

This server provides REST API endpoints for the pandemic simulation frontend.
It serves census tract data, runs simulations, and provides real-time updates.
"""

import os
import json
import time
import threading
from typing import Dict, List, Optional, Any
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from sim.core.entities import load_graph
from sim.core.simulation import Simulation

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Global variables for simulation state
current_simulation: Optional[Simulation] = None
simulation_thread: Optional[threading.Thread] = None
simulation_running = False
simulation_data = {}

# Data file paths
NODES_CSV = "tract_nodes.csv"
NEIGHBORS_JSON = "tract_neighbors.json"
GRAPH_JSON = "us_census_graph.json"

def load_census_data():
    """Load census tract data from JSON file."""
    try:
        with open(GRAPH_JSON, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Census data file {GRAPH_JSON} not found. Please run the data loading script first.")
        return {}
    except Exception as e:
        print(f"Error loading census data: {e}")
        return {}

# Load census data on startup
census_data = load_census_data()
print(f"Loaded {len(census_data)} census tracts")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "census_tracts_loaded": len(census_data)
    })

@app.route('/api/census-data', methods=['GET'])
def get_census_data():
    """Get census tract data."""
    # Optionally limit the number of tracts for performance
    limit = request.args.get('limit', type=int)
    
    if limit:
        limited_data = dict(list(census_data.items())[:limit])
        return jsonify(limited_data)
    
    return jsonify(census_data)

@app.route('/api/census-data/<geoid>', methods=['GET'])
def get_census_tract(geoid: str):
    """Get data for a specific census tract."""
    if geoid not in census_data:
        return jsonify({"error": "Census tract not found"}), 404
    
    return jsonify(census_data[geoid])

@app.route('/api/tiles', methods=['GET'])
def get_tiles():
    """Get tile data for the frontend (legacy endpoint)."""
    # Convert census data to tile format for compatibility
    tiles = []
    
    # Use a subset for performance
    for geoid, node in list(census_data.items())[:1000]:
        tiles.append({
            "geoid": geoid,
            "total_population": node["population"],
            "amount_infected": node["infectious_pop"],
            "amount_deceased": node["deceased_pop"],
            "coordinates": [node["lon"], node["lat"]]
        })
    
    return jsonify(tiles)

@app.route('/api/simulation/start', methods=['POST'])
def start_simulation():
    """Start a new pandemic simulation."""
    global current_simulation, simulation_thread, simulation_running
    
    data = request.get_json()
    params = data.get('parameters', {})
    initial_infected_tile = data.get('initial_infected_tile')
    
    # Stop existing simulation if running
    if simulation_running:
        simulation_running = False
        if simulation_thread and simulation_thread.is_alive():
            simulation_thread.join(timeout=1)
    
    try:
        # Load nodes for simulation
        nodes = load_graph(NODES_CSV, NEIGHBORS_JSON)
        if not nodes:
            return jsonify({"error": "Failed to load simulation data"}), 500
        
        # Create new simulation
        current_simulation = Simulation(
            nodes=nodes,
            infection_rate=params.get('airborne', 0.05),
            recovery_rate=0.03,
            mortality_rate=0.005
        )
        
        # Seed infection
        if initial_infected_tile and initial_infected_tile in nodes:
            nodes[initial_infected_tile].infectious_pop = 10
            nodes[initial_infected_tile].susceptible_pop -= 10
        else:
            current_simulation.seed_infection(num_nodes=5)
        
        # Start simulation in background thread
        simulation_running = True
        simulation_thread = threading.Thread(target=run_simulation_background)
        simulation_thread.start()
        
        simulation_id = f"sim_{int(time.time())}"
        
        return jsonify({
            "id": simulation_id,
            "status": "running",
            "message": "Simulation started successfully"
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to start simulation: {str(e)}"}), 500

def run_simulation_background():
    """Run simulation in background thread."""
    global simulation_running, census_data
    
    while simulation_running and current_simulation:
        try:
            # Run one simulation step
            current_simulation.step()
            
            # Update census data with new values
            for geoid, node in current_simulation.nodes.items():
                if geoid in census_data:
                    census_data[geoid].update({
                        "susceptible_pop": node.susceptible_pop,
                        "infectious_pop": node.infectious_pop,
                        "recovered_pop": node.recovered_pop,
                        "deceased_pop": node.deceased_pop,
                        "is_quarantined": node.is_quarantined
                    })
            
            # Sleep to control simulation speed
            time.sleep(0.1)  # 100ms between steps
            
        except Exception as e:
            print(f"Simulation error: {e}")
            simulation_running = False
            break

@app.route('/api/simulation/<simulation_id>/stop', methods=['POST'])
def stop_simulation(simulation_id: str):
    """Stop a running simulation."""
    global simulation_running
    
    simulation_running = False
    
    return jsonify({
        "id": simulation_id,
        "status": "stopped",
        "message": "Simulation stopped successfully"
    })

@app.route('/api/simulation/<simulation_id>/state', methods=['GET'])
def get_simulation_state(simulation_id: str):
    """Get current simulation state."""
    tiles = []
    
    # Convert current census data to tile format
    for geoid, node in list(census_data.items())[:1000]:
        tiles.append({
            "geoid": geoid,
            "total_population": node["population"],
            "amount_infected": node["infectious_pop"],
            "amount_deceased": node["deceased_pop"],
            "coordinates": [node["lon"], node["lat"]]
        })
    
    return jsonify({
        "id": simulation_id,
        "status": "running" if simulation_running else "stopped",
        "tiles": tiles
    })

@app.route('/api/simulation/<simulation_id>/reset', methods=['POST'])
def reset_simulation(simulation_id: str):
    """Reset simulation to initial state."""
    global simulation_running, census_data
    
    # Stop simulation
    simulation_running = False
    
    # Reload initial census data
    census_data = load_census_data()
    
    return jsonify({
        "id": simulation_id,
        "status": "reset",
        "message": "Simulation reset to initial state"
    })

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get overall simulation statistics."""
    total_population = sum(node.get("population", 0) for node in census_data.values())
    total_susceptible = sum(node.get("susceptible_pop", 0) for node in census_data.values())
    total_infectious = sum(node.get("infectious_pop", 0) for node in census_data.values())
    total_recovered = sum(node.get("recovered_pop", 0) for node in census_data.values())
    total_deceased = sum(node.get("deceased_pop", 0) for node in census_data.values())
    quarantined_areas = sum(1 for node in census_data.values() if node.get("is_quarantined", False))
    
    return jsonify({
        "total_population": total_population,
        "susceptible": total_susceptible,
        "infectious": total_infectious,
        "recovered": total_recovered,
        "deceased": total_deceased,
        "quarantined_areas": quarantined_areas,
        "infection_rate": (total_infectious / total_population * 100) if total_population > 0 else 0,
        "total_tracts": len(census_data)
    })

if __name__ == '__main__':
    print("Starting Cura Pandemic Simulation API Server...")
    print(f"Loaded {len(census_data)} census tracts")
    print("Server starting on http://localhost:8000")
    
    app.run(
        host='0.0.0.0',
        port=8000,
        debug=True,
        threaded=True
    )