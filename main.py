import matplotlib.pyplot as plt
import matplotlib.animation as animation
from sim.core.entities import load_graph
from sim.core.simulation import Simulation
import numpy as np

# --- Config ---
NODES_CSV = "tract_nodes.csv"
NEIGHBORS_JSON = "tract_neighbors.json"
SIM_DAYS = 180
INFECTION_RATE = 0.05  # Lowered for more gradual spread
RECOVERY_RATE = 0.03
MORTALITY_RATE = 0.005
SEED_NODES = 5

def run_simulation():
    """Main function to run and visualize the pandemic simulation."""
    # 1. Load graph data
    print("Loading graph data...")
    nodes = load_graph(NODES_CSV, NEIGHBORS_JSON)
    if not nodes:
        print(f"Error: Failed to load graph data from {NODES_CSV} and {NEIGHBORS_JSON}.")
        print("Please run the 'sim/scripts/load_data.py' script first to generate these files.")
        return

    # 2. Initialize Simulation
    sim = Simulation(
        nodes=nodes,
        infection_rate=INFECTION_RATE,
        recovery_rate=RECOVERY_RATE,
        mortality_rate=MORTALITY_RATE,
    )
    sim.seed_infection(num_nodes=SEED_NODES)
    print(f"Seeded infection in {SEED_NODES} nodes.")

    # 3. Setup Visualization
    fig, ax = plt.subplots(figsize=(12, 8))
    plt.style.use('dark_background')

    # Extract node positions and initial colors
    node_ids = list(nodes.keys())
    positions = np.array([[-nodes[nid].lon, nodes[nid].lat] for nid in node_ids]) # -lon for correct map orientation
    
    scatter = ax.scatter(positions[:, 0], positions[:, 1], s=5, c='blue')
    title = ax.set_title(f"Day: 0 | Preparing...", fontsize=14)

    def update(frame):
        """Animation update function called for each frame (day)."""
        # Run one simulation step
        sim.step()

        # Update node colors based on infection status
        colors = ['red'if sim.nodes[nid].infectious_pop > 0 else 'blue' for nid in node_ids]
        scatter.set_color(colors)

        # Update title with simulation stats
        stats = sim.get_total_population()
        title.set_text(
            f"Day: {sim.day} | Infected: {stats['infectious']:,} | Recovered: {stats['recovered']:,} | Deceased: {stats['deceased']:,}"
        )
        # No return needed when blit=False

    # 4. Run Animation
    ani = animation.FuncAnimation(fig, update, frames=SIM_DAYS, blit=False, interval=50, repeat=False)
    
    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")
    fig.suptitle("Pandemic Simulation", fontsize=16, y=0.95)
    
    plt.show()

if __name__ == "__main__":
    run_simulation()
