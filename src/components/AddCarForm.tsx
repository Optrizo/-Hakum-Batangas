import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { CAR_SIZES, CarSize, ServiceStatus, SizePricing } from '../types';

interface AddCarFormProps {
  onComplete: () => void;
}

const AddCarForm: React.FC<AddCarFormProps> = ({ onComplete }) => {
  const { addCar, services, packages, searchCarHistory, crews, cars } = useQueue();
  // Add filtering for car services and packages
  const carServices = useMemo(() => services.filter(s => s.vehicle_type === 'car'), [services]);
  const carPackages = useMemo(() => packages.filter(p => p.vehicle_type === 'car'), [packages]);
  const errorRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    size: 'medium' as CarSize,
    status: 'waiting' as ServiceStatus,
    phone: '',
    selectedServices: [] as string[],
    selectedPackages: [] as string[],
    crew: [] as string[],
  });
  const [totalCost, setTotalCost] = useState(0);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [packagePrices, setPackagePrices] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isPackagesOpen, setIsPackagesOpen] = useState(false);
  const [isCrewOpen, setIsCrewOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCostOverridden, setIsCostOverridden] = useState(false);
  const [manualTotalCost, setManualTotalCost] = useState<number | ''>('');
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);
  const [autoFilledFromHistory, setAutoFilledFromHistory] = useState(false);

  useEffect(() => {
    if (formError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [formError]);
  const formTopRef = useRef<HTMLDivElement>(null);

  const hasPackageSelected = useMemo(() => formData.selectedPackages.length > 0, [formData.selectedPackages]);

  const busyCrewIds = useMemo(() => {
    const today = new Date();
    const isToday = (dateString: string) => {
      if (!dateString) return false;
      const date = new Date(dateString);
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    };

    console.log('%c[AddCarForm] Calculating busy crew for today...', 'color: #3b82f6');
    const busyIds = new Set<string>();
    cars.forEach(c => {
      // A crew member is busy if their car is 'in-progress' AND was created today.
      if (c.status === 'in-progress' && isToday(c.created_at)) {
        c.crew?.forEach(crewId => busyIds.add(crewId));
      }
    });
    console.log('%c[AddCarForm] Busy Crew IDs found for today:', 'color: #3b82f6', Array.from(busyIds));
    return busyIds;
  }, [cars]);

  // Helper: are all crew busy?
  const allCrewBusy = crews.length > 0 && crews.every(crew => busyCrewIds.has(crew.id));

  useEffect(() => {
    const prices: Record<string, number> = {};
    carServices.forEach(service => {
      const pricing = service.pricing as SizePricing;
      prices[service.id] = pricing?.[formData.size] || service.price;
    });
    setServicePrices(prices);
  }, [carServices, formData.size]);

  useEffect(() => {
    const prices: Record<string, number> = {};
    carPackages.forEach(pkg => {
      prices[pkg.id] = pkg.pricing[formData.size] || 0;
    });
    setPackagePrices(prices);
  }, [carPackages, formData.size]);

  useEffect(() => {
    const serviceTotal = formData.selectedServices.reduce((sum, serviceId) => {
      return sum + (servicePrices[serviceId] || 0);
    }, 0);
    
    const packageTotal = formData.selectedPackages.reduce((sum, packageId) => {
      return sum + (packagePrices[packageId] || 0);
    }, 0);
    
    const newTotalCost = serviceTotal + packageTotal;
    setTotalCost(newTotalCost);

    if (!isCostOverridden) {
      setManualTotalCost(newTotalCost);
    }
  }, [formData.selectedServices, formData.selectedPackages, servicePrices, packagePrices, isCostOverridden]);

  // Auto-complete car details from history when plate is entered
  useEffect(() => {
    const searchHistory = async () => {
      // Only trigger if plate is a valid, complete Philippine car plate
      const platePattern = /^[A-Z]{3}-?\d{3,4}$/;
      if (platePattern.test(formData.plate.toUpperCase())) {
        setIsSearchingHistory(true);
        setAutoFilledFromHistory(false);
        try {
          const historyCar = await searchCarHistory(formData.plate);
          if (historyCar) {
            setFormData(prev => ({
              ...prev,
              model: historyCar.model,
              phone: historyCar.phone || '',
              size: historyCar.size
            }));
            setAutoFilledFromHistory(true);
          }
        } catch (error) {
          console.error('❌ Error during auto-completion:', error);
        } finally {
          setIsSearchingHistory(false);
        }
      } else {
        setAutoFilledFromHistory(false);
        // If plate is not valid, also clear autofilled fields
        setFormData(prev => ({
          ...prev,
          model: '',
          phone: '',
          size: 'medium',
        }));
      }
    };

    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(searchHistory, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.plate, searchCarHistory]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    // License plate validation
    const plateRegex = /^[A-Z]{3}-?\d{3,4}$/;
    if (!formData.plate.trim()) {
      newErrors.plate = 'License plate is required to identify the vehicle';
    } else if (!plateRegex.test(formData.plate.toUpperCase())) {
      newErrors.plate = 'Please enter a valid Philippine license plate format (e.g., ABC-1234 or ABC1234)';
    } else if (formData.plate.length > 8) {
      newErrors.plate = 'License plate is too long';
    }
    
    // Car model validation
    if (!formData.model.trim()) {
      newErrors.model = 'Car model is required to identify the vehicle type';
    } else if (formData.model.trim().length < 2) {
      newErrors.model = 'Car model must be at least 2 characters long';
    } else if (formData.model.trim().length > 100) {
      newErrors.model = 'Car model is too long (maximum 100 characters)';
    }

    // Phone number validation
    if (formData.phone.trim()) {
      const phoneRegex = /^(09|\+639)\d{9}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        newErrors.phone = 'Please enter a valid Philippine phone number starting with 09 or +639 followed by 9 digits';
      }
    }

    // Size validation
    if (!formData.size || !['small', 'medium', 'large', 'extra_large'].includes(formData.size)) {
      newErrors.size = 'Please select a valid car size';
    }

    // Status validation
    if (!formData.status || !['waiting', 'in-progress', 'payment-pending', 'completed', 'cancelled'].includes(formData.status)) {
      newErrors.status = 'Please select a valid status';
    }

    // Crew validation for "in-progress"
    if (formData.status === 'in-progress' && (!formData.crew || formData.crew.length === 0)) {
      newErrors.crew = 'Assign at least one crew member when status is "In Progress".';
    }

    // Service/Package selection validation
    const allServiceNames = [...formData.selectedServices, ...formData.selectedPackages];
    if (allServiceNames.length === 0) {
      newErrors.services = 'Please select at least one service or package.';
    }

    // Duplicate check for in-progress, waiting, or payment-pending
    const trimmedPlate = formData.plate.trim().toUpperCase();
    const duplicate = cars.some(
      c => c.plate.trim().toUpperCase() === trimmedPlate && (c.status === 'in-progress' || c.status === 'waiting' || c.status === 'payment-pending')
    );
    if (duplicate) {
      newErrors.plate = 'A car with this license plate is already in the active queue (waiting, in-progress, or payment).';
    }

    setErrors(newErrors);
    setFormError(Object.keys(newErrors).length > 0 ? 'Please fix the following errors:' : null);
    if (newErrors.crew) {
      setIsCrewOpen(true);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'plate') {
      const cleanValue = value.replace(/[-\s]/g, '').toUpperCase();
      const letters = cleanValue.slice(0, 3).replace(/[^A-Z]/g, '');
      const numbers = cleanValue.slice(3, 7).replace(/[^0-9]/g, '');
      
      if (cleanValue.length > 3) {
        formattedValue = `${letters}-${numbers}`;
      } else {
        formattedValue = letters;
      }
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }));

    if (name === 'total_cost') {
        const costValue = value.trim() === '' ? '' : parseFloat(value);
        setManualTotalCost(costValue);
        setIsCostOverridden(value.trim() !== '');
    }
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  const handlePackageToggle = (packageId: string) => {
    const newSelectedPackages = formData.selectedPackages.includes(packageId)
      ? formData.selectedPackages.filter(id => id !== packageId)
      : [...formData.selectedPackages, packageId];

    setFormData(prev => ({
      ...prev,
      selectedPackages: newSelectedPackages,
      // If a package is now selected, clear the crew. Otherwise, keep existing crew.
      crew: newSelectedPackages.length > 0 ? [] : prev.crew,
    }));
  };

  const handleCrewToggle = (crewId: string) => {
    setFormData(prev => ({
      ...prev,
      crew: prev.crew.includes(crewId)
        ? prev.crew.filter(id => id !== crewId)
        : [...prev.crew, crewId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    if (!validate()) {
      if (formTopRef.current) {
        formTopRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    
    setIsSubmitting(true);
      try {
      // Sanitize and prepare data
        const selectedServiceNames = formData.selectedServices.map(id => {
          const service = carServices.find(s => s.id === id);
          return service?.name || '';
      }).filter(name => name.length > 0); // Remove empty names
      
        const selectedPackageNames = formData.selectedPackages.map(id => {
          const pkg = carPackages.find(p => p.id === id);
          return pkg?.name || '';
      }).filter(name => name.length > 0); // Remove empty names
      
        const allServiceNames = [...selectedServiceNames, ...selectedPackageNames];
      
      // Validate that we have at least one valid service
      if (allServiceNames.length === 0) {
        throw new Error('Please select at least one valid service or package.');
      }
      
      // Calculate final cost with validation
      const finalCost = manualTotalCost !== '' ? Number(manualTotalCost) : totalCost;
      if (isNaN(finalCost) || finalCost < 0) {
        throw new Error('Invalid total cost. Please enter a valid amount.');
      }
        
      // --- CREW BUSY LOGIC ---
      let statusToUse = formData.status;
      if (allCrewBusy) {
        statusToUse = 'waiting';
        setFormError('All crew are currently busy. The car has been added to the waiting queue.');
      }
      await addCar({
        plate: formData.plate.toUpperCase().trim(),
        model: formData.model.trim(),
        size: formData.size,
        status: statusToUse,
        phone: formData.phone.trim() || '',
        crew: formData.crew,
        service: allServiceNames.join(', '),
        services: [...formData.selectedServices, ...formData.selectedPackages],
        total_cost: finalCost,
      });

      // Calculate queue number if status is waiting
      let queueNumber;
      if (statusToUse === 'waiting') {
        const waitingCount = cars.filter(c => c.status === 'waiting' && !c.is_deleted).length;
        queueNumber = waitingCount + 1;
      }

      // Send SMS notification if phone is provided
      if (formData.phone.trim()) {
        await fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: statusToUse,
            plateNumber: formData.plate.toUpperCase().trim(),
            serviceType: allServiceNames.join(', '),
            phoneNumber: formData.phone.trim(),
            queueNumber: statusToUse === 'waiting' ? queueNumber : undefined
          })
        });
      }
      
      onComplete();
    } catch (error) {
      console.error('Error adding car:', error);
      
      // Handle specific error messages
      if (error instanceof Error) {
        if (error.message.includes('license plate already exists')) {
          setFormError('A vehicle with this license plate is already in the queue. You can add the same vehicle multiple times for returning customers.');
        } else if (error.message.includes('required fields')) {
          setFormError('Please fill in all required fields marked with an asterisk (*).');
        } else if (error.message.includes('Invalid data')) {
          setFormError('Please check your input and try again.');
        } else if (error.message.includes('Access denied')) {
          setFormError('You do not have permission to perform this action. Please contact your administrator.');
        } else if (error.message.includes('Database table not found')) {
          setFormError('System error. Please contact support.');
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm border border-border-light dark:border-border-dark">
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold">Please fix the following errors:</p>
                <ul className="text-sm mt-1 list-disc list-inside">
                  {Object.values(errors).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">Add New Vehicle to Queue</h2>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            Fill in the required information below to add a vehicle to the service queue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Plate, Model, Size, Phone */}
          <div className="space-y-4">
              <label htmlFor="plate" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                License Plate <span className="text-red-500">*</span>
          </label>
              <div className="relative">
          <input
            type="text"
            id="plate"
            name="plate"
            value={formData.plate}
            onChange={handleChange}
                  className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2 uppercase pr-10 ${
                    errors.plate 
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                      : 'border-border-light dark:border-border-dark'
                  }`}
                  placeholder="ABC-1234"
            maxLength={8}
                  required
                />
                {isSearchingHistory && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="animate-spin h-4 w-4 text-brand-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
              {errors.plate ? (
                <p className="mt-1 text-xs text-red-500 flex items-start">
                  <svg className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.plate}
                </p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  Enter the vehicle's license plate number (e.g., ABC-1234)
                  {formData.plate.length >= 3 && isSearchingHistory && (
                    <span className="ml-2 text-brand-blue">Searching for previous records...</span>
                  )}
                </p>
              )}
              {autoFilledFromHistory && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs text-green-700 dark:text-green-300 flex items-center">
                    <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Found previous record! Car model, phone number, and size have been auto-filled.
                  </p>
                </div>
              )}
        </div>

        <div>
              <label htmlFor="model" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                Car Model <span className="text-red-500">*</span>
                {autoFilledFromHistory && (
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Auto-filled)</span>
                )}
          </label>
          <input
            type="text"
            id="model"
            name="model"
            value={formData.model}
            onChange={handleChange}
                className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2 ${
                  errors.model 
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                    : autoFilledFromHistory
                    ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
                    : 'border-border-light dark:border-border-dark'
                }`}
            placeholder="e.g., Toyota Vios"
                required
              />
              {errors.model ? (
                <p className="mt-1 text-xs text-red-500 flex items-start">
                  <svg className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.model}
                </p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  Enter the vehicle's make and model (e.g., Toyota Vios, Honda City)
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                Car Size <span className="text-red-500">*</span>
                {autoFilledFromHistory && (
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Auto-filled)</span>
                )}
              </label>
              <select
                id="size"
                name="size"
                value={formData.size}
                onChange={handleChange}
                className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2 ${
                  autoFilledFromHistory
                    ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
                    : 'border-border-light dark:border-border-dark'
                }`}
                required
              >
                {CAR_SIZES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {errors.size && (
                <p className="mt-1 text-xs text-red-500 flex items-start">
                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.size}
                </p>
              )}
              <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                Select the vehicle size to determine pricing
              </p>
        </div>

        <div>
              <label htmlFor="phone" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
                {autoFilledFromHistory && formData.phone && (
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Auto-filled)</span>
                )}
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
                className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2 ${
                  errors.phone 
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                    : autoFilledFromHistory && formData.phone
                    ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
                    : 'border-border-light dark:border-border-dark'
                }`}
                placeholder="09123456789"
              />
              {errors.phone ? (
                <p className="mt-1 text-xs text-red-500 flex items-start">
                  <svg className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.phone}
                </p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  Customer's phone number for notifications (optional)
                </p>
              )}
            </div>
          </div>

          {/* Column 2: Services, Packages, Status, Crew */}
          <div className="space-y-4">
            {/* Select Services */}
            <div className="p-4 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-gray-900/50">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsServicesOpen(!isServicesOpen)}>
                <span className="font-medium text-text-primary-light dark:text-text-primary-dark">
                  Select Services <span className="text-red-500">*</span>
                </span>
                <svg className={`w-5 h-5 transition-transform ${isServicesOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
              {isServicesOpen && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-2">
                  {carServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                      <label htmlFor={`service-${service.id}`} className="flex items-center cursor-pointer flex-grow">
                        <input
                          type="checkbox"
                          id={`service-${service.id}`}
                          checked={formData.selectedServices.includes(service.id)}
                          onChange={() => handleServiceToggle(service.id)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-blue focus:ring-brand-blue"
                        />
                        <span className="ml-3 text-sm text-text-primary-light dark:text-text-primary-dark">{service.name}</span>
                      </label>
                      <span className="text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark">₱{servicePrices[service.id]?.toLocaleString()}</span>
                    </div>
                  ))}
                  {errors.services && (
                    <p className="mt-2 text-xs text-red-500 flex items-center">
                      <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.services}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Select Packages */}
            <div className="p-4 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-gray-900/50">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsPackagesOpen(!isPackagesOpen)}>
                <span className="font-medium text-text-primary-light dark:text-text-primary-dark">
                  Select Packages <span className="text-gray-500 text-xs">(Optional)</span>
                </span>
                <svg className={`w-5 h-5 transition-transform ${isPackagesOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
              {isPackagesOpen && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-2">
                  {carPackages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                      <label htmlFor={`pkg-${pkg.id}`} className="flex items-center cursor-pointer flex-grow">
                        <input
                          type="checkbox"
                          id={`pkg-${pkg.id}`}
                          checked={formData.selectedPackages.includes(pkg.id)}
                          onChange={() => handlePackageToggle(pkg.id)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-blue focus:ring-brand-blue"
                        />
                        <span className="ml-3 text-sm text-text-primary-light dark:text-text-primary-dark">{pkg.name}</span>
                      </label>
                      <span className="text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark">₱{packagePrices[pkg.id]?.toLocaleString()}</span>
                    </div>
                  ))}
                  {errors.services && (
                    <p className="mt-2 text-xs text-red-500 flex items-center">
                      <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.services}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Initial Status */}
            <div className="p-4 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-gray-900/50">
              <label htmlFor="status" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                Initial Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="block w-full rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2"
                required
              >
                <option value="waiting">Waiting</option>
                <option value="in-progress" disabled={allCrewBusy}>In Progress</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-xs text-red-500 flex items-start">
                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.status}
                </p>
              )}
              <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                Set status to 'In Progress' if service is starting immediately.
                {allCrewBusy && (
                  <span className="ml-2 font-semibold text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 px-2 py-1 rounded">All crew are busy. Only 'Waiting' is available.</span>
                )}
              </p>
            </div>

            {/* Assign Crew - Hide if a package is selected */}
            {!hasPackageSelected && (
              <div className={`p-4 rounded-lg border ${errors.crew ? 'border-red-400 dark:border-red-600' : 'border-border-light dark:border-border-dark'} bg-background-light dark:bg-gray-900/50`}>
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsCrewOpen(!isCrewOpen)}>
                  <span className="font-medium text-text-primary-light dark:text-text-primary-dark">
                    Assign Crew <span className="text-gray-500 text-xs">(Optional)</span>
                  </span>
                  <svg className={`w-5 h-5 transition-transform ${isCrewOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                {isCrewOpen && (
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-2">
                    {crews.map((crewMember) => {
                      const isBusy = busyCrewIds.has(crewMember.id);
                      return (
                        <label 
                          key={crewMember.id}
                          className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                            isBusy
                              ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800 opacity-50'
                              : 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.crew.includes(crewMember.id)}
                              onChange={() => handleCrewToggle(crewMember.id)}
                              disabled={isBusy}
                              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-blue focus:ring-brand-blue"
                            />
                            <span className="ml-3 text-sm text-text-primary-light dark:text-text-primary-dark">{crewMember.name}</span>
                          </div>
                          {isBusy && (
                            <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50 px-2 py-1 rounded-full">Busy</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
                {errors.crew && (
                  <p className="mt-2 text-xs text-red-500 flex items-center">
                    <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.crew}
                  </p>
                )}
              </div>
            )}
          </div>
     

        <div className="border-t border-border-light dark:border-border-dark pt-6 mt-6">
            <div className="flex justify-between items-center">
            <div className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
              Total Cost
            </div>
            <div className="w-1/3">
              <input
                type="number"
                name="total_cost"
                value={manualTotalCost}
                onChange={handleChange}
                className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-lg p-2 text-right font-bold ${
                  errors.total_cost 
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                    : 'border-border-light dark:border-border-dark'
                }`}
                placeholder="Calculated automatically"
                min="0"
                step="0.01"
              />
              {errors.total_cost && (
                <p className="mt-1 text-xs text-red-500 text-right flex items-center justify-end">
                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.total_cost}
                </p>
              )}
            </div>
          </div>
          {errors.total_cost ? (
            <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark text-right">
              Cost is calculated automatically based on selected services and packages
            </p>
          ) : (
            <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark text-right">
              Cost is calculated automatically based on selected services and packages
            </p>
          )}
      </div>

        <div className="flex justify-end gap-3 mt-8">
        <button
          type="button"
          onClick={onComplete}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-brand-blue hover:bg-brand-dark-blue disabled:opacity-50 transition-colors"
          disabled={isSubmitting}
        >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </span>
            ) : (
              'Add to Queue'
            )}
        </button>
      </div>
    </form>
    </div>
  );
};

export default AddCarForm;