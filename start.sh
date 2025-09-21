#!/bin/bash

# Cura Pandemic Simulation Startup Script

echo "🦠 Starting Cura Pandemic Simulation..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment
echo "🐍 Activating Python environment..."
source .venv/bin/activate

# Install Python dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Check if census data exists
if [ ! -f "us_census_graph.json" ]; then
    echo "🗺️  Generating census data (this may take a few minutes)..."
    python main.py
fi

# Copy census data to frontend public directory
echo "📋 Copying census data to frontend..."
cp us_census_graph.json frontend/public/

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "1. Backend:  python ../api_server.py"
echo "2. Frontend: npm run dev"
echo ""
echo "Then open: http://localhost:5173"