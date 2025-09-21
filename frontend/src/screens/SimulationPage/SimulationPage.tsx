import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { apiService, SimulationStatistics } from '../../services/apiService';

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
  // Spread type switches
  airborne: boolean;
  waterborne: boolean;
  contact_based: boolean;
  
  // Core simulation rates
  mortality_rate: number;
  recovery_rate: number;
  
  // Symptom toggles that modify rates
  fever: boolean;        // increases mortality rate
  coughing: boolean;     // increases infection rate
  fatigue: boolean;      // decreases recovery rate
  breathing_difficulty: boolean; // increases mortality rate
  loss_of_taste: boolean;        // increases transmission (people don't realize they're sick)
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
  const [currentZoom, setCurrentZoom] = useState(4); // Track current zoom level
  const [allCensusData, setAllCensusData] = useState<Record<string, CensusTractNode>>({});
  const [censusData, setCensusData] = useState<Record<string, CensusTractNode>>({});
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    // Spread type switches
    airborne: true,
    waterborne: false,
    contact_based: true,
    
    // Core simulation rates
    mortality_rate: 0.02,    // 2%
    recovery_rate: 0.1,      // 10%
    
    // Symptom toggles
    fever: false,
    coughing: false,
    fatigue: false,
    breathing_difficulty: false,
    loss_of_taste: false
  });
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isSimulationPaused, setIsSimulationPaused] = useState(false);
  const [hasSimulationStarted, setHasSimulationStarted] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const [statistics, setStatistics] = useState<SimulationStatistics | null>(null);
  const [initialInfectionNode, setInitialInfectionNode] = useState<string | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState(1.0); // Default 1x speed

  // Function to filter census data based on zoom level
  const filterDataByZoom = (allData: Record<string, CensusTractNode>, zoom: number) => {
    const totalTracts = Object.keys(allData).length;
    let maxTracts: number;
    
    // Define zoom-based limits - show tracts at all zoom levels
    if (zoom <= 3) {
      maxTracts = Math.min(1000, totalTracts); // Show subset at very low zoom
    } else if (zoom <= 5) {
      maxTracts = Math.min(5000, totalTracts); // Show more tracts at medium zoom
    } else {
      maxTracts = totalTracts; // Show all tracts when zoomed in
    }
    
    console.log(`Zoom level ${zoom}: showing ${maxTracts} of ${totalTracts} tracts`);
    
    if (maxTracts >= totalTracts) {
      setCensusData(allData);
      console.log('Showing all tracts at zoom level 6+');
      return;
    }
    
    // Sample tracts by population to show most populated areas first
    const tractEntries = Object.entries(allData);
    const sortedByPopulation = tractEntries.sort((a, b) => {
      const popA = a[1].population || a[1].extras?.population || 0;
      const popB = b[1].population || b[1].extras?.population || 0;
      return popB - popA;
    });
    
    const filteredData: Record<string, CensusTractNode> = {};
    sortedByPopulation.slice(0, maxTracts).forEach(([id, tract]) => {
      filteredData[id] = tract;
    });
    
    console.log(`Applied zoom filtering: ${Object.keys(filteredData).length} tracts selected for display`);
    setCensusData(filteredData);
  };

  // Load census tract data
  useEffect(() => {
    const loadCensusData = async () => {
      setIsLoadingData(true);
      console.log('Starting to load census data...');
      
      // Priority 1: Try GeoJSON with polygon boundaries
      try {
        console.log('Loading census data from GeoJSON...');
        const geojsonResponse = await fetch('/us_census_tracts.geojson');
        console.log('GeoJSON response status:', geojsonResponse.status);
        
        if (geojsonResponse.ok) {
          const geojsonData = await geojsonResponse.json();
          console.log('Loaded GeoJSON with', geojsonData.features?.length, 'features');
          
          if (geojsonData.features && geojsonData.features.length > 0) {
            // Convert GeoJSON to our census data format
            const convertedData: Record<string, CensusTractNode> = {};
            
            // Load all features - no limit
            geojsonData.features.forEach((feature: any) => {
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
              setAllCensusData(convertedData);
              filterDataByZoom(convertedData, currentZoom);
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
        const apiResponse = await fetch('http://localhost:8001/api/census-data');
        
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          setAllCensusData(data);
          filterDataByZoom(data, currentZoom);
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
        
        // Load all census tract data - no limit
        const allData: Record<string, CensusTractNode> = {};
        Object.entries(data).forEach(([key, value]) => {
          allData[key] = value as CensusTractNode;
        });
        
        setAllCensusData(allData);
        filterDataByZoom(allData, currentZoom);
        console.log(`Loaded ${Object.keys(allData).length} census tracts from static file`);
        
      } catch (staticError) {
        console.error('Failed to load from static file:', staticError);
        // Use empty data as fallback - map will show without census tracts
        setAllCensusData({});
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

    // Add zoom change listener for level of detail
    map.current.on('zoomend', () => {
      if (map.current) {
        const newZoom = Math.round(map.current.getZoom());
        if (newZoom !== currentZoom) {
          setCurrentZoom(newZoom);
          // Apply new filtering based on zoom
          if (Object.keys(allCensusData).length > 0) {
            filterDataByZoom(allCensusData, newZoom);
          }
        }
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Apply zoom-based filtering when zoom level changes
  useEffect(() => {
    if (Object.keys(allCensusData).length > 0) {
      filterDataByZoom(allCensusData, currentZoom);
    }
  }, [currentZoom, allCensusData]);

  // Add census data layers when data is loaded
  useEffect(() => {
    if (isMapLoaded && Object.keys(censusData).length > 0) {
      // Wait for style to load before adding layers
      if (map.current && map.current.isStyleLoaded()) {
        addCensusDataLayers();
        // Update initial infection indicator after layers are added
        updateInitialInfectionIndicator(initialInfectionNode);
      } else if (map.current) {
        // If style isn't loaded yet, wait for it
        map.current.on('styledata', () => {
          if (map.current && map.current.isStyleLoaded()) {
            addCensusDataLayers();
            // Update initial infection indicator after layers are added
            updateInitialInfectionIndicator(initialInfectionNode);
          }
        });
      }
    }
  }, [isMapLoaded, censusData, initialInfectionNode]);



  const addCensusDataLayers = () => {
    if (!map.current || !isMapLoaded || Object.keys(censusData).length === 0) return;
    
    // Check if the map style is fully loaded before adding layers
    if (!map.current.isStyleLoaded()) {
      console.log('Map style not loaded yet, waiting...');
      return;
    }

    // Use all census nodes - no performance limit
    const censusNodes = Object.values(censusData);
    
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
              '#10B981', // Green (healthy - exactly 0%)
              ['<=', ['get', 'infection_rate'], 0.005],
              '#F59E0B', // Yellow (low - any infection up to 0.5%)
              ['<=', ['get', 'infection_rate'], 0.02],
              '#F97316', // Orange (medium - 0.5-2%)
              ['<=', ['get', 'infection_rate'], 0.05],
              '#EF4444', // Red (high - 2-5%)
              '#7F1D1D'   // Dark red (critical - 5%+)
            ]
          ],
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'population'],
            0, 0.05,     // Almost invisible for areas with no population
            500, 0.1,    // Very low opacity for very sparse areas  
            1500, 0.15,  // Still quite transparent for rural areas
            3000, 0.3,   // Small towns - more visible jump
            5000, 0.5,   // Medium density suburban - noticeable
            8000, 0.75,  // High density suburban/urban - prominent
            12000, 0.9,  // Dense urban areas - very visible
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

      // Add initial infection indicator layer
      map.current.addSource('initial-infection', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.current.addLayer({
        id: 'initial-infection-indicator',
        type: 'circle',
        source: 'initial-infection',
        paint: {
          'circle-radius': 8,
          'circle-color': '#DC2626', // Bright red
          'circle-stroke-width': 3,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 0.9
        }
      });

      // Add click event for circles
      map.current.on('click', 'census-circles', (e) => {
        if (e.features && e.features[0]) {
          const properties = e.features[0].properties;
          if (properties) {
            setSelectedTile(properties.geoid);
            updateInitialInfectionIndicator(properties.geoid); // Show red dot immediately on click
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

  const updateInitialInfectionIndicator = (nodeId: string | null) => {
    if (!map.current || !isMapLoaded) return;
    
    const source = map.current.getSource('initial-infection') as mapboxgl.GeoJSONSource;
    if (!source) return;
    
    if (nodeId && censusData[nodeId]) {
      const node = censusData[nodeId];
      const geojsonData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {
            geoid: nodeId,
            label: 'Initial Infection Site'
          },
          geometry: {
            type: 'Point',
            coordinates: [node.lon, node.lat]
          }
        }]
      };
      source.setData(geojsonData as any);
    } else {
      // Clear the indicator
      source.setData({
        type: 'FeatureCollection',
        features: []
      } as any);
    }
  };

  // Polling functions for real-time simulation updates
  const startPollingSimulationData = (simId: string) => {
    setSimulationId(simId);
    
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Start new polling every 500ms since backend updates every 10 steps
    const interval = setInterval(async () => {
      await fetchSimulationUpdate(simId);
    }, 500) as unknown as number;
    
    setPollingInterval(interval);
  };

  const fetchSimulationUpdate = async (simId: string) => {
    try {
      const response = await fetch(`http://localhost:8001/api/simulation/${simId}/state`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the census data with new simulation values
        if (data.tiles) {
          console.log('Received tiles data:', data.tiles.length, 'tiles');
          console.log('Sample tile data:', data.tiles[0]);
          
          const updatedCensusData = { ...allCensusData };
          
          data.tiles.forEach((tile: TileData) => {
            if (updatedCensusData[tile.geoid]) {
              updatedCensusData[tile.geoid] = {
                ...updatedCensusData[tile.geoid],
                infectious_pop: tile.amount_infected,
                deceased_pop: tile.amount_deceased,
                susceptible_pop: tile.total_population - tile.amount_infected - tile.amount_deceased,
              };
              
              // Log if this tile has infections
              if (tile.amount_infected > 0) {
                console.log('Found infected tile:', tile.geoid, 'infections:', tile.amount_infected, 'total:', tile.total_population);
              }
            }
          });
          
          setAllCensusData(updatedCensusData);
          filterDataByZoom(updatedCensusData, currentZoom);
          
          // Update selected tile data if it's currently selected
          if (selectedTile && updatedCensusData[selectedTile]) {
            setSelectedTileData(updatedCensusData[selectedTile]);
          }
          
          // Update map data source for real-time visualization
          updateMapDataSource(updatedCensusData);
        }
        
        // Also fetch updated statistics
        const stats = await apiService.getStatistics();
        if (stats) {
          setStatistics(stats);
        }
        
        // If simulation is stopped, stop polling but keep the current state visible
        if (data.status === 'stopped') {
          console.log('Simulation completed - stopping updates but keeping final visible state');
          stopPolling();
          setIsSimulationRunning(false);
          // Don't reset the data - keep showing the progression that occurred
        }
      }
    } catch (error) {
      console.error('Failed to fetch simulation update:', error);
    }
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const updateMapDataSource = (updatedData: Record<string, CensusTractNode>) => {
    if (!map.current || !isMapLoaded) return;
    
    console.log('updateMapDataSource called with', Object.keys(updatedData).length, 'tracts');
    
    // Filter data by current zoom, but always include infected tracts
    const filteredData: Record<string, CensusTractNode> = {};
    Object.entries(updatedData).forEach(([id, tract]) => {
      // Always include tracts that are currently displayed OR have infections
      if (censusData[id] || tract.infectious_pop > 0) {
        filteredData[id] = tract;
        // Log infection rates for debugging
        if (tract.infectious_pop > 0) {
          const infectionRate = tract.population > 0 ? tract.infectious_pop / tract.population : 0;
          console.log('Tract', id, 'infection rate:', infectionRate, 'infectious:', tract.infectious_pop, 'total:', tract.population);
        }
      }
    });
    
    console.log('Filtered data:', Object.keys(filteredData).length, 'tracts');
    
    const censusNodes = Object.values(filteredData);
    const hasGeometry = censusNodes.some(node => node.extras?.geometry);
    
    if (hasGeometry && map.current.getSource('census-polygons')) {
      // Update polygon data
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
      
      const source = map.current.getSource('census-polygons') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(geojsonData as any);
      }
    } else if (map.current.getSource('census-data')) {
      // Update circle data
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
      
      const source = map.current.getSource('census-data') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(geojsonData as any);
      }
    }
  };

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Calculate infection rate based on transmission methods and symptoms
  const calculateInfectionRate = (params: SimulationParams): number => {
    let baseRate = 0;
    
    // Base transmission rates
    if (params.airborne) baseRate += 0.4;      // Airborne is most contagious
    if (params.waterborne) baseRate += 0.2;    // Waterborne is moderate
    if (params.contact_based) baseRate += 0.3; // Contact-based is significant
    
    // Symptom modifiers
    if (params.coughing) baseRate *= 1.5;              // Coughing increases transmission
    if (params.loss_of_taste) baseRate *= 1.3;         // People don't realize they're sick
    if (params.fever) baseRate *= 0.9;                 // Fever makes people stay home more
    if (params.breathing_difficulty) baseRate *= 0.8;  // Severe symptoms = less mobility
    
    // Cap at reasonable maximum
    return Math.min(baseRate, 0.8);
  };

  // Calculate adjusted mortality rate based on symptoms
  const calculateMortalityRate = (params: SimulationParams): number => {
    let rate = params.mortality_rate;
    
    if (params.fever) rate *= 1.4;                     // Fever increases mortality
    if (params.breathing_difficulty) rate *= 1.8;      // Breathing issues are serious
    if (params.fatigue) rate *= 1.1;                   // Fatigue slightly increases risk
    
    return Math.min(rate, 0.15); // Cap at 15%
  };

  // Calculate adjusted recovery rate based on symptoms
  const calculateRecoveryRate = (params: SimulationParams): number => {
    let rate = params.recovery_rate;
    
    if (params.fatigue) rate *= 0.7;                   // Fatigue slows recovery
    if (params.breathing_difficulty) rate *= 0.6;      // Breathing issues slow recovery
    if (params.fever) rate *= 0.8;                     // Fever slows recovery
    
    return Math.max(rate, 0.01); // Minimum 1% recovery rate
  };

  const changeSimulationSpeed = async (newSpeed: number) => {
    try {
      const response = await fetch('http://localhost:8001/api/simulation/speed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ speed: newSpeed }),
      });
      
      if (response.ok) {
        setSimulationSpeed(newSpeed);
        console.log(`Simulation speed changed to ${newSpeed}x`);
      } else {
        console.error('Failed to change simulation speed');
      }
    } catch (error) {
      console.error('Error changing simulation speed:', error);
    }
  };

  const startSimulation = async () => {
    if (!hasSimulationStarted) {
      // First time starting the simulation
      if (!selectedTile) {
        alert('Please select a census tract by clicking on the map first. The selected tract will be the initial infection point for the simulation.');
        return;
      }

      try {
        setIsSimulationRunning(true);
        setHasSimulationStarted(true);
        setIsSimulationPaused(false);
        setInitialInfectionNode(selectedTile);
        updateInitialInfectionIndicator(selectedTile);
        
        const { apiService } = await import('../../services/apiService');
        
        // Calculate effective rates based on transmission methods and symptoms
        const calculatedParams = {
          infection_rate: calculateInfectionRate(simulationParams),
          mortality_rate: calculateMortalityRate(simulationParams),
          recovery_rate: calculateRecoveryRate(simulationParams)
        };
        
        // Start simulation with selected tile as initial infection point
        const response = await apiService.startSimulation(calculatedParams, selectedTile);
        
        console.log('Simulation started with calculated parameters:', calculatedParams);
        console.log('Initial infected tile:', selectedTile);
        
        // Fetch initial statistics
        const stats = await apiService.getStatistics();
        if (stats) {
          setStatistics(stats);
        }
        
        // Start polling for updates
        startPollingSimulationData(response.id);
        
      } catch (error) {
        console.error('Failed to start simulation:', error);
        setIsSimulationRunning(false);
        setHasSimulationStarted(false);
        alert('Failed to start simulation. Please check the backend connection.');
      }
    } else {
      // Simulation has already started, toggle pause/resume
      if (isSimulationRunning) {
        // Pause the simulation
        stopPolling();
        setIsSimulationRunning(false);
        setIsSimulationPaused(true);
        console.log('Simulation paused');
      } else {
        // Resume the simulation
        setIsSimulationRunning(true);
        setIsSimulationPaused(false);
        if (simulationId) {
          startPollingSimulationData(simulationId);
        }
        console.log('Simulation resumed');
      }
    }
  };

  const resetSimulation = async () => {
    // Stop polling
    stopPolling();
    setIsSimulationRunning(false);
    setIsSimulationPaused(false);
    setHasSimulationStarted(false);
    
    // Reset simulation on backend if we have a simulation ID
    const currentSimId = simulationId || 'default';
    try {
      await fetch(`http://localhost:8001/api/simulation/${currentSimId}/reset`, {
        method: 'POST',
      });
      console.log('Backend simulation reset successfully');
    } catch (error) {
      console.error('Failed to reset simulation on backend:', error);
    }
    
    // Clear frontend state
    setSelectedTile(null);
    setSelectedTileData(null);
    setSimulationId(null);
    setStatistics(null);
    setInitialInfectionNode(null); // Clear the starting node indicator
    updateInitialInfectionIndicator(null); // Clear red dot from map
    
    // Reload original census data
    const loadCensusData = async () => {
      try {
        const geojsonResponse = await fetch('/us_census_tracts.geojson');
        if (geojsonResponse.ok) {
          const geojsonData = await geojsonResponse.json();
          if (geojsonData.features && geojsonData.features.length > 0) {
            const convertedData: Record<string, CensusTractNode> = {};
            geojsonData.features.forEach((feature: any) => {
              const props = feature.properties;
              if (props && props.GEOID && props.lon && props.lat) {
                convertedData[props.GEOID] = {
                  id: props.GEOID,
                  lat: props.lat,
                  lon: props.lon,
                  population: props.population || 0,
                  infectious_pop: 0, // Reset to 0
                  recovered_pop: 0,  // Reset to 0
                  deceased_pop: 0,   // Reset to 0
                  susceptible_pop: props.population || 0, // Full population is susceptible
                  area_km2: props.area_km2 || 1,
                  population_density: props.population_density || 0,
                  healthcare_capacity: props.healthcare_capacity || 0,
                  mobility_factor: props.mobility_factor || 1,
                  climate_factor: props.climate_factor || 1,
                  neighbors: props.neighbors || [],
                  is_quarantined: false, // Reset quarantine
                  extras: {
                    geometry: feature.geometry
                  }
                };
              }
            });
            setAllCensusData(convertedData);
            filterDataByZoom(convertedData, currentZoom);
            
            // Update the map with reset data
            updateMapDataSource(convertedData);
          }
        }
      } catch (error) {
        console.error('Failed to reload census data:', error);
      }
    };
    
    await loadCensusData();
    console.log('Simulation reset completed');
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
                  {isSimulationRunning ? '🟢 Running (showing progression)' : '⭕ Completed (final state hidden)'}
              </p>
            </div>
          </div>

          {/* Transmission Types */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Transmission Methods</h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={simulationParams.airborne}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    airborne: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Airborne transmission</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={simulationParams.waterborne}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    waterborne: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Waterborne transmission</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={simulationParams.contact_based}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    contact_based: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Contact-based transmission</span>
              </label>
            </div>
          </div>

          {/* Core Simulation Rates */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Disease Parameters</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Mortality Rate ({(simulationParams.mortality_rate * 100).toFixed(1)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.1"
                  step="0.005"
                  value={simulationParams.mortality_rate}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    mortality_rate: parseFloat(e.target.value)
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Recovery Rate ({(simulationParams.recovery_rate * 100).toFixed(1)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.3"
                  step="0.01"
                  value={simulationParams.recovery_rate}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    recovery_rate: parseFloat(e.target.value)
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Symptoms</h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={simulationParams.fever}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    fever: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Fever</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={simulationParams.coughing}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    coughing: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Coughing</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={simulationParams.fatigue}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    fatigue: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-700">Fatigue</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={simulationParams.breathing_difficulty}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    breathing_difficulty: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Breathing difficulty</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={simulationParams.loss_of_taste}
                  onChange={(e) => setSimulationParams(prev => ({
                    ...prev,
                    loss_of_taste: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Loss of taste</span>
              </label>
            </div>
          </div>

          {/* Simulation Controls */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Simulation Control</h3>
            <div className="space-y-2">
              <button
                onClick={startSimulation}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                  !hasSimulationStarted
                    ? 'bg-gradient-to-r from-[#C54444] to-[#fc6666] hover:from-[#B03A3A] hover:to-[#E55A5A] text-white'
                    : isSimulationRunning
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {!hasSimulationStarted 
                  ? 'Start Simulation' 
                  : isSimulationRunning 
                  ? 'Pause Simulation' 
                  : 'Resume Simulation'
                }
              </button>
              <button
                onClick={resetSimulation}
                className="w-full py-2 px-4 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors border border-gray-300"
              >
                Reset Simulation
              </button>
              
              {/* Simulation Speed Controls */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Simulation Speed: {simulationSpeed}x
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => changeSimulationSpeed(0.5)}
                    className={`py-1 px-2 text-xs rounded ${
                      simulationSpeed === 0.5 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    0.5x
                  </button>
                  <button
                    onClick={() => changeSimulationSpeed(1.0)}
                    className={`py-1 px-2 text-xs rounded ${
                      simulationSpeed === 1.0 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    1x
                  </button>
                  <button
                    onClick={() => changeSimulationSpeed(2.0)}
                    className={`py-1 px-2 text-xs rounded ${
                      simulationSpeed === 2.0 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    2x
                  </button>
                  <button
                    onClick={() => changeSimulationSpeed(4.0)}
                    className={`py-1 px-2 text-xs rounded ${
                      simulationSpeed === 4.0 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    4x
                  </button>
                </div>
              </div>
            </div>
          </div>

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
                <span className="text-sm text-gray-700">Low (0-0.5%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Medium (0.5-2%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">High (2-5%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-900 rounded-full"></div>
                <span className="text-sm text-gray-700">Critical (5%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white"></div>
                <span className="text-sm text-gray-700">Quarantined</span>
              </div>
              {initialInfectionNode && (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white"></div>
                  <span className="text-sm text-gray-700">Initial Infection Site</span>
                </div>
              )}
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
                {initialInfectionNode === selectedTile && (
                  <p className="text-sm text-red-700 font-semibold">🔴 INITIAL INFECTION SITE</p>
                )}
              </div>
            </div>
          )}

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
                {Object.keys(censusData).length === Object.keys(allCensusData).length ? (
                  <p className="text-xs text-green-600 mt-1">
                    Displaying all available census tracts
                  </p>
                ) : (
                  <p className="text-xs text-blue-600 mt-1">
                    Zoom in to see all {Object.keys(allCensusData).length.toLocaleString()} tracts
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* Statistics Overview */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10 min-w-[280px]">
          {statistics ? (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                Simulation Status
              </h3>
              <div className="text-xs text-gray-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Day:</span>
                  <span className="font-bold text-blue-600">{statistics.day}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Infectious:</span>
                  <span className="font-bold text-red-600">{(statistics.infectious || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Recovered:</span>
                  <span className="font-bold text-blue-600">{(statistics.recovered || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Deceased:</span>
                  <span className="font-bold text-gray-600">{(statistics.deceased || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Affected Areas:</span>
                  <span className="font-bold text-orange-600">{(statistics.infected_areas || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Infection Rate:</span>
                  <span className="font-bold text-red-500">{(statistics.infection_rate || 0).toFixed(2)}%</span>
                </div>
                {initialInfectionNode && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center text-red-600">
                      <div className="w-2 h-2 bg-red-600 rounded-full mr-2"></div>
                      <span className="text-xs font-medium">Started: {initialInfectionNode}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-2">Census Data</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Zoom: {currentZoom}</div>
                <div>Showing: {Object.keys(censusData).length.toLocaleString()} tracts</div>
                <div>Total: {Object.keys(allCensusData).length.toLocaleString()} tracts</div>
                {currentZoom <= 5 && (
                  <div className="text-blue-600 font-medium">Zoom to level 6+ to see census data</div>
                )}
                {currentZoom >= 6 && Object.keys(censusData).length > 0 && (
                  <div className="text-green-600 font-medium">Click a tract to start simulation</div>
                )}
              </div>
            </div>
          )}
        </div>
        
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