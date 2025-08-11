import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Car, Motor, Service, CrewMember, ServicePackage } from '../types';
import { supabase } from '../lib/supabase';
import { validateLicensePlate, validateMotorcyclePlate, validateMotorcycleModel, validatePhoneNumber, validateCost, validateMotorcycleSize, validateServiceStatus } from '../lib/validation';

interface QueueContextType {
  cars: Car[];
  motorcycles: Motor[];
  services: Service[];
  crews: CrewMember[];
  packages: ServicePackage[];
  loading: boolean;
  error: string | null;
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

    // Set up simplified real-time subscriptions
    const carsChannel = supabase
      .channel('cars-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'cars' 
        },
        () => {
          // Simple debounced refetch
          setTimeout(() => {
            if (!isOperationActive('cars-fetch')) {
              fetchCars();
            }
          }, 500);
        }
      )
      .subscribe();

    const servicesChannel = supabase
      .channel('services-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'services' 
        },
        () => {
          // Only refetch if not currently performing service operations
          setTimeout(() => {
            if (!isOperationActive('services-fetch') && !isOperationActive('service-operation')) {
              fetchServices();
            }
          }, 1000); // Longer delay for services to prevent typing interruption
        }
      )
      .subscribe();

    const crewsChannel = supabase
      .channel('crews-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'crew_members' 
        },
        () => {
          setTimeout(() => {
            if (!isOperationActive('crews-fetch')) {
              fetchCrews();
            }
          }, 500);
        }
      )
      .subscribe();

    const packagesChannel = supabase
      .channel('packages-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'service_packages' 
        },
        () => {
          setTimeout(() => {
            if (!isOperationActive('packages-fetch') && !isOperationActive('package-operation')) {
              fetchPackages();
            }
          }, 1000); // Longer delay for packages to prevent typing interruption
        }
      )
      .subscribe();

    const motorcyclesChannel = supabase
      .channel('motorcycles-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'motorcycles' 
        },
        () => {
          // Simple debounced refetch
          setTimeout(() => {
            if (!isOperationActive('motorcycles-fetch')) {
              fetchMotorcycles();
            }
          }, 500);
        }
      )
      .subscribe();

    // Store subscriptions for cleanup
    subscriptionsRef.current = [carsChannel, motorcyclesChannel, servicesChannel, crewsChannel, packagesChannel];

    return () => {
      console.log('Cleaning up subscriptions...');
      subscriptionsRef.current.forEach(channel => channel.unsubscribe());
    };
  }, [fetchCars, fetchMotorcycles, fetchServices, fetchCrews, fetchPackages, isOperationActive]);

  const addCar = async (car: Omit<Car, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Validate license plate format before sending to DB
      const plateValidation = validateLicensePlate(car.plate);
      if (!plateValidation.isValid) {
        throw new Error(plateValidation.error);
      }
      
      const { data, error } = await supabase
        .from('cars')
        .insert([
          { ...car }
        ])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error(`A car with license plate "${car.plate}" might already be in the queue.`);
        }
        throw error;
      }

      if (data) {
        // Optimistic update: add the new car to the local state immediately
        setCars(prevCars => [data as Car, ...prevCars]);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while adding the car.';
      console.error("Error in addCar:", errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateCar = async (id: string, updates: Partial<Car>) => {
    const operationId = `car-update-${id}`;
    if (isOperationActive(operationId)) return;

    // Validate ID
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid vehicle ID provided.');
    }

    // Duplicate check: prevent updating to a plate already in use by another active car
    if (updates.plate !== undefined) {
      const trimmedPlate = updates.plate.trim().toUpperCase();
      const isDuplicate = cars.some(
        c => c.id !== id &&
             c.plate.trim().toUpperCase() === trimmedPlate &&
             (c.status === 'waiting' || c.status === 'in-progress')
      );
      if (isDuplicate) {
        throw new Error('This license plate is already in the active queue for another vehicle.');
      }
    }

    // Sanitize and validate updates
    const sanitizedUpdates: Partial<Car> = {};
    
    if (updates.plate !== undefined) {
      const plateResult = validateLicensePlate(updates.plate);
      if (!plateResult.isValid) {
        throw new Error(plateResult.error || 'Invalid license plate format.');
      }
      sanitizedUpdates.plate = updates.plate.toUpperCase().trim();
    }

    if (updates.model !== undefined) {
      if (!updates.model.trim()) {
        throw new Error('Car model cannot be empty.');
      }
      sanitizedUpdates.model = updates.model.trim();
    }

    if (updates.phone !== undefined) {
      if (updates.phone && updates.phone.trim()) {
        const phoneRegex = /^(09|\+639)\d{9}$/;
        if (!phoneRegex.test(updates.phone.replace(/\s/g, ''))) {
          throw new Error('Invalid phone number format. Please use Philippine format: 09XXXXXXXXX or +639XXXXXXXXX');
        }
      }
      sanitizedUpdates.phone = updates.phone ? updates.phone.trim() : '';
    }

    if (updates.total_cost !== undefined) {
      if (updates.total_cost < 0) {
        throw new Error('Total cost cannot be negative.');
      }
      sanitizedUpdates.total_cost = Math.max(0, updates.total_cost);
    }

    // Add other fields that don't need special validation
    if (updates.size !== undefined) sanitizedUpdates.size = updates.size;
    if (updates.status !== undefined) sanitizedUpdates.status = updates.status;
    if (updates.service !== undefined) sanitizedUpdates.service = updates.service ? updates.service.trim() : '';
    if (updates.services !== undefined) sanitizedUpdates.services = updates.services;
    if (updates.crew !== undefined) sanitizedUpdates.crew = updates.crew;

    try {
      addActiveOperation(operationId);
      const { error } = await supabase
        .from('cars')
        .update({ ...sanitizedUpdates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Supabase error updating car:', error);
        if (error.code === '42501') {
          throw new Error('Access denied. You do not have permission to update this vehicle.');
        } else if (error.code === '42P01') {
          throw new Error('Database table not found. Please contact support.');
        } else {
        throw new Error(`Failed to update vehicle: ${error.message}`);
        }
      }
      // Optimistically update local state
      setCars(prev => prev.map(c => c.id === id ? { ...c, ...sanitizedUpdates, updated_at: new Date().toISOString() } : c));
    } catch (err) {
      console.error('Error in updateCar:', err);
      // Re-throw the original error if it's already an Error instance
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(`An unknown error occurred while updating the vehicle.`);
    } finally {
      removeActiveOperation(operationId);
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
      // Update local state immediately
      setCars(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error in removeCar:', err);
       if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while removing the vehicle.');
    } finally {
      removeActiveOperation(operationId);
    }
  };

  const addMotorcycle = async (motorcycle: Omit<Motor, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Validate motorcycle plate
      const plateValidation = validateMotorcyclePlate(motorcycle.plate);
      if (!plateValidation.isValid) {
        throw new Error(plateValidation.error);
      }
      // Validate model
      const modelValidation = validateMotorcycleModel(motorcycle.model);
      if (!modelValidation.isValid) {
        throw new Error(modelValidation.error);
      }
      // Validate size
      const sizeValidation = validateMotorcycleSize(motorcycle.size);
      if (!sizeValidation.isValid) {
        throw new Error(sizeValidation.error);
      }
      // Validate status
      const statusValidation = validateServiceStatus(motorcycle.status);
      if (!statusValidation.isValid) {
        throw new Error(statusValidation.error);
      }
      // Validate cost
      const costValidation = validateCost(motorcycle.total_cost);
      if (!costValidation.isValid) {
        throw new Error(costValidation.error);
      }
      // Validate phone (optional)
      if (motorcycle.phone && motorcycle.phone.trim()) {
        const phoneValidation = validatePhoneNumber(motorcycle.phone);
        if (!phoneValidation.isValid) {
          throw new Error(phoneValidation.error);
        }
      }

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
        if (error.code === '23505') {
          throw new Error(`A motorcycle with license plate "${motorcycle.plate}" might already be in the queue.`);
        }
        throw error;
      }
      
      if (data) {
        // Optimistic update: add the new motorcycle to the local state immediately
        setMotorcycles(prevMotorcycles => [data as Motor, ...prevMotorcycles]);
      }

    } catch (err) {
      // Log the full error object for debugging
      console.error('Error in addMotorcycle:', err);
      let errorMessage = 'An unknown error occurred while adding the motorcycle.';
      if (err && typeof err === 'object') {
        if ('message' in err) errorMessage = (err as any).message;
        if ('details' in err && (err as any).details) errorMessage += `\nDetails: ${(err as any).details}`;
        if ('hint' in err && (err as any).hint) errorMessage += `\nHint: ${(err as any).hint}`;
      }
      throw new Error(errorMessage);
    }
  };

  const updateMotorcycle = async (id: string, updates: Partial<Motor>) => {
    const operationId = `motorcycle-update-${id}`;
    if (isOperationActive(operationId)) return;

    // Input validation and sanitization
    const sanitizedUpdates: Partial<Motor> = {};

    if (updates.plate !== undefined) {
      if (!updates.plate.trim()) {
        throw new Error('Motorcycle license plate cannot be empty.');
      }
      // Duplicate check: prevent updating to a plate already in use by another active motorcycle
      const trimmedPlate = updates.plate.trim().toUpperCase();
      const isDuplicate = motorcycles.some(
        m => m.id !== id &&
             m.plate.trim().toUpperCase() === trimmedPlate &&
             (m.status === 'waiting' || m.status === 'in-progress')
      );
      if (isDuplicate) {
        throw new Error('This license plate is already in the active queue for another motorcycle.');
      }
      sanitizedUpdates.plate = trimmedPlate;
    }

    if (updates.model !== undefined) {
      if (!updates.model.trim()) {
        throw new Error('Motorcycle model cannot be empty.');
      }
      sanitizedUpdates.model = updates.model.trim();
    }

    if (updates.phone !== undefined) {
      if (updates.phone && updates.phone.trim()) {
        const phoneRegex = /^(09|\+639)\d{9}$/;
        if (!phoneRegex.test(updates.phone.replace(/\s/g, ''))) {
          throw new Error('Invalid phone number format. Please use Philippine format: 09XXXXXXXXX or +639XXXXXXXXX');
        }
      }
      sanitizedUpdates.phone = updates.phone ? updates.phone.trim() : '';
    }

    if (updates.total_cost !== undefined) {
      if (updates.total_cost < 0) {
        throw new Error('Total cost cannot be negative.');
      }
      sanitizedUpdates.total_cost = Math.max(0, updates.total_cost);
    }

    // Add other fields that don't need special validation
    if (updates.size !== undefined) sanitizedUpdates.size = updates.size;
    if (updates.status !== undefined) sanitizedUpdates.status = updates.status;
    if (updates.services !== undefined) sanitizedUpdates.services = updates.services;
    if (updates.crew !== undefined) sanitizedUpdates.crew = updates.crew;
    if (updates.package !== undefined) sanitizedUpdates.package = updates.package;

    try {
      addActiveOperation(operationId);
      const { error } = await supabase
        .from('motorcycles')
        .update({ ...sanitizedUpdates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Supabase error updating motorcycle:', error);
        if (error.code === '42501') {
          throw new Error('Access denied. You do not have permission to update this motorcycle.');
        } else if (error.code === '42P01') {
          throw new Error('Database table not found. Please contact support.');
        } else {
          throw new Error(`Failed to update motorcycle: ${error.message}`);
        }
      }
      // Optimistically update local state
      setMotorcycles(prev => prev.map(m => m.id === id ? { ...m, ...sanitizedUpdates, updated_at: new Date().toISOString() } as Motor : m));
    } catch (err) {
      console.error('Error in updateMotorcycle:', err);
      // Re-throw the original error if it's already an Error instance
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(`An unknown error occurred while updating the motorcycle.`);
    } finally {
      removeActiveOperation(operationId);
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
      // Update local state immediately
      setMotorcycles(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error in removeMotorcycle:', err);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while removing the motorcycle.');
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
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while adding a crew member.');
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
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while updating a crew member.');
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
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while removing a crew member.');
    } finally {
      removeActiveOperation(operationId);
    }
  };

  const addService = async (service: Omit<Service, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      addActiveOperation('service-operation');
      const { error } = await supabase
        .from('services')
        .insert([{ ...service }]);

      if (error) {
        console.error('Supabase error adding service:', error);
        throw new Error(`Failed to add service: ${error.message}`);
      }
    } catch (err) {
      console.error('Error in addService:', err);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while adding a service.');
    } finally {
      removeActiveOperation('service-operation');
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    try {
      addActiveOperation('service-operation');
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
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while updating a service.');
    } finally {
      removeActiveOperation('service-operation');
    }
  };

  const deleteService = async (id: string) => {
    try {
      addActiveOperation('service-operation');
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
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while deleting a service.');
    } finally {
      removeActiveOperation('service-operation');
    }
  };

  const addPackage = async (pkg: Omit<ServicePackage, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      addActiveOperation('package-operation');
      const { error } = await supabase
        .from('service_packages')
        .insert([{ ...pkg }]);

      if (error) {
        console.error('Supabase error adding package:', error);
        throw new Error(`Failed to add package: ${error.message}`);
      }
    } catch (err) {
      console.error('Error in addPackage:', err);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while adding a package.');
    } finally {
      removeActiveOperation('package-operation');
    }
  };

  const updatePackage = async (id: string, updates: Partial<ServicePackage>) => {
    try {
      addActiveOperation('package-operation');
      const { error } = await supabase
        .from('service_packages')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Supabase error updating package:', error);
        throw new Error(`Failed to update package: ${error.message}`);
      }
      // Update local state
      setPackages(prev =>
        prev.map(pkg =>
          pkg.id === id ? { ...pkg, ...updates } : pkg
        )
      );
    } catch (err) {
      console.error('Error in updatePackage:', err);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while updating a package.');
    } finally {
      removeActiveOperation('package-operation');
    }
  };

  const deletePackage = async (id: string) => {
    try {
      addActiveOperation('package-operation');
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
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while deleting a package.');
    } finally {
      removeActiveOperation('package-operation');
    }
  };

  const searchCarHistory = async (plate: string) => {
    // Input validation
    if (!plate || typeof plate !== 'string') {
      throw new Error('Invalid license plate provided for search.');
    }

    // Sanitize and validate plate format
    const sanitizedPlate = plate.trim().toUpperCase();
    if (sanitizedPlate.length < 3) {
      throw new Error('License plate must be at least 3 characters long.');
    }

    // Prevent potential SQL injection by limiting search to reasonable length
    if (sanitizedPlate.length > 20) {
      throw new Error('License plate search term too long.');
    }

    try {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .ilike('plate', `%${sanitizedPlate}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Supabase error searching car history:', error);
        if (error.code === '42501') {
          throw new Error('Access denied. You do not have permission to search vehicle history.');
        } else {
          throw new Error(`Failed to search vehicle history: ${error.message}`);
        }
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('Error in searchCarHistory:', err);
       if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while searching vehicle history.');
    }
  };

  const searchMotorcycleHistory = async (plate: string) => {
    // Input validation
    if (!plate || typeof plate !== 'string') {
      throw new Error('Invalid license plate provided for search.');
    }

    // Sanitize and validate plate format
    const sanitizedPlate = plate.trim().toUpperCase();
    if (sanitizedPlate.length < 3) {
      throw new Error('License plate must be at least 3 characters long.');
    }

    // Prevent potential SQL injection by limiting search to reasonable length
    if (sanitizedPlate.length > 20) {
      throw new Error('License plate search term too long.');
    }

    try {
      const { data, error } = await supabase
        .from('motorcycles')
        .select('*')
        .ilike('plate', `%${sanitizedPlate}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Supabase error searching motorcycle history:', error);
        if (error.code === '42501') {
          throw new Error('Access denied. You do not have permission to search motorcycle history.');
        } else {
          throw new Error(`Failed to search motorcycle history: ${error.message}`);
        }
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('Error in searchMotorcycleHistory:', err);
       if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred while searching motorcycle history.');
    }
  };

  const calculateBusyCrews = () => {
    const busyCrewIds = new Set<string>();
    
    // Only count crew as busy if vehicle is in-progress
    vehicles.forEach(vehicle => {
      if (vehicle.status === 'in-progress' && vehicle.crew) {
        vehicle.crew.forEach(crewId => busyCrewIds.add(crewId));
      }
    });
    
    return busyCrewIds;
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
      searchMotorcycleHistory
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