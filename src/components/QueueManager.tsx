import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import AddCarForm from './AddCarForm';
import AddMotorcycleForm from './AddMotorcycleForm';
import QueueList from './QueueList';
import { Car, Motor } from '../types';
import { Plus, X } from 'lucide-react';

const QueueManager: React.FC = () => {
  const { cars, motorcycles, loading, error } = useQueue();
  const [showAddForm, setShowAddForm] = useState(false);
  const [vehicleType, setVehicleType] = useState<'car' | 'motorcycle'>('car');

  const handleAddComplete = () => {
    setShowAddForm(false);
  };

  const handleAddVehicle = () => {
    setShowAddForm(true);
  };

  const getCurrentVehicles = () => {
    if (vehicleType === 'car') {
      return cars;
    } else {
      return motorcycles;
    }
  };

  const getVehicleTypeLabel = () => {
    return vehicleType === 'car' ? 'Cars' : 'Motorcycles';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">Error loading queue</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with vehicle type toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
            Queue Manager
          </h1>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            Manage your service queue for {getVehicleTypeLabel().toLowerCase()}
          </p>
        </div>
        
        {/* Vehicle Type Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Vehicle Type:
          </span>
          <div className="flex bg-surface-light dark:bg-surface-dark rounded-lg p-1 border border-border-light dark:border-border-dark">
            <button
              onClick={() => setVehicleType('car')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                vehicleType === 'car'
                  ? 'bg-brand-blue text-white'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
              }`}
            >
              Cars
            </button>
            <button
              onClick={() => setVehicleType('motorcycle')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                vehicleType === 'motorcycle'
                  ? 'bg-brand-blue text-white'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
              }`}
            >
              Motorcycles
            </button>
          </div>
        </div>
      </div>

      {/* Add Vehicle Button */}
      {!showAddForm && (
        <div className="flex justify-center">
          <button
            onClick={handleAddVehicle}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand-blue hover:bg-brand-dark-blue transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add {vehicleType === 'car' ? 'Car' : 'Motorcycle'}
          </button>
        </div>
      )}

      {/* Add Vehicle Form */}
      {showAddForm && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-border-light dark:border-border-dark">
          {vehicleType === 'car' ? (
            <AddCarForm onComplete={handleAddComplete} />
          ) : (
            <AddMotorcycleForm onComplete={handleAddComplete} />
          )}
        </div>
      )}

      {/* Queue List */}
      <QueueList 
        vehicles={getCurrentVehicles()} 
        vehicleType={vehicleType}
      />
    </div>
  );
};

export default QueueManager;