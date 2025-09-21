#!/usr/bin/env python3
"""
Test script to reproduce the 500 error in simulation start.
"""

import sys
import traceback
from sim.core.entities import load_graph
from sim.core.simulation import Simulation

def test_simulation():
    try:
        print("Loading graph data...")
        nodes = load_graph("tract_nodes.csv", "tract_neighbors.json")
        print(f"Loaded {len(nodes)} nodes")
        
        print("Creating simulation...")
        simulation = Simulation(
            nodes=nodes,
            infection_rate=0.05,
            recovery_rate=0.03,
            mortality_rate=0.005
        )
        print("Simulation created successfully")
        
        print("Seeding infection...")
        simulation.seed_infection(num_nodes=1)
        print("Infection seeded successfully")
        
        print("Running one step...")
        simulation.step()
        print("Step completed successfully")
        
        print("Test completed successfully!")
        
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        print("Full traceback:")
        traceback.print_exc()

if __name__ == "__main__":
    test_simulation()