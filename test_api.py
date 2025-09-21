#!/usr/bin/env python3
"""
Minimal API server to test simulation functionality
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import traceback
import json
from sim.core.entities import load_graph
from sim.core.simulation import Simulation

app = Flask(__name__)
CORS(app)

# Global simulation state
current_simulation = None

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "message": "API server is running"})

@app.route('/api/simulation/start', methods=['POST'])
def start_simulation():
    global current_simulation
    
    try:
        data = request.get_json()
        print(f"Received data: {data}")
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        params = data.get('parameters', {})
        initial_infected_tile = data.get('initial_infected_tile')
        
        print(f"Starting simulation with params: {params}")
        print(f"Initial infected tile: {initial_infected_tile}")
        
        # Load nodes for simulation
        print("Loading graph data...")
        nodes = load_graph("tract_nodes.csv", "tract_neighbors.json")
        print(f"Loaded {len(nodes)} nodes for simulation")
        
        # Create new simulation
        current_simulation = Simulation(
            nodes=nodes,
            infection_rate=params.get('airborne', 0.05),
            recovery_rate=params.get('recovery_rate', 0.03),
            mortality_rate=params.get('mortality_rate', 0.005)
        )
        print("Simulation created successfully")
        
        # Seed infection
        if initial_infected_tile and initial_infected_tile in nodes:
            # Find the node and infect it
            node = current_simulation.nodes[initial_infected_tile]
            if node.susceptible_pop > 0:
                actual_infected = min(10, node.susceptible_pop)
                node.susceptible_pop -= actual_infected
                node.infectious_pop += actual_infected
                print(f"Seeded {actual_infected} infections in node {initial_infected_tile}")
            else:
                print(f"Warning: Node {initial_infected_tile} has no susceptible population")
        else:
            current_simulation.seed_infection(num_nodes=5)
            print("Seeded infection randomly at 5 nodes")
        
        # Run a few simulation steps for testing
        for i in range(5):
            current_simulation.step()
            print(f"Completed step {i+1}")
        
        # Get statistics
        stats = get_simulation_stats()
        
        return jsonify({
            "id": "test_sim_123",
            "status": "completed",
            "message": "Simulation completed successfully",
            "stats": stats
        })
        
    except Exception as e:
        print(f"Error starting simulation: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to start simulation: {str(e)}"}), 500

def get_simulation_stats():
    """Get comprehensive simulation statistics."""
    if not current_simulation:
        return {}
        
    total_population = sum(node.population for node in current_simulation.nodes.values())
    total_susceptible = sum(node.susceptible_pop for node in current_simulation.nodes.values())
    total_infectious = sum(node.infectious_pop for node in current_simulation.nodes.values())
    total_recovered = sum(node.recovered_pop for node in current_simulation.nodes.values())
    total_deceased = sum(node.deceased_pop for node in current_simulation.nodes.values())
    
    # Count infected areas
    infected_areas = sum(1 for node in current_simulation.nodes.values() if node.infectious_pop > 0)
    
    return {
        "day": current_simulation.day,
        "total_population": total_population,
        "susceptible": total_susceptible,
        "infectious": total_infectious,
        "recovered": total_recovered,
        "deceased": total_deceased,
        "infected_areas": infected_areas,
        "infection_rate": (total_infectious / total_population * 100) if total_population > 0 else 0,
    }

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get current simulation statistics."""
    return jsonify(get_simulation_stats())

if __name__ == '__main__':
    print("Starting minimal test API server...")
    app.run(host='0.0.0.0', port=8003, debug=True)