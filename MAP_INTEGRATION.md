# Cura Pandemic Simulation with Census Tract Mapping

This project integrates U.S. Census tract data with a Mapbox visualization to display pandemic simulation results across the United States. The system replaces simple point-based visualization with real geographic census tract data.

## Features

### Enhanced Map Visualization
- **Real Census Data**: Displays 83,000+ U.S. census tracts with actual geographic coordinates
- **Population-based Sizing**: Circle sizes represent population density
- **Infection Status Colors**: Visual indicators for health status
  - Green: Healthy (0% infection)
  - Yellow: Low infection (0-1%)
  - Orange: Medium infection (1-5%)
  - Red: High infection (5-10%)
  - Dark Red: Critical infection (10%+)
  - Purple: Quarantined areas
- **Interactive Selection**: Click on any tract to view detailed information
- **Performance Optimized**: Displays first 5,000 tracts for optimal performance

### Data Integration
- **SIR Model**: Susceptible, Infectious, Recovered, Deceased populations
- **Healthcare Capacity**: Per-tract healthcare capacity tracking
- **Quarantine Status**: Visual indicators for quarantined areas
- **Population Density**: Areas per km² for epidemiological modeling

## Getting Started

### Prerequisites
- Node.js 16+ for frontend
- Python 3.8+ for backend
- Mapbox API token (free tier available)

### Setup

1. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Install Backend Dependencies**
   ```bash
   # Create virtual environment
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   
   # Install packages
   pip install -r requirements.txt
   ```

3. **Configure Environment**
   - Mapbox token is already configured in `frontend/.env`
   - Backend API URL: `http://localhost:8000`

4. **Generate Census Data** (if needed)
   ```bash
   python main.py  # Generates tract_nodes.csv and us_census_graph.json
   ```

### Running the Application

1. **Start Backend Server**
   ```bash
   python api_server.py
   ```
   Server runs on `http://localhost:8000`

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

3. **Access Application**
   - Open browser to `http://localhost:5173`
   - Navigate to simulation page
   - View U.S. census tract map with pandemic data

## API Endpoints

### Backend REST API
- `GET /api/health` - Health check
- `GET /api/census-data` - Get all census tract data
- `GET /api/census-data?limit=N` - Get limited census data
- `GET /api/census-data/{geoid}` - Get specific tract
- `GET /api/statistics` - Get simulation statistics
- `POST /api/simulation/start` - Start simulation
- `POST /api/simulation/{id}/stop` - Stop simulation
- `POST /api/simulation/{id}/reset` - Reset simulation
- `GET /api/simulation/{id}/state` - Get simulation state

### Data Format

Census tract nodes contain:
```typescript
{
  id: string;                    // GEOID (state+county+tract)
  lon: number;                   // Longitude
  lat: number;                   // Latitude
  population: number;            // Total population
  area_km2: number;              // Area in square kilometers
  population_density: number;    // People per km²
  neighbors: string[];           // Neighboring tract GEOIDs
  susceptible_pop: number;       // SIR model: Susceptible
  infectious_pop: number;        // SIR model: Infectious
  recovered_pop: number;         // SIR model: Recovered
  deceased_pop: number;          // SIR model: Deceased
  mobility_factor: number;       // Movement factor
  climate_factor: number;        // Environmental factor
  healthcare_capacity: number;   // Healthcare resources
  is_quarantined: boolean;       // Quarantine status
}
```

## Architecture

### Frontend (React + TypeScript + Mapbox)
- **SimulationPage**: Main map interface with controls
- **ApiService**: Backend communication layer
- **Mapbox Integration**: Geographic visualization
- **Real-time Updates**: Live simulation data

### Backend (Python + Flask)
- **Census Data Loading**: U.S. Census Bureau integration
- **Simulation Engine**: SIR model with spatial spreading
- **REST API**: Data serving and simulation control
- **Graph Algorithms**: Neighbor detection using Queen contiguity

### Data Sources
- **U.S. Census Bureau**: Cartographic boundary files (500k resolution)
- **American Community Survey**: Population data
- **libpysal**: Spatial neighbor calculation
- **Custom SIR Model**: Disease spread simulation

## Performance Considerations

- **Frontend Optimization**: Displays subset of tracts for performance
- **Data Streaming**: Large datasets loaded efficiently
- **Spatial Indexing**: Quick neighbor lookups
- **Memory Management**: Efficient data structures

## Troubleshooting

### Common Issues
1. **Mapbox Not Loading**: Check API token in `.env` file
2. **No Data Displayed**: Ensure `us_census_graph.json` exists in `frontend/public/`
3. **Backend Connection Failed**: Verify Flask server is running on port 8000
4. **Performance Issues**: Reduce data limit in API calls

### Data Updates
To update census data:
```bash
# Run data collection script
python main.py
# Copy to frontend
cp us_census_graph.json frontend/public/
```

## Future Enhancements
- WebGL rendering for better performance
- Real-time streaming updates
- Advanced filtering and search
- Additional demographic data integration
- Mobile-responsive design