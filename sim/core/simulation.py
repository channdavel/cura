import random
from typing import Dict, List
from sim.core.entities import Node

class Simulation:
    def __init__(self, nodes: Dict[str, Node], infection_rate: float, recovery_rate: float, mortality_rate: float):
        self.nodes = nodes
        self.infection_rate = infection_rate
        self.recovery_rate = recovery_rate
        self.mortality_rate = mortality_rate
        self.day = 0

    def seed_infection(self, num_nodes: int = 1):
        """Randomly infects a number of nodes to start the simulation."""
        infected_nodes = random.sample(list(self.nodes.keys()), num_nodes)
        for node_id in infected_nodes:
            node = self.nodes[node_id]
            node.susceptible_pop -= 1
            node.infectious_pop += 1

    def step(self):
        """
        Advances the simulation by one day based on a two-level infection model.
        1. Intra-node spread: Exponential growth within a node, scaled by density.
        2. Inter-node spread: Probabilistic spread to neighbors based on infection pressure.
        """
        # Store changes to apply at the end of the step to avoid cascading effects
        newly_infected_counts = {node_id: 0 for node_id in self.nodes}
        newly_recovered_counts = {node_id: 0 for node_id in self.nodes}
        newly_deceased_counts = {node_id: 0 for node_id in self.nodes}

        for node_id, node in self.nodes.items():
            if node.infectious_pop == 0:
                continue

            # --- 1. Intra-node spread (within the tract) ---
            # Growth factor is influenced by density.
            # A simple approach: scale density to be a multiplier.
            density_factor = (node.population_density / 1000) + 1 # Simple scaling

            # Calculate potential new infections within this node based on SIR model
            potential_intra_node_infections = (
                self.infection_rate * density_factor *
                node.susceptible_pop * node.infectious_pop
            ) / node.population if node.population > 0 else 0
            
            # --- FIX: Ensure infection grows from a single case ---
            # If there's any potential, infect at least one person, otherwise use the calculated value.
            if 0 < potential_intra_node_infections < 1:
                new_intra_node_infections = 1
            else:
                new_intra_node_infections = int(round(potential_intra_node_infections))
            
            new_intra_node_infections = min(node.susceptible_pop, new_intra_node_infections)
            if new_intra_node_infections > 0:
                newly_infected_counts[node_id] += new_intra_node_infections

            # --- 2. Inter-node spread (to neighbors) ---
            # Infection pressure is the percentage of the node's population that is infectious
            infection_pressure = node.infectious_pop / node.population if node.population > 0 else 0
            
            # Attempt to infect each neighbor
            for neighbor_id in node.neighbors:
                neighbor_node = self.nodes.get(neighbor_id)
                if neighbor_node and neighbor_node.susceptible_pop > 0:
                    # The chance of spread is proportional to the source's infection pressure
                    if random.random() < infection_pressure:
                        # If successful, infect a small number of people in the neighbor node,
                        # proportional to the source's pressure.
                        # Let's say up to 5 people can be infected this way per event.
                        new_infections_in_neighbor = max(1, int(round(infection_pressure * 5)))
                        newly_infected_counts[neighbor_id] += new_infections_in_neighbor

            # --- SIR model: Recoveries and Deaths ---
            new_recoveries = int(round(node.infectious_pop * self.recovery_rate))
            new_deaths = int(round(node.infectious_pop * self.mortality_rate))
            
            # Ensure we don't recover/decease more people than are infectious
            new_recoveries = min(node.infectious_pop, new_recoveries)
            new_deaths = min(node.infectious_pop - new_recoveries, new_deaths)

            newly_recovered_counts[node_id] = new_recoveries
            newly_deceased_counts[node_id] = new_deaths

        # --- 3. Apply all calculated changes simultaneously ---
        for node_id, node in self.nodes.items():
            # Clamp new infections to the available susceptible population
            total_new_infections = min(node.susceptible_pop, newly_infected_counts[node_id])
            
            node.susceptible_pop -= total_new_infections
            node.infectious_pop += total_new_infections
            
            # Apply recoveries and deaths
            recoveries_and_deaths = newly_recovered_counts[node_id] + newly_deceased_counts[node_id]
            node.infectious_pop -= recoveries_and_deaths
            node.recovered_pop += newly_recovered_counts[node_id]
            node.deceased_pop += newly_deceased_counts[node_id]

        self.day += 1

    def run(self, days: int):
        """Runs the simulation for a given number of days."""
        for _ in range(days):
            self.step()

    def get_total_population(self):
        """Returns the total population statistics."""
        total_susceptible = sum(node.susceptible_pop for node in self.nodes.values())
        total_infectious = sum(node.infectious_pop for node in self.nodes.values())
        total_recovered = sum(node.recovered_pop for node in self.nodes.values())
        total_deceased = sum(node.deceased_pop for node in self.nodes.values())
        return {
            "susceptible": total_susceptible,
            "infectious": total_infectious,
            "recovered": total_recovered,
            "deceased": total_deceased,
        }
