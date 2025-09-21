import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

// Types for our simulation data
export interface TileData {
  geoid: string;
  total_population: number;
  amount_infected: number;
  amount_deceased: number;
  coordinates?: [number, number]; // [longitude, latitude]
}

export interface SimulationParams {
  airborne: number;
  waterborne: number;
  contact_based: number;
}

interface SimulationPageProps {
  onBackToLanding: () => void;
}

export const SimulationPage: React.FC<SimulationPageProps> = ({ onBackToLanding }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [selectedTileData, setSelectedTileData] = useState<TileData | null>(null);
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    airborne: 0.3,
    waterborne: 0.2,
    contact_based: 0.5
  });
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  // Sample data for demonstration
  const [tileData] = useState<TileData[]>([
    { geoid: '001', total_population: 50000, amount_infected: 100, amount_deceased: 5, coordinates: [-122.4194, 37.7749] },
    { geoid: '002', total_population: 75000, amount_infected: 250, amount_deceased: 12, coordinates: [-122.3194, 37.7749] },
    { geoid: '003', total_population: 30000, amount_infected: 50, amount_deceased: 2, coordinates: [-122.2194, 37.7749] },
    { geoid: '004', total_population: 45000, amount_infected: 180, amount_deceased: 8, coordinates: [-122.4194, 37.6749] },
    { geoid: '005', total_population: 60000, amount_infected: 320, amount_deceased: 15, coordinates: [-122.3194, 37.6749] },
    { geoid: '006', total_population: 25000, amount_infected: 40, amount_deceased: 1, coordinates: [-122.2194, 37.6749] },
  ]);

  // Initialize Mapbox
  useEffect(() => {
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    if (!accessToken || accessToken === 'your_mapbox_api_key_here') {
      console.error('Mapbox access token not configured. Please set VITE_MAPBOX_ACCESS_TOKEN in your .env file');
      return;
    }

    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = accessToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-122.3194, 37.7249], // San Francisco Bay Area
      zoom: 10
    });

    map.current.on('load', () => {
      setIsMapLoaded(true);
      addDataLayers();
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const getInfectionColor = (infected: number, total: number): string => {
    if (total === 0) return '#10B981'; // Green for no population
    
    const infectionRate = infected / total;
    
    if (infectionRate === 0) return '#10B981'; // Green (healthy)
    if (infectionRate <= 0.05) return '#F59E0B'; // Yellow (low)
    if (infectionRate <= 0.10) return '#F97316'; // Orange (medium)
    if (infectionRate <= 0.15) return '#EF4444'; // Red (high)
    return '#7F1D1D'; // Dark red (critical)
  };

  const addDataLayers = () => {
    if (!map.current || !isMapLoaded) return;

    // Add data source for infection points
    const geojsonData = {
      type: 'FeatureCollection',
      features: tileData.map(tile => ({
        type: 'Feature',
        properties: {
          geoid: tile.geoid,
          total_population: tile.total_population,
          amount_infected: tile.amount_infected,
          amount_deceased: tile.amount_deceased,
          infection_rate: tile.total_population > 0 ? tile.amount_infected / tile.total_population : 0
        },
        geometry: {
          type: 'Point',
          coordinates: tile.coordinates || [-122.3194, 37.7249]
        }
      }))
    };

    map.current.addSource('infection-data', {
      type: 'geojson',
      data: geojsonData as any
    });

    // Add circles for infection visualization
    map.current.addLayer({
      id: 'infection-circles',
      type: 'circle',
      source: 'infection-data',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'total_population'],
          0, 10,
          100000, 30
        ],
        'circle-color': [
          'case',
          ['<=', ['get', 'infection_rate'], 0],
          '#10B981',
          ['<=', ['get', 'infection_rate'], 0.05],
          '#F59E0B',
          ['<=', ['get', 'infection_rate'], 0.10],
          '#F97316',
          ['<=', ['get', 'infection_rate'], 0.15],
          '#EF4444',
          '#7F1D1D'
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Add click event for circles
    map.current.on('click', 'infection-circles', (e) => {
      if (e.features && e.features[0]) {
        const properties = e.features[0].properties;
        if (properties) {
          setSelectedTile(properties.geoid);
          const tileInfo = tileData.find(t => t.geoid === properties.geoid);
          if (tileInfo) {
            setSelectedTileData(tileInfo);
          }
        }
      }
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'infection-circles', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer';
      }
    });

    map.current.on('mouseleave', 'infection-circles', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = '';
      }
    });
  };

  const startSimulation = () => {
    setIsSimulationRunning(!isSimulationRunning);
    // TODO: Connect to backend API
    console.log('Simulation started with parameters:', simulationParams);
  };

  const resetSimulation = () => {
    setIsSimulationRunning(false);
    setSelectedTile(null);
    setSelectedTileData(null);
    console.log('Simulation reset');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Main Simulation Container */}
      <div className="h-screen bg-white text-gray-900 flex">
        {/* Sidebar Controls */}
        <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto shadow-lg">
          <div className="space-y-6">
            {/* Back Button */}
            <div>
              <button
                onClick={onBackToLanding}
                className="w-full py-2 px-4 rounded-lg font-medium bg-gradient-to-r from-[#C54444] to-[#fc6666] hover:from-[#B03A3A] hover:to-[#E55A5A] text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>←</span>
                <span>Back to Home</span>
              </button>
            </div>

            {/* Simulation Status */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Simulation Status</h3>
              <div className={`p-3 rounded-lg border ${isSimulationRunning ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-sm text-gray-700">
                  {isSimulationRunning ? '🟢 Running' : '⭕ Stopped'}
              </p>
            </div>
          </div>

          {/* Simulation Parameters */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Spread Parameters</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Airborne ({simulationParams.airborne})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={simulationParams.airborne}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    airborne: parseFloat(e.target.value)
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Waterborne ({simulationParams.waterborne})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={simulationParams.waterborne}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    waterborne: parseFloat(e.target.value)
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Contact-based ({simulationParams.contact_based})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={simulationParams.contact_based}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    contact_based: parseFloat(e.target.value)
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Simulation Controls */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Simulation Control</h3>
            <div className="space-y-2">
              <button
                onClick={startSimulation}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                  isSimulationRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gradient-to-r from-[#C54444] to-[#fc6666] hover:from-[#B03A3A] hover:to-[#E55A5A] text-white'
                }`}
              >
                {isSimulationRunning ? 'Stop Simulation' : 'Start Simulation'}
              </button>
              <button
                onClick={resetSimulation}
                className="w-full py-2 px-4 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors border border-gray-300"
              >
                Reset Simulation
              </button>
            </div>
          </div>

          {/* Selected Tile Info */}
          {/* Selected Tile Info */}
          {selectedTile && selectedTileData && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Selected Region</h3>
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg space-y-2">
                <p className="text-sm text-gray-700"><strong>Geo ID:</strong> {selectedTile}</p>
                <p className="text-sm text-gray-700"><strong>Population:</strong> {selectedTileData.total_population.toLocaleString()}</p>
                <p className="text-sm text-gray-700"><strong>Infected:</strong> {selectedTileData.amount_infected.toLocaleString()}</p>
                <p className="text-sm text-gray-700"><strong>Deceased:</strong> {selectedTileData.amount_deceased.toLocaleString()}</p>
                <p className="text-sm text-gray-700">
                  <strong>Infection Rate:</strong> {
                    selectedTileData.total_population > 0 
                      ? (selectedTileData.amount_infected / selectedTileData.total_population * 100).toFixed(2)
                      : '0'
                  }%
                </p>
              </div>
            </div>
          )}

          {/* Color Legend */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Color Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Healthy (0%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Low (1-5%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Medium (6-10%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">High (11-15%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-900 rounded-full"></div>
                <span className="text-sm text-gray-700">Critical (15%+)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* API Key Warning */}
        {(!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_ACCESS_TOKEN === 'your_mapbox_api_key_here') && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="bg-red-900 text-white p-6 rounded-lg max-w-md">
              <h3 className="font-bold text-lg mb-2">⚠️ Mapbox API Key Required</h3>
              <p className="text-sm mb-4">
                Please configure your Mapbox access token in the <code>.env</code> file:
              </p>
              <pre className="bg-black p-2 rounded text-xs">
                VITE_MAPBOX_ACCESS_TOKEN=your_api_key_here
              </pre>
              <p className="text-xs mt-2">
                Get your API key from: <br />
                <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">
                  https://account.mapbox.com/access-tokens/
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};