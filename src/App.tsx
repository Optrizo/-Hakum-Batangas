import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueueProvider } from './context/QueueContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import QueueManager from './components/QueueManager';
import CustomerView from './components/CustomerView';
import CrewManager from './components/CrewManager';
import ServicesPage from './components/ServicesPage';
import ErrorBoundary from './components/ErrorBoundary';
import MotorcycleServicesPage from './components/MotorcycleServicesPage';
import EditMotorcyclePackagePage from './components/EditMotorcyclePackagePage';

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ThemeProvider>
      <QueueProvider>
        <Routes>
          <Route path="/" element={<Layout><QueueManager /></Layout>} />
          <Route path="/customer" element={<CustomerView />} />
          <Route path="/crew" element={<Layout><CrewManager /></Layout>} />
          <Route path="/services" element={<Layout><ServicesPage /></Layout>} />
          <Route path="/motorcycle-services" element={<Layout><MotorcycleServicesPage /></Layout>} />
          <Route path="/motorcycle-packages/edit/:id" element={<EditMotorcyclePackagePage />} />
        </Routes>
      </QueueProvider>
      </ThemeProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;