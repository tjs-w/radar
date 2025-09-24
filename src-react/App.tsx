import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Footer from './components/layout/Footer';
import Header from './components/layout/Header';
import MainContent from './components/layout/MainContent';
import { AppProvider } from './context/AppContext';
import { FullscreenProvider } from './context/FullscreenContext';
import { ThemeProvider } from './context/ThemeContext';
import { useBackendService } from './hooks/useBackendNetwork';
import logger from './utils/logger';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: var(--background);
  color: var(--text-primary);
  overflow: hidden;
`;

const AppContainer: React.FC = () => {
  const {
    services,
    publicNetworkInfo,
    isScanning,
    scanProgress,
    startNetworkScan,
    stopNetworkScan,
    fetchPublicNetworkInfo,
    loadSavedServices,
  } = useBackendService();

  useEffect(() => {
    logger.debug('Services array updated', { count: services.length });
  }, [services]);

  const [filterOptions, setFilterOptions] = useState({
    searchTerm: '',
    serviceTypes: [] as string[],
    discoveryMethods: [] as string[],
  });

  // Initialize app on mount
  useEffect(() => {
    const initializeApp = async () => {
      // Load saved services
      await loadSavedServices();

      // Fetch public network info
      await fetchPublicNetworkInfo();

      // Auto start network scan
      await startNetworkScan();
    };

    initializeApp();
  }, [loadSavedServices, fetchPublicNetworkInfo, startNetworkScan]);

  // Handle scan button clicks
  const handleScan = async () => {
    if (isScanning) {
      await stopNetworkScan();
    } else {
      await startNetworkScan();
    }
  };

  // Update filter options
  const handleFilterChange = (newOptions: Partial<typeof filterOptions>) => {
    setFilterOptions(prev => ({ ...prev, ...newOptions }));
  };

  return (
    <Container>
      <Header onScan={handleScan} isScanning={isScanning} />

      <MainContent
        services={services}
        publicNetworkInfo={publicNetworkInfo}
        isScanning={isScanning}
        scanProgress={scanProgress}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
      />

      <Footer />
    </Container>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <FullscreenProvider>
          <AppContainer />
        </FullscreenProvider>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
