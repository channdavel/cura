// API Service for communicating with the epidemic simulation backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface TileData {
  geoid: string;
  total_population: number;
  amount_infected: number;
  amount_deceased: number;
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

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get initial tile data
  async getTiles(): Promise<TileData[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/tiles`);
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
      const response = await fetch(`${this.baseURL}/api/simulation/start`, {
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
      // Return mock response
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

  // Get current simulation state
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
        tiles: await this.getTiles()
      };
    }
  }

  // Subscribe to real-time simulation updates via Server-Sent Events
  subscribeToUpdates(simulationId: string, onUpdate: (data: TileData[]) => void): EventSource | null {
    try {
      const eventSource = new EventSource(`${this.baseURL}/api/simulation/${simulationId}/updates`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onUpdate(data.tiles);
        } catch (error) {
          console.error('Failed to parse SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.warn('SSE connection error:', error);
      };

      return eventSource;
    } catch (error) {
      console.warn('Failed to establish SSE connection:', error);
      return null;
    }
  }
}

export const apiService = new ApiService();