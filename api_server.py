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
simulation_speed_multiplier = 1.0  # Default 1x speed (1 second per day)

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
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        params = data.get('parameters', {})
        initial_infected_tile = data.get('initial_infected_tile')
        
        print(f"Starting simulation with params: {params}")
        print(f"Initial infected tile: {initial_infected_tile}")
        
        # Stop existing simulation if running
        if simulation_running:
            simulation_running = False
            if simulation_thread and simulation_thread.is_alive():
                simulation_thread.join(timeout=1)
        
        # Load nodes for simulation
        print("Loading graph data...")
        nodes = load_graph(NODES_CSV, NEIGHBORS_JSON)
        if not nodes:
            return jsonify({"error": "Failed to load simulation data - no nodes loaded"}), 500
            
        print(f"Loaded {len(nodes)} nodes for simulation")
        
        # Create new simulation with enhanced parameters
        current_simulation = Simulation(
            nodes=nodes,
            infection_rate=params.get('airborne', 0.05),
            recovery_rate=params.get('recovery_rate', 0.03),
            mortality_rate=params.get('mortality_rate', 0.005)
        )
        
        # Seed infection at specific location or randomly
        if initial_infected_tile and initial_infected_tile in nodes:
            # Seed at user-selected location with significant infection to make it visible
            seed_infection_at_specific_node(initial_infected_tile, 100)
            print(f"Seeded infection at specific tile: {initial_infected_tile}")
        else:
            # Random seeding as fallback
            current_simulation.seed_infection(num_nodes=5)
            print("Seeded infection randomly at 5 nodes")
        
        # Start simulation in background thread for real-time updates
        simulation_running = True
        simulation_thread = threading.Thread(target=run_simulation_background)
        simulation_thread.start()
        
        simulation_id = f"sim_{int(time.time())}"
        
        return jsonify({
            "id": simulation_id,
            "status": "running",
            "message": "Simulation started successfully",
            "initial_stats": get_current_simulation_stats()
        })
        
    except Exception as e:
        print(f"Error starting simulation: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to start simulation: {str(e)}"}), 500

def seed_infection_at_specific_node(node_id: str, initial_infected: int = 10):
    """Helper function to seed infection at a specific node."""
    global census_data
    
    if current_simulation and node_id in current_simulation.nodes:
        node = current_simulation.nodes[node_id]
        if node.susceptible_pop > 0:
            actual_infected = min(initial_infected, node.susceptible_pop)
            node.susceptible_pop -= actual_infected
            node.infectious_pop += actual_infected
            print(f"Seeded {actual_infected} infections in node {node_id} (population: {node.population})")
            
            # IMMEDIATELY update census_data so frontend sees the change
            if node_id in census_data:
                census_data[node_id]["susceptible_pop"] = node.susceptible_pop
                census_data[node_id]["infectious_pop"] = node.infectious_pop
                census_data[node_id]["recovered_pop"] = node.recovered_pop
                census_data[node_id]["deceased_pop"] = node.deceased_pop
                print(f"Updated census_data for {node_id}: infectious={node.infectious_pop}")
        else:
            print(f"Warning: Node {node_id} has no susceptible population")
    else:
        print(f"Warning: Node {node_id} not found in simulation")

def get_current_simulation_stats():
    """Get comprehensive simulation statistics."""
    if not current_simulation:
        return {}
        
    total_population = sum(node.population for node in current_simulation.nodes.values())
    total_susceptible = sum(node.susceptible_pop for node in current_simulation.nodes.values())
    total_infectious = sum(node.infectious_pop for node in current_simulation.nodes.values())
    total_recovered = sum(node.recovered_pop for node in current_simulation.nodes.values())
    total_deceased = sum(node.deceased_pop for node in current_simulation.nodes.values())
    
    # Count infected areas (nodes with any infections)
    infected_areas = sum(1 for node in current_simulation.nodes.values() if node.infectious_pop > 0)
    
    # Calculate rates
    infection_rate = (total_infectious / total_population * 100) if total_population > 0 else 0
    mortality_rate = (total_deceased / total_population * 100) if total_population > 0 else 0
    recovery_rate = (total_recovered / total_population * 100) if total_population > 0 else 0
    
    return {
        "day": current_simulation.day,
        "total_population": total_population,
        "susceptible": total_susceptible,
        "infectious": total_infectious,
        "recovered": total_recovered,
        "deceased": total_deceased,
        "infected_areas": infected_areas,
        "infection_rate": round(infection_rate, 4),
        "mortality_rate": round(mortality_rate, 4),
        "recovery_rate": round(recovery_rate, 4),
        "daily_new_infections": getattr(current_simulation, 'daily_new_infections', 0)
    }

def run_simulation_background():
    """Run complete simulation with periodic updates."""
    global simulation_running, census_data, simulation_speed_multiplier
    
    max_steps = 1000  # Maximum simulation steps
    update_interval = 10  # Update frontend every 10 steps
    step_count = 0
    
    try:
        while simulation_running and current_simulation and step_count < max_steps:
            # Run one simulation step
            current_simulation.step()
            step_count += 1
            
            # Add delay after every step to control simulation speed
            base_delay = 1.0  # 1 second base delay per simulation step
            actual_delay = base_delay / simulation_speed_multiplier
            time.sleep(actual_delay)
            
            # Update census data periodically for frontend visualization
            if step_count % update_interval == 0:
                for geoid, node in current_simulation.nodes.items():
                    if geoid in census_data:
                        census_data[geoid]["susceptible_pop"] = node.susceptible_pop
                        census_data[geoid]["infectious_pop"] = node.infectious_pop
                        census_data[geoid]["recovered_pop"] = node.recovered_pop
                        census_data[geoid]["deceased_pop"] = node.deceased_pop
                        census_data[geoid]["is_quarantined"] = node.is_quarantined
            
            # Check if simulation has naturally ended (no more infections)
            total_infectious = sum(node.infectious_pop for node in current_simulation.nodes.values())
            if total_infectious == 0:
                print(f"Simulation ended naturally at step {step_count} - no more infections")
                break
                
        # Simulation completed or ended
        print(f"Simulation finished after {step_count} steps")
        simulation_running = False
        
    except Exception as e:
        print(f"Simulation error: {e}")
        simulation_running = False

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
    infected_count = 0
    
    # Convert current census data to tile format - check all tracts for infections
    for geoid, node in census_data.items():
        if node["infectious_pop"] > 0:
            infected_count += 1
            print(f"Found infected tract: {geoid} with {node['infectious_pop']} infections")
            
        tiles.append({
            "geoid": geoid,
            "total_population": node["population"],
            "amount_infected": node["infectious_pop"],
            "amount_deceased": node["deceased_pop"],
            "coordinates": [node["lon"], node["lat"]]
        })
    
    print(f"Returning {len(tiles)} tiles, {infected_count} infected")
    
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
    if current_simulation:
        # Use current simulation data for real-time stats
        stats = get_current_simulation_stats()
        return jsonify(stats)
    else:
        # Use census data if no simulation is running
        total_population = sum(node.get("population", 0) for node in census_data.values())
        total_susceptible = sum(node.get("susceptible_pop", 0) for node in census_data.values())
        total_infectious = sum(node.get("infectious_pop", 0) for node in census_data.values())
        total_recovered = sum(node.get("recovered_pop", 0) for node in census_data.values())
        total_deceased = sum(node.get("deceased_pop", 0) for node in census_data.values())
        quarantined_areas = sum(1 for node in census_data.values() if node.get("is_quarantined", False))
        
        return jsonify({
            "day": 0,
            "total_population": total_population,
            "susceptible": total_susceptible,
            "infectious": total_infectious,
            "recovered": total_recovered,
            "deceased": total_deceased,
            "infected_areas": quarantined_areas,
            "infection_rate": (total_infectious / total_population * 100) if total_population > 0 else 0,
            "total_tracts": len(census_data)
        })

@app.route('/api/simulation/speed', methods=['POST'])
def set_simulation_speed():
    """Set simulation speed multiplier."""
    global simulation_speed_multiplier
    
    try:
        data = request.get_json()
        if not data or 'speed' not in data:
            return jsonify({"error": "Speed multiplier required"}), 400
            
        speed = float(data['speed'])
        if speed <= 0 or speed > 10:  # Reasonable limits
            return jsonify({"error": "Speed must be between 0.1 and 10"}), 400
            
        simulation_speed_multiplier = speed
        return jsonify({
            "message": f"Simulation speed set to {speed}x",
            "speed": simulation_speed_multiplier
        })
        
    except (ValueError, TypeError) as e:
        return jsonify({"error": "Invalid speed value"}), 400
    except Exception as e:
        print(f"Error setting simulation speed: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/simulation/speed', methods=['GET'])
def get_simulation_speed():
    """Get current simulation speed multiplier."""
    return jsonify({"speed": simulation_speed_multiplier})

if __name__ == '__main__':
    print("Starting Cura Pandemic Simulation API Server...")
    print(f"Loaded {len(census_data)} census tracts")
    print("Server starting on http://localhost:8001")
    
    app.run(
        host='0.0.0.0',
        port=8001,
        debug=True,
        threaded=True
    )