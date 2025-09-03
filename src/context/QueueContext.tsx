import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Car, Motor, Service, CrewMember, ServicePackage } from '../types';
import { supabase } from '../lib/supabase';
import { validateLicensePlate, validateMotorcyclePlate, validateMotorcycleModel, validatePhoneNumber, validateCost, validateMotorcycleSize, validateServiceStatus } from '../lib/validation';
import { useLoadingState, executeWithLoadingState } from '../hooks/useLoadingState';

interface QueueContextType {
  cars: Car[];
  motorcycles: Motor[];
  services: Service[];
  crews: CrewMember[];
  packages: ServicePackage[];
  loading: boolean;
  error: string | null;
  // Enhanced loading state
  isOperationLoading: boolean;
  operationError: string | null;
  isTransactionInProgress: (vehicleId: string) => boolean;
  addCar: (car: Omit<Car, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCar: (id: string, updates: Partial<Car>) => Promise<void>;
  removeCar: (id: string) => Promise<void>;
  addMotorcycle: (motorcycle: Omit<Motor, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateMotorcycle: (id: string, updates: Partial<Motor>) => Promise<void>;
  removeMotorcycle: (id: string) => Promise<void>;
  addCrew: (crew: Omit<CrewMember, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCrew: (id: string, updates: Partial<CrewMember>) => Promise<void>;
  removeCrew: (id: string) => Promise<void>;
  addService: (service: Omit<Service, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateService: (id: string, updates: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  addPackage: (pkg: Omit<ServicePackage, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePackage: (id: string, updates: Partial<ServicePackage>) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  searchCarHistory: (plate: string) => Promise<Car | null>;
  searchMotorcycleHistory: (plate: string) => Promise<Motor | null>;
  clearError: () => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [crews, setCrews] = useState<CrewMember[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced loading state management
  const loadingState = useLoadingState();
  
  // Track active operations to prevent conflicts
  const activeOperationsRef = useRef<Set<string>>(new Set());
  const subscriptionsRef = useRef<any[]>([]);

  // Optimistic update helpers
  const addActiveOperation = useCallback((operation: string) => {
    activeOperationsRef.current.add(operation);
  }, []);

  const removeActiveOperation = useCallback((operation: string) => {
    activeOperationsRef.current.delete(operation);
  }, []);

  const isOperationActive = useCallback((operation: string) => {
    return activeOperationsRef.current.has(operation);
  }, []);

  // Enhanced transaction state management
  const isTransactionInProgress = useCallback((vehicleId: string) => {
    return loadingState.isOperationActive(`car-update-${vehicleId}`) || 
           loadingState.isOperationActive(`motorcycle-update-${vehicleId}`);
  }, [loadingState]);

  // Essential fetch functions
  const fetchCars = useCallback(async () => {
    if (isOperationActive('cars-fetch')) return;
    
    try {
      addActiveOperation('cars-fetch');
      setError(null);

      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching cars:', error);
        throw error;
      }
      
      const transformedCars = (data || []).map(car => ({
        ...car,
        services: car.services || [],
        crew: car.crew || [],
        total_cost: car.total_cost || 0,
        created_at: car.created_at || new Date().toISOString(),
        updated_at: car.updated_at || new Date().toISOString(),
      }));
      
      setCars(transformedCars);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching cars:', err);
      setError(`Failed to load queue: ${errorMessage}`);
    } finally {
      removeActiveOperation('cars-fetch');
    }
  }, [addActiveOperation, removeActiveOperation, isOperationActive]);

  const fetchMotorcycles = useCallback(async () => {
    if (isOperationActive('motorcycles-fetch')) return;
    
    try {
      addActiveOperation('motorcycles-fetch');
      setError(null);

      const { data, error } = await supabase
        .from('motorcycles')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching motorcycles:', error);
        throw error;
      }
      
      const transformedMotorcycles = (data || []).map(motorcycle => ({
        ...motorcycle,
        services: motorcycle.services || [],
        crew: motorcycle.crew || [],
        total_cost: motorcycle.total_cost || 0,
        created_at: motorcycle.created_at || new Date().toISOString(),
        updated_at: motorcycle.updated_at || new Date().toISOString(),
      }));
      
      setMotorcycles(transformedMotorcycles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching motorcycles:', err);
      setError(`Failed to load motorcycles: ${errorMessage}`);
    } finally {
      removeActiveOperation('motorcycles-fetch');
    }
  }, [addActiveOperation, removeActiveOperation, isOperationActive]);

  const fetchServices = useCallback(async () => {
    if (isOperationActive('services-fetch')) return;
    
    try {
      addActiveOperation('services-fetch');
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase error fetching services:', error);
        throw error;
      }
      
      setServices(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching services:', err);
      setError(`Failed to load services: ${errorMessage}`);
    } finally {
      removeActiveOperation('services-fetch');
    }
  }, [addActiveOperation, removeActiveOperation, isOperationActive]);

  const fetchCrews = useCallback(async () => {
    if (isOperationActive('crews-fetch')) return;
    
    try {
      addActiveOperation('crews-fetch');
      const { data, error } = await supabase
        .from('crew_members')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase error fetching crews:', error);
        throw error;
      }
      
      setCrews(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching crews:', err);
      setError(`Failed to load crew members: ${errorMessage}`);
    } finally {
      removeActiveOperation('crews-fetch');
    }
  }, [addActiveOperation, removeActiveOperation, isOperationActive]);

  const fetchPackages = useCallback(async () => {
    if (isOperationActive('packages-fetch')) return;
    try {
      addActiveOperation('packages-fetch');
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name', { ascending: true });
      if (error) {
        console.error('Supabase error fetching packages:', error);
        throw error;
      }
      setPackages(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching packages:', err);
      setError(`Failed to load service packages: ${errorMessage}`);
    } finally {
      removeActiveOperation('packages-fetch');
    }
  }, [addActiveOperation, removeActiveOperation, isOperationActive]);

  // Initial data loading effect
  useEffect(() => {
    // Initial data fetch
    Promise.all([
      fetchCars(),
      fetchMotorcycles(),
      fetchServices(),
      fetchCrews(),
      fetchPackages()
    ]).finally(() => {
      setLoading(false);
    });
  }, [fetchCars, fetchMotorcycles, fetchServices, fetchCrews, fetchPackages]);

  // Update functions with enhanced loading states
  const updateCar = async (id: string, updates: Partial<Car>) => {
    const operationId = `car-update-${id}`;
    if (isOperationActive(operationId)) return;

    try {
      addActiveOperation(operationId);

      // Patch: Ensure timestamps are set for status transitions
      let patchedUpdates = { ...updates };
      // Fetch current car for reference
      const currentCar = cars.find(c => c.id === id);
      if (updates.status === 'in-progress' && (!currentCar?.time_in_progress && !updates.time_in_progress)) {
        patchedUpdates.time_in_progress = new Date().toISOString();
      }
      if (updates.status === 'completed' && (!currentCar?.completed_at && !updates.completed_at)) {
        patchedUpdates.completed_at = new Date().toISOString();
      }
      if (updates.status === 'waiting' && (!currentCar?.time_waiting && !updates.time_waiting)) {
        patchedUpdates.time_waiting = new Date().toISOString();
      }

      // Use enhanced loading state management for completion operations
      const operationType = updates.status === 'completed' ? 'completion' : 'status_update';

      await executeWithLoadingState(
        loadingState,
        operationId,
        async () => {
          const result = await supabase
            .from('cars')
            .update({ ...patchedUpdates, updated_at: new Date().toISOString() })
            .eq('id', id);

          if (result.error) {
            console.error('Supabase error updating car:', result.error);
            throw new Error(`Failed to update vehicle: ${result.error.message}`);
          }

          return result;
        },
        {
          type: operationType,
          maxRetries: updates.status === 'completed' ? 3 : 1,
          retryDelay: 1000,
          verifyOperation: updates.status === 'completed' ? async () => {
            const { data: verifyData } = await supabase
              .from('cars')
              .select('status')
              .eq('id', id)
              .single();
            return verifyData?.status === 'completed';
          } : undefined,
          onRetry: (attempt, error) => {
            console.warn(`Retrying car update (attempt ${attempt}):`, error.message);
          }
        }
      );

      // Optimistically update local state
      setCars(prev => prev.map(c => c.id === id ? { ...c, ...patchedUpdates, updated_at: new Date().toISOString() } : c));
    } catch (err) {
      console.error('Error in updateCar:', err);
      throw err;
    } finally {
      removeActiveOperation(operationId);
    }
  };

  const updateMotorcycle = async (id: string, updates: Partial<Motor>) => {
    const operationId = `motorcycle-update-${id}`;
    if (isOperationActive(operationId)) return;

    try {
      addActiveOperation(operationId);

      // Patch: Ensure timestamps are set for status transitions
      let patchedUpdates = { ...updates };
      // Fetch current motorcycle for reference
      const currentMotorcycle = motorcycles.find(m => m.id === id);
      if (updates.status === 'in-progress' && (!currentMotorcycle?.time_in_progress && !updates.time_in_progress)) {
        patchedUpdates.time_in_progress = new Date().toISOString();
      }
      if (updates.status === 'completed' && (!currentMotorcycle?.completed_at && !updates.completed_at)) {
        patchedUpdates.completed_at = new Date().toISOString();
      }
      if (updates.status === 'waiting' && (!currentMotorcycle?.time_waiting && !updates.time_waiting)) {
        patchedUpdates.time_waiting = new Date().toISOString();
      }

      const operationType = updates.status === 'completed' ? 'completion' : 'status_update';

      await executeWithLoadingState(
        loadingState,
        operationId,
        async () => {
          const result = await supabase
            .from('motorcycles')
            .update({ ...patchedUpdates, updated_at: new Date().toISOString() })
            .eq('id', id);

          if (result.error) {
            console.error('Supabase error updating motorcycle:', result.error);
            throw new Error(`Failed to update motorcycle: ${result.error.message}`);
          }

          return result;
        },
        {
          type: operationType,
          maxRetries: updates.status === 'completed' ? 3 : 1,
          retryDelay: 1000,
          verifyOperation: updates.status === 'completed' ? async () => {
            const { data: verifyData } = await supabase
              .from('motorcycles')
              .select('status')
              .eq('id', id)
              .single();
            return verifyData?.status === 'completed';
          } : undefined,
          onRetry: (attempt, error) => {
            console.warn(`Retrying motorcycle update (attempt ${attempt}):`, error.message);
          }
        }
      );

      // Optimistically update local state
      setMotorcycles(prev => prev.map(m => m.id === id ? { ...m, ...patchedUpdates, updated_at: new Date().toISOString() } : m));
    } catch (err) {
      console.error('Error in updateMotorcycle:', err);
      throw err;
    } finally {
      removeActiveOperation(operationId);
    }
  };

  const clearError = useCallback(() => {
    setError(null);
    loadingState.setError(null);
  }, [loadingState]);

  // Essential CRUD operations
  const addCar = async (car: Omit<Car, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .insert([{ ...car }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding car:', error);
        throw new Error(`Failed to add vehicle: ${error.message}`);
      }
      
      if (data) {
        setCars(prevCars => [data as Car, ...prevCars]);
      }
    } catch (err) {
      console.error('Error in addCar:', err);
      throw err;
    }
  };

  const removeCar = async (id: string) => {
    const operationId = `car-remove-${id}`;
    if (isOperationActive(operationId)) return;

    try {
      addActiveOperation(operationId);
      const { error } = await supabase
        .from('cars')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Supabase error removing car:', error);
        throw new Error(`Failed to remove vehicle: ${error.message}`);
      }
      setCars(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error in removeCar:', err);
      throw err;
    } finally {
      removeActiveOperation(operationId);
    }
  };

  const addMotorcycle = async (motorcycle: Omit<Motor, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const motorcyclePayload = {
        ...motorcycle,
        vehicle_type: 'motorcycle'
      };

      const { data, error } = await supabase
        .from('motorcycles')
        .insert([motorcyclePayload])
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding motorcycle:', error);
        throw new Error(`Failed to add motorcycle: ${error.message}`);
      }
      
      if (data) {
        setMotorcycles(prevMotorcycles => [data as Motor, ...prevMotorcycles]);
      }
    } catch (err) {
      console.error('Error in addMotorcycle:', err);
      throw err;
    }
  };

  const removeMotorcycle = async (id: string) => {
    const operationId = `motorcycle-remove-${id}`;
    if (isOperationActive(operationId)) return;

    try {
      addActiveOperation(operationId);
      const { error } = await supabase
        .from('motorcycles')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Supabase error removing motorcycle:', error);
        throw new Error(`Failed to remove motorcycle: ${error.message}`);
      }
      setMotorcycles(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error in removeMotorcycle:', err);
      throw err;
    } finally {
      removeActiveOperation(operationId);
    }
  };

  const addCrew = async (crew: Omit<CrewMember, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('crew_members')
        .insert([{ ...crew }]);

      if (error) {
        console.error('Supabase error adding crew member:', error);
        throw new Error(`Failed to add crew member: ${error.message}`);
      }
    } catch (err) {
      console.error('Error in addCrew:', err);
      throw err;
    }
  };

  const updateCrew = async (id: string, updates: Partial<CrewMember>) => {
    const operationId = `crew-update-${id}`;
    if (isOperationActive(operationId)) return;

    try {
      addActiveOperation(operationId);
      const { error } = await supabase
        .from('crew_members')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Supabase error updating crew member:', error);
        throw new Error(`Failed to update crew member: ${error.message}`);
      }
    } catch (err) {
      console.error('Error in updateCrew:', err);
      throw err;
    } finally {
      removeActiveOperation(operationId);
    }
  };

  const removeCrew = async (id: string) => {
    const operationId = `crew-remove-${id}`;
    if (isOperationActive(operationId)) return;
    
    try {
      addActiveOperation(operationId);
      const { error } = await supabase
        .from('crew_members')
        .update({ is_deleted: true })
        .eq('id', id);
        
      if (error) {
        console.error('Supabase error removing crew member:', error);
        throw new Error(`Failed to remove crew member: ${error.message}`);
      }
    } catch (err) {
      console.error('Error in removeCrew:', err);
      throw err;
    } finally {
      removeActiveOperation(operationId);
    }
  };

  const addService = async (service: Omit<Service, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('services')
        .insert([{ ...service }]);

      if (error) {
        console.error('Supabase error adding service:', error);
        throw new Error(`Failed to add service: ${error.message}`);
      }
    } catch (err) {
      console.error('Error in addService:', err);
      throw err;
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    try {
      const { error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Supabase error updating service:', error);
        throw new Error(`Failed to update service: ${error.message}`);
      }
    } catch (err) {
      console.error('Error in updateService:', err);
      throw err;
    }
  };

  const deleteService = async (id: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) {
        console.error('Supabase error deleting service:', error);
        throw new Error(`Failed to delete service: ${error.message}`);
      }
    } catch (err) {
      console.error('Error in deleteService:', err);
      throw err;
    }
  };

  const addPackage = async (pkg: Omit<ServicePackage, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('service_packages')
        .insert([{ ...pkg }]);

      if (error) {
        console.error('Supabase error adding package:', error);
        throw new Error(`Failed to add package: ${error.message}`);
      }
    } catch (err) {
      console.error('Error in addPackage:', err);
      throw err;
    }
  };

  const updatePackage = async (id: string, updates: Partial<ServicePackage>) => {
    try {
      const { error } = await supabase
        .from('service_packages')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Supabase error updating package:', error);
        throw new Error(`Failed to update package: ${error.message}`);
      }
    } catch (err) {
      console.error('Error in updatePackage:', err);
      throw err;
    }
  };

  const deletePackage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_packages')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) {
        console.error('Supabase error deleting package:', error);
        throw new Error(`Failed to delete package: ${error.message}`);
      }
    } catch (err) {
      console.error('Error in deletePackage:', err);
      throw err;
    }
  };

  const searchCarHistory = async (plate: string): Promise<Car | null> => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('plate', plate.toUpperCase().trim())
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error searching car history:', error);
        return null;
      }

      return data as Car || null;
    } catch (err) {
      console.error('Error in searchCarHistory:', err);
      return null;
    }
  };

  const searchMotorcycleHistory = async (plate: string): Promise<Motor | null> => {
    try {
      const { data, error } = await supabase
        .from('motorcycles')
        .select('*')
        .eq('plate', plate.toUpperCase().trim())
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error searching motorcycle history:', error);
        return null;
      }

      return data as Motor || null;
    } catch (err) {
      console.error('Error in searchMotorcycleHistory:', err);
      return null;
    }
  };

  return (
    <QueueContext.Provider value={{
      cars,
      motorcycles,
      services,
      crews,
      packages,
      loading,
      error,
      // Enhanced loading state
      isOperationLoading: loadingState.isLoading,
      operationError: loadingState.error,
      isTransactionInProgress,
      addCar,
      updateCar,
      removeCar,
      addMotorcycle,
      updateMotorcycle,
      removeMotorcycle,
      addCrew,
      updateCrew,
      removeCrew,
      addService,
      updateService,
      deleteService,
      addPackage,
      updatePackage,
      deletePackage,
      searchCarHistory,
      searchMotorcycleHistory,
      clearError,
    }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};