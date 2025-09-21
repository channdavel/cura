import React from 'react';

interface NavigationProps {
  currentPage: 'landing' | 'simulation';
  onNavigate: (page: 'landing' | 'simulation') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate }) => {
  return (
    <nav className="bg-gray-800 text-white px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">Cura</h1>
          <span className="text-gray-300">Epidemic Simulation Platform</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onNavigate('landing')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentPage === 'landing'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            Home
          </button>
          
          <button
            onClick={() => onNavigate('simulation')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentPage === 'simulation'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            Simulate Map
          </button>
        </div>
      </div>
    </nav>
  );
};