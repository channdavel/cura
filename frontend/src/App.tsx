import React, { useState } from 'react';
import { LandingPage } from './screens/LandingPage/LandingPage';
import { StatsPage } from './screens/StatsPage/StatsPage';
import { FeaturesPage } from './screens/FeaturesPage/FeaturesPage';
import { SimulationPage } from './screens/SimulationPage/SimulationPage';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'landing' | 'simulation'>('landing');

  const handleNavigateToSimulation = () => {
    setCurrentPage('simulation');
  };

  const handleNavigateToLanding = () => {
    setCurrentPage('landing');
  };

  return (
    <div className="min-h-screen">
      {currentPage === 'landing' ? (
        <div>
          <LandingPage onStartSimulation={handleNavigateToSimulation} />
          <StatsPage />
          <FeaturesPage onStartSimulation={handleNavigateToSimulation} />
        </div>
      ) : (
        <SimulationPage onBackToLanding={handleNavigateToLanding} />
      )}
    </div>
  );
};