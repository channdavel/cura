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
        Advances the simulation by one day.
        Simplified model: each infected node infects one person in a random neighbor node.
        """
        # Use a set to store which nodes will receive a new infection to avoid duplicates
        # and to prevent a node infected on this step from spreading in the same step.
        nodes_to_infect = set()

        # First, determine which nodes will be newly infected
        for node in self.nodes.values():
            if node.infectious_pop > 0 and node.neighbors:
                # This infected node will attempt to infect a neighbor
                target_neighbor_id = random.choice(node.neighbors)
                target_node = self.nodes.get(target_neighbor_id)

                # Check if the target neighbor can be infected
                if target_node and target_node.susceptible_pop > 0:
                    nodes_to_infect.add(target_neighbor_id)

        # Now, apply the new infections
        for node_id in nodes_to_infect:
            node = self.nodes[node_id]
            # Infect one person
            node.susceptible_pop -= 1
            node.infectious_pop += 1

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
