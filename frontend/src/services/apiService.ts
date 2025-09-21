// API Service for communicating with the epidemic simulation backend

const API_BASE_URL = 'http://localhost:8001'; // Force port 8001

export interface TileData {
  geoid: string;
  total_population: number;
  amount_infected: number;
  amount_deceased: number;
  coordinates?: [number, number];
}

export interface SimulationParams {
  airborne: number;
  waterborne: number;
  contact_based: number;
}

export interface SimulationResponse {
  id: string;
  status: 'running' | 'stopped' | 'completed';
  tiles: TileData[];
}

export interface SimulationStatistics {
  day: number;
  total_population: number;
  susceptible: number;
  infectious: number;
  recovered: number;
  deceased: number;
  infected_areas: number;
  infection_rate: number;
  mortality_rate?: number;
  recovery_rate?: number;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    console.log('ApiService initialized with baseURL:', this.baseURL);
  }

    // Get initial tile data
  async getTiles(): Promise<TileData[]> {
    try {
      const url = `${this.baseURL}/api/tiles`;
      console.log('Fetching tiles from URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch tiles from backend, using sample data:', error);
      // Return sample data as fallback
      return [
        { geoid: '001', total_population: 50000, amount_infected: 100, amount_deceased: 5 },
        { geoid: '002', total_population: 75000, amount_infected: 250, amount_deceased: 12 },
        { geoid: '003', total_population: 30000, amount_infected: 50, amount_deceased: 2 },
        { geoid: '004', total_population: 45000, amount_infected: 180, amount_deceased: 8 },
        { geoid: '005', total_population: 60000, amount_infected: 320, amount_deceased: 15 },
        { geoid: '006', total_population: 25000, amount_infected: 40, amount_deceased: 1 },
      ];
    }
  }

  // Start a new simulation
  async startSimulation(params: SimulationParams, initialInfectedTile?: string): Promise<SimulationResponse> {
    try {
      const url = `${this.baseURL}/api/simulation/start`;
      console.log('Starting simulation with URL:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters: params,
          initial_infected_tile: initialInfectedTile,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Failed to start simulation on backend:', error);
      return {
        id: 'mock-simulation-' + Date.now(),
        status: 'running',
        tiles: await this.getTiles()
      };
    }
  }

  // Stop a running simulation
  async stopSimulation(simulationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/simulation/${simulationId}/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to stop simulation on backend:', error);
    }
  }

  // Get simulation state
  async getSimulationState(simulationId: string): Promise<SimulationResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/simulation/${simulationId}/state`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Failed to get simulation state from backend:', error);
      return {
        id: simulationId,
        status: 'stopped',
        tiles: []
      };
    }
  }

  // Reset simulation
  async resetSimulation(simulationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/simulation/${simulationId}/reset`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to reset simulation on backend:', error);
    }
  }

  // Get comprehensive simulation statistics
  async getStatistics(): Promise<SimulationStatistics | null> {
    try {
      const response = await fetch(`${this.baseURL}/api/statistics`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Failed to get statistics from backend:', error);
      return null;
    }
  }
}

export const apiService = new ApiService();
