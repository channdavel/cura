import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.gridspec import GridSpec
from sim.core.entities import load_graph
from sim.core.simulation import Simulation
import numpy as np

# --- Config ---
NODES_CSV = "tract_nodes.csv"
NEIGHBORS_JSON = "tract_neighbors.json"
SIM_DAYS = 360
INFECTION_RATE = 0.1
RECOVERY_RATE = 0.01
MORTALITY_RATE = 0.005
SEED_NODES = 1

def run_simulation():
    """Main function to run and visualize the pandemic simulation."""
    # 1. Load graph data
    print("Loading graph data...")
    nodes = load_graph(NODES_CSV, NEIGHBORS_JSON)
    if not nodes:
        print(f"Error: Failed to load graph data from {NODES_CSV} and {NEIGHBORS_JSON}.")
        print("Please run the 'sim/scripts/load_data.py' script first to generate these files.")
        return

    total_population = sum(node.population for node in nodes.values())

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
    plt.style.use('dark_background')
    fig = plt.figure(figsize=(15, 10))
    gs = GridSpec(2, 2, height_ratios=[3, 1])

    ax_map = fig.add_subplot(gs[0, :])
    ax_total_infected = fig.add_subplot(gs[1, 0])
    ax_new_infected = fig.add_subplot(gs[1, 1])

    # Extract node positions and initial colors
    node_ids = list(nodes.keys())
    positions = np.array([[-nodes[nid].lon, nodes[nid].lat] for nid in node_ids]) # -lon for correct map orientation
    
    scatter = ax_map.scatter(positions[:, 0], positions[:, 1], s=5, c='blue')
    title = ax_map.set_title(f"Day: 0 | Preparing...", fontsize=14)
    ax_map.set_xlabel("Longitude")
    ax_map.set_ylabel("Latitude")

    # --- Setup for line graphs ---
    history_days = []
    history_total_infected = []
    history_new_infections = []

    # Total Infected Plot
    line_total, = ax_total_infected.plot([], [], lw=2, color='cyan')
    ax_total_infected.set_title("Total Infected Over Time")
    ax_total_infected.set_xlim(0, SIM_DAYS)
    ax_total_infected.set_ylim(0, total_population * 0.1) # Start with 10% of pop
    ax_total_infected.set_xlabel("Day")
    ax_total_infected.set_ylabel("People")
    ax_total_infected.grid(True, linestyle='--', alpha=0.5)

    # New Infections Plot
    line_new, = ax_new_infected.plot([], [], lw=2, color='magenta')
    ax_new_infected.set_title("New Infections Per Day")
    ax_new_infected.set_xlim(0, SIM_DAYS)
    ax_new_infected.set_ylim(0, 1000) # Start with an arbitrary limit
    ax_new_infected.set_xlabel("Day")
    ax_new_infected.set_ylabel("People")
    ax_new_infected.grid(True, linestyle='--', alpha=0.5)

    fig.suptitle("Pandemic Simulation", fontsize=16, y=0.98)
    plt.tight_layout(rect=[0, 0, 1, 0.96])


    def update(frame):
        """Animation update function called for each frame (day)."""
        # Run one simulation step
        sim.step()
        
        # --- Update Line Graphs ---
        stats_after = sim.get_total_population()
        current_total_infected = stats_after['infectious']
        
        # Calculate new infections for the day
        last_total_infected = history_total_infected[-1] if history_total_infected else 0
        new_infections_today = current_total_infected - last_total_infected
        new_infections_today = max(0, new_infections_today)


        history_days.append(sim.day)
        history_total_infected.append(current_total_infected)
        history_new_infections.append(new_infections_today)

        # Update total infected plot
        line_total.set_data(history_days, history_total_infected)
        # Dynamically adjust y-axis
        if current_total_infected > ax_total_infected.get_ylim()[1]:
            ax_total_infected.set_ylim(0, current_total_infected * 1.2)

        # Update new infections plot
        line_new.set_data(history_days, history_new_infections)
        if new_infections_today > ax_new_infected.get_ylim()[1]:
            ax_new_infected.set_ylim(0, new_infections_today * 1.2)

        # --- Update Map and Title ---
        colors = ['red' if sim.nodes[nid].infectious_pop > 0 else 'blue' for nid in node_ids]
        scatter.set_color(colors)

        infected_nodes_count = sum(1 for node in sim.nodes.values() if node.infectious_pop > 0)
        title.set_text(
            f"Day: {sim.day} | Infected Nodes: {infected_nodes_count:,} | Total Infected: {stats_after['infectious']:,} | Recovered: {stats_after['recovered']:,} | Deceased: {stats_after['deceased']:,}"
        )

        # No return needed when blit=False

    # 4. Run Animation
    ani = animation.FuncAnimation(fig, update, frames=SIM_DAYS, blit=False, interval=1, repeat=False)
    
    plt.show()

if __name__ == "__main__":
    run_simulation()

