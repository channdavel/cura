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

// Types for census tract data
export interface CensusTractNode {
  id: string;
  lon: number;
  lat: number;
  population: number;
  area_km2: number;
  population_density: number;
  neighbors: string[];
  susceptible_pop: number;
  infectious_pop: number;
  recovered_pop: number;
  deceased_pop: number;
  mobility_factor: number;
  climate_factor: number;
  healthcare_capacity: number;
  is_quarantined: boolean;
  extras: Record<string, any>;
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
  const [selectedTileData, setSelectedTileData] = useState<CensusTractNode | null>(null);
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    airborne: 0.3,
    waterborne: 0.2,
    contact_based: 0.5
  });
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [censusData, setCensusData] = useState<Record<string, CensusTractNode>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load census tract data
  useEffect(() => {
    const loadCensusData = async () => {
      setIsLoadingData(true);
      
      // Priority 1: Try GeoJSON with polygon boundaries
      try {
        console.log('Loading census data from GeoJSON...');
        const geojsonResponse = await fetch('/us_census_tracts.geojson');
        
        if (geojsonResponse.ok) {
          const geojsonData = await geojsonResponse.json();
          console.log('Loaded GeoJSON with', geojsonData.features?.length, 'features');
          
          if (geojsonData.features && geojsonData.features.length > 0) {
            // Convert GeoJSON to our census data format
            const convertedData: Record<string, CensusTractNode> = {};
            
            // Limit to 10k for performance
            const limitedFeatures = geojsonData.features.slice(0, 10000);
            
            limitedFeatures.forEach((feature: any) => {
              const props = feature.properties;
              if (props && props.GEOID && props.lon && props.lat) {
                convertedData[props.GEOID] = {
                  id: props.GEOID,
                  lat: props.lat,
                  lon: props.lon,
                  population: props.population || 0,
                  infectious_pop: props.infectious_pop || 0,
                  recovered_pop: props.recovered_pop || 0,
                  deceased_pop: props.deceased_pop || 0,
                  susceptible_pop: props.susceptible_pop || props.population || 0,
                  area_km2: props.area_km2 || 1,
                  population_density: props.population_density || 0,
                  healthcare_capacity: props.healthcare_capacity || 0,
                  mobility_factor: props.mobility_factor || 1,
                  climate_factor: props.climate_factor || 1,
                  neighbors: props.neighbors || [],
                  is_quarantined: props.is_quarantined || false,
                  extras: {
                    geometry: feature.geometry
                  }
                };
              }
            });
            
            if (Object.keys(convertedData).length > 0) {
              setCensusData(convertedData);
              console.log('Successfully loaded', Object.keys(convertedData).length, 'census tracts from GeoJSON with polygon boundaries');
              setIsLoadingData(false);
              return;
            }
          }
        }
      } catch (error) {
        console.log('Failed to load GeoJSON, trying backend API...', error);
      }

      // Fallback 2: Try backend API
      try {
        console.log('Loading census data from backend API...');
        const apiResponse = await fetch('http://localhost:8000/api/census-data?limit=10000');
        
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          setCensusData(data);
          console.log(`Loaded ${Object.keys(data).length} census tracts from backend`);
          setIsLoadingData(false);
          return;
        }
      } catch (backendError) {
        console.warn('Backend not available, trying static file...', backendError);
      }
      
      // Final fallback: static JSON file
      try {
        console.log('Loading census data from static file...');
        const response = await fetch('/us_census_graph.json');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Expected JSON, got: ${contentType || 'unknown'}`);
        }
        
        const data = await response.json();
        
        // Limit to 10k and load census tract data
        const limitedData: Record<string, CensusTractNode> = {};
        const entries = Object.entries(data).slice(0, 10000);
        entries.forEach(([key, value]) => {
          limitedData[key] = value as CensusTractNode;
        });
        
        setCensusData(limitedData);
        console.log(`Loaded ${Object.keys(limitedData).length} census tracts from static file`);
        
      } catch (staticError) {
        console.error('Failed to load from static file:', staticError);
        // Use empty data as fallback - map will show without census tracts
        setCensusData({});
      } finally {
        setIsLoadingData(false);
      }
    };

    loadCensusData();
  }, []);



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
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4 // Zoom level to show continental US
    });

    map.current.on('load', () => {
      setIsMapLoaded(true);
      if (Object.keys(censusData).length > 0) {
        addCensusDataLayers();
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [censusData]);

  // Add census data layers when data is loaded
  useEffect(() => {
    if (isMapLoaded && Object.keys(censusData).length > 0) {
      // Wait for style to load before adding layers
      if (map.current && map.current.isStyleLoaded()) {
        addCensusDataLayers();
      } else if (map.current) {
        // If style isn't loaded yet, wait for it
        map.current.on('styledata', () => {
          if (map.current && map.current.isStyleLoaded()) {
            addCensusDataLayers();
          }
        });
      }
    }
  }, [isMapLoaded, censusData]);



  const addCensusDataLayers = () => {
    if (!map.current || !isMapLoaded || Object.keys(censusData).length === 0) return;
    
    // Check if the map style is fully loaded before adding layers
    if (!map.current.isStyleLoaded()) {
      console.log('Map style not loaded yet, waiting...');
      return;
    }

    // Limit to 10k nodes for performance
    const censusNodes = Object.values(censusData).slice(0, 10000);
    
    // Check if we have geometry data for polygons
    const hasGeometry = censusNodes.some(node => node.extras?.geometry);
    
    if (hasGeometry) {
      // Render as polygons using the actual tract boundaries
      console.log('Rendering census tracts as polygons...');
      
      const geojsonData = {
        type: 'FeatureCollection',
        features: censusNodes
          .filter(node => node.extras?.geometry)
          .map(node => ({
            type: 'Feature',
            properties: {
              geoid: node.id,
              population: node.population,
              infectious_pop: node.infectious_pop,
              recovered_pop: node.recovered_pop,
              deceased_pop: node.deceased_pop,
              population_density: node.population_density,
              healthcare_capacity: node.healthcare_capacity,
              is_quarantined: node.is_quarantined,
              infection_rate: node.population > 0 ? node.infectious_pop / node.population : 0
            },
            geometry: node.extras.geometry
          }))
      };

      // Remove existing sources if they exist
      if (map.current.getSource('census-polygons')) {
        map.current.removeLayer('census-fill');
        map.current.removeLayer('census-outline');
        map.current.removeSource('census-polygons');
      }

      map.current.addSource('census-polygons', {
        type: 'geojson',
        data: geojsonData as any
      });

      // Add polygon fill layer
      map.current.addLayer({
        id: 'census-fill',
        type: 'fill',
        source: 'census-polygons',
        paint: {
          'fill-color': [
            'case',
            ['get', 'is_quarantined'],
            '#8B5CF6', // Purple for quarantined
            [
              'case',
              ['<=', ['get', 'infection_rate'], 0],
              '#10B981', // Green (healthy)
              ['<=', ['get', 'infection_rate'], 0.01],
              '#F59E0B', // Yellow (low)
              ['<=', ['get', 'infection_rate'], 0.05],
              '#F97316', // Orange (medium)
              ['<=', ['get', 'infection_rate'], 0.10],
              '#EF4444', // Red (high)
              '#7F1D1D'   // Dark red (critical)
            ]
          ],
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'population'],
            0, 0.1,      // Very transparent for areas with no population
            500, 0.2,    // Low opacity for very sparse areas
            1500, 0.3,   // Rural areas
            3000, 0.5,   // Small towns
            5000, 0.65,  // Medium density suburban
            8000, 0.8,   // High density suburban/urban
            12000, 0.9,  // Dense urban areas
            20000, 1.0   // Maximum opacity for very dense urban areas
          ]
        }
      });

      // Add polygon outline layer
      map.current.addLayer({
        id: 'census-outline',
        type: 'line',
        source: 'census-polygons',
        paint: {
          'line-color': [
            'case',
            ['get', 'is_quarantined'],
            '#FFFFFF', // White outline for quarantined
            ['>', ['get', 'infection_rate'], 0],
            '#FFFFFF', // White outline for infected
            '#64748B'  // Gray outline for healthy
          ],
          'line-width': [
            'case',
            ['get', 'is_quarantined'],
            2, // Thicker outline for quarantined
            ['>', ['get', 'infection_rate'], 0],
            1.5, // Medium outline for infected
            0.5  // Thin outline for healthy
          ],
          'line-opacity': 0.8
        }
      });

      // Add click events for polygons
      map.current.on('click', 'census-fill', (e) => {
        if (e.features && e.features[0]) {
          const properties = e.features[0].properties;
          if (properties) {
            setSelectedTile(properties.geoid);
            const nodeInfo = censusData[properties.geoid];
            if (nodeInfo) {
              setSelectedTileData(nodeInfo);
            }
          }
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'census-fill', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'census-fill', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });
      
    } else {
      // Fallback: Render as circles (original point-based visualization)
      console.log('Rendering census tracts as circles (fallback)...');
      
      const geojsonData = {
        type: 'FeatureCollection',
        features: censusNodes.map(node => ({
          type: 'Feature',
          properties: {
            geoid: node.id,
            population: node.population,
            infectious_pop: node.infectious_pop,
            recovered_pop: node.recovered_pop,
            deceased_pop: node.deceased_pop,
            population_density: node.population_density,
            healthcare_capacity: node.healthcare_capacity,
            is_quarantined: node.is_quarantined,
            infection_rate: node.population > 0 ? node.infectious_pop / node.population : 0
          },
          geometry: {
            type: 'Point',
            coordinates: [node.lon, node.lat]
          }
        }))
      };

      // Remove existing source if it exists
      if (map.current.getSource('census-data')) {
        map.current.removeLayer('census-circles');
        map.current.removeSource('census-data');
      }

      map.current.addSource('census-data', {
        type: 'geojson',
        data: geojsonData as any
      });

      // Add circles for census tract visualization
      map.current.addLayer({
        id: 'census-circles',
        type: 'circle',
        source: 'census-data',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'population'],
            0, 2,
            1000, 3,
            5000, 4,
            10000, 5,
            25000, 6,
            50000, 7,
            100000, 8,
            200000, 9
          ],
          'circle-color': [
            'case',
            ['get', 'is_quarantined'],
            '#8B5CF6', // Purple for quarantined
            [
              'case',
              ['<=', ['get', 'infection_rate'], 0],
              '#10B981', // Green (healthy)
              ['<=', ['get', 'infection_rate'], 0.01],
              '#F59E0B', // Yellow (low)
              ['<=', ['get', 'infection_rate'], 0.05],
              '#F97316', // Orange (medium)
              ['<=', ['get', 'infection_rate'], 0.10],
              '#EF4444', // Red (high)
              '#7F1D1D'   // Dark red (critical)
            ]
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': [
            'case',
            ['get', 'is_quarantined'],
            3,
            1
          ],
          'circle-stroke-color': [
            'case',
            ['get', 'is_quarantined'],
            '#FFFFFF',
            ['>', ['get', 'infection_rate'], 0],
            '#FFFFFF',
            '#64748B'
          ]
        }
      });

      // Add click event for circles
      map.current.on('click', 'census-circles', (e) => {
        if (e.features && e.features[0]) {
          const properties = e.features[0].properties;
          if (properties) {
            setSelectedTile(properties.geoid);
            const nodeInfo = censusData[properties.geoid];
            if (nodeInfo) {
              setSelectedTileData(nodeInfo);
            }
          }
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'census-circles', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'census-circles', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });
    }
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
                <p className="text-sm text-gray-700"><strong>Population:</strong> {selectedTileData.population.toLocaleString()}</p>
                <p className="text-sm text-gray-700"><strong>Susceptible:</strong> {selectedTileData.susceptible_pop.toLocaleString()}</p>
                <p className="text-sm text-gray-700"><strong>Infectious:</strong> {selectedTileData.infectious_pop.toLocaleString()}</p>
                <p className="text-sm text-gray-700"><strong>Recovered:</strong> {selectedTileData.recovered_pop.toLocaleString()}</p>
                <p className="text-sm text-gray-700"><strong>Deceased:</strong> {selectedTileData.deceased_pop.toLocaleString()}</p>
                <p className="text-sm text-gray-700"><strong>Density:</strong> {selectedTileData.population_density.toFixed(1)} per km²</p>
                <p className="text-sm text-gray-700"><strong>Healthcare Capacity:</strong> {selectedTileData.healthcare_capacity}</p>
                <p className="text-sm text-gray-700">
                  <strong>Infection Rate:</strong> {
                    selectedTileData.population > 0 
                      ? (selectedTileData.infectious_pop / selectedTileData.population * 100).toFixed(2)
                      : '0'
                  }%
                </p>
                {selectedTileData.is_quarantined && (
                  <p className="text-sm text-purple-700 font-semibold">🔒 QUARANTINED</p>
                )}
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
                <span className="text-sm text-gray-700">Low (0-1%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Medium (1-5%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">High (5-10%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-900 rounded-full"></div>
                <span className="text-sm text-gray-700">Critical (10%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white"></div>
                <span className="text-sm text-gray-700">Quarantined</span>
              </div>
            </div>
          </div>

          {/* Data Loading Status */}
          {isLoadingData && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Data Status</h3>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-700">Loading census tract data...</p>
              </div>
            </div>
          )}

          {!isLoadingData && Object.keys(censusData).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Data Status</h3>
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ Loaded {Object.keys(censusData).length.toLocaleString()} census tracts
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Displaying first 5,000 for performance
                </p>
              </div>
            </div>
          )}
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