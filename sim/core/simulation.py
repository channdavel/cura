import random
import numpy as np
from typing import Dict, List
from sim.core.entities import Node

class Simulation:
    def __init__(self, nodes: Dict[str, Node], infection_rate: float, recovery_rate: float, mortality_rate: float, 
                 socioeconomic_impact: float = 0.3, rng_seed: int = None):
        self.nodes = nodes
        self.infection_rate = infection_rate
        self.recovery_rate = recovery_rate
        self.mortality_rate = mortality_rate
        self.socioeconomic_impact = socioeconomic_impact  # 0.0 = no impact, 1.0 = full impact
        self.day = 0
        self.daily_new_infections = 0
        
        # Set random seed for reproducibility
        if rng_seed is not None:
            random.seed(rng_seed)
            np.random.seed(rng_seed)
            print(f"RNG seed set to: {rng_seed}")
        
        # Calculate income statistics for normalization
        self._calculate_income_stats()

    def _calculate_income_stats(self):
        """Calculate income statistics for normalization, handling zero values."""
        all_incomes = [node.median_income for node in self.nodes.values() if node.median_income > 0]
        
        if not all_incomes:
            # Fallback if no valid income data
            self.income_median = 70000  # US median household income
            print("Warning: No valid income data found. Using US median of $70,000.")
        else:
            self.income_median = np.median(all_incomes)
            print(f"National median income calculated: ${self.income_median:,.0f}")
            
            # Optional: Print some stats for debugging
            income_25th = np.percentile(all_incomes, 25)
            income_75th = np.percentile(all_incomes, 75)
            print(f"Income range - 25th: ${income_25th:,.0f}, "
                  f"Median: ${self.income_median:,.0f}, "
                  f"75th: ${income_75th:,.0f}")
            
            zero_income_count = sum(1 for node in self.nodes.values() if node.median_income <= 0)
            if zero_income_count > 0:
                print(f"Note: {zero_income_count} nodes have zero/missing income (no socioeconomic effect)")

    def seed_infection(self, num_nodes: int = 1):
        """Randomly infects a number of nodes to start the simulation."""
        infected_nodes = random.sample(list(self.nodes.keys()), num_nodes)
        for node_id in infected_nodes:
            node = self.nodes[node_id]
            node.susceptible_pop -= 1
            node.infectious_pop += 1

    def calculate_socioeconomic_factor(self, node: Node) -> float:
        """
        Calculate transmission modifier based on median household income relative to national median.
        
        Logic:
        - Income = 0: No socioeconomic effect (return 1.0)
        - Income < median: Boost transmission (factor > 1.0)
        - Income > median: Reduce transmission (factor < 1.0)
        - Income = median: No effect (factor = 1.0)
        
        Returns multiplier: 1.0 = baseline transmission rate
        """
        if node.median_income <= 0:
            # For missing income data, ignore socioeconomic effects completely
            return 1.0
        
        # Calculate income ratio relative to national median
        income_ratio = node.median_income / self.income_median
        
        # Convert ratio to transmission multiplier
        if income_ratio < 1.0:
            # Below median income = higher transmission
            # Scale: 0.5x median income = 1.5x transmission, 0.75x median = 1.25x transmission
            base_multiplier = 1.0 + (1.0 - income_ratio) * 0.5  # Max 1.5x at 0 income
        else:
            # Above median income = lower transmission  
            # Scale: 2x median income = 0.75x transmission, 1.5x median = 0.875x transmission
            base_multiplier = 1.0 - (income_ratio - 1.0) * 0.25  # Min 0.75x at very high income
            base_multiplier = max(0.6, base_multiplier)  # Floor at 0.6x transmission
        
        # Apply tunable socioeconomic impact
        # socioeconomic_impact = 0: no effect (factor = 1.0)
        # socioeconomic_impact = 1: full effect (factor = base_multiplier)
        final_factor = 1.0 + self.socioeconomic_impact * (base_multiplier - 1.0)
        
        return final_factor

    def step(self):
        """
        Advances the simulation by one day based on a two-level infection model.
        1. Intra-node spread: Exponential growth within a node, scaled by density.
        2. Inter-node spread: Probabilistic spread to neighbors based on infection pressure.
        """
        # Add daily variation to rates (at the beginning of step)
        daily_infection_rate = self.infection_rate * np.random.normal(1.0, 0.1)  # ±10% variation
        daily_recovery_rate = self.recovery_rate * np.random.normal(1.0, 0.05)   # ±5% variation
        
        # Clamp to reasonable bounds
        daily_infection_rate = max(0.001, daily_infection_rate)  # Don't go below 0.1%
        daily_recovery_rate = max(0.001, min(0.5, daily_recovery_rate))  # Between 0.1% and 50%
        
        # Store changes to apply at the end of the step to avoid cascading effects
        newly_infected_counts = {node_id: 0 for node_id in self.nodes}
        newly_recovered_counts = {node_id: 0 for node_id in self.nodes}
        newly_deceased_counts = {node_id: 0 for node_id in self.nodes}

        for node_id, node in self.nodes.items():
            if node.infectious_pop == 0:
                continue

            # --- 1. Intra-node spread (within the tract) ---
            # Growth factor is influenced by density and socioeconomic status
            density_factor = (node.population_density / 1000) + 1 # Simple scaling
            socioeconomic_factor = self.calculate_socioeconomic_factor(node)

            # Calculate potential new infections within this node based on SIR model
            potential_intra_node_infections = (
                daily_infection_rate * density_factor * socioeconomic_factor *
                node.susceptible_pop * node.infectious_pop
            ) / node.population if node.population > 0 else 0
            
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

            # Base mobility rate - what % of people interact between neighboring regions daily
            base_mobility_rate = 0.01

            # Attempt to infect each neighbor using flow model
            for neighbor_id in node.neighbors:
                neighbor_node = self.nodes.get(neighbor_id)
                if neighbor_node and neighbor_node.susceptible_pop > 0:
                    # Calculate expected transmissions based on:
                    # - How infected the source region is (infection_pressure)
                    # - How much movement there is between regions (base_mobility_rate)
                    # - How many susceptible people are in the target region
                    expected_transmissions = (
                        infection_pressure *
                        base_mobility_rate *
                        neighbor_node.susceptible_pop
                    )
                    
                    # Convert expected (fractional) transmissions to actual (integer) transmissions
                    if expected_transmissions > 0:
                        if expected_transmissions < 1:
                            actual_transmissions = 1 if random.random() < expected_transmissions else 0
                        else:
                            # Use Poisson for more realistic variation
                            actual_transmissions = np.random.poisson(expected_transmissions)
                            actual_transmissions = max(0, actual_transmissions)  # Ensure non-negative
                        
                        # Don't exceed available susceptible population
                        actual_transmissions = min(neighbor_node.susceptible_pop, actual_transmissions)
                        newly_infected_counts[neighbor_id] += actual_transmissions

            # --- SIR model: Recoveries and Deaths ---
            new_recoveries = int(round(node.infectious_pop * daily_recovery_rate))
            new_deaths = int(round(node.infectious_pop * self.mortality_rate))
            
            # Ensure we don't recover/decease more people than are infectious
            new_recoveries = min(node.infectious_pop, new_recoveries)
            new_deaths = min(node.infectious_pop - new_recoveries, new_deaths)

            newly_recovered_counts[node_id] = new_recoveries
            newly_deceased_counts[node_id] = new_deaths

        # --- 3. Apply all calculated changes simultaneously ---
        total_new_infections_today = 0  # Track daily new infections
        
        for node_id, node in self.nodes.items():
            # Clamp new infections to the available susceptible population
            total_new_infections = min(node.susceptible_pop, newly_infected_counts[node_id])
            total_new_infections_today += total_new_infections  # Add this line
            
            node.susceptible_pop -= total_new_infections
            node.infectious_pop += total_new_infections
            
            # Apply recoveries and deaths
            recoveries_and_deaths = newly_recovered_counts[node_id] + newly_deceased_counts[node_id]
            node.infectious_pop -= recoveries_and_deaths
            node.recovered_pop += newly_recovered_counts[node_id]
            node.deceased_pop += newly_deceased_counts[node_id]

        self.daily_new_infections = total_new_infections_today  # Add this line
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
