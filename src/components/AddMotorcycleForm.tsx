import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQueue } from '../context/QueueContext';
import { Motor, MOTORCYCLE_SIZES, SERVICE_STATUSES } from '../types';
import { 
  validateMotorcyclePlate,
  validateMotorcycleModel,
  validatePhoneNumber,
  validateCost,
  validateMotorcycleSize,
  validateServiceStatus,
  sanitizeInput
} from '../lib/validation';

interface AddMotorcycleFormProps {
  onComplete: () => void;
}

const AddMotorcycleForm: React.FC<AddMotorcycleFormProps> = ({ onComplete }) => {
  const { addMotorcycle, services, packages, crews, searchMotorcycleHistory } = useQueue();
  
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    size: 'small' as const,
    status: 'waiting' as const,
    phone: '',
    crew: [] as string[],
    selectedServices: [] as string[],
    selectedPackages: [] as string[],
    total_cost: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);
  const [autoFilledFromHistory, setAutoFilledFromHistory] = useState(false);
  const [manualTotalCost, setManualTotalCost] = useState<number | ''>('');
  const [isCostOverridden, setIsCostOverridden] = useState(false);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [packagePrices, setPackagePrices] = useState<Record<string, number>>({});
  const [calculatedCost, setCalculatedCost] = useState(0);
  const [isCrewOpen, setIsCrewOpen] = useState(false);
  
  const formTopRef = useRef<HTMLDivElement>(null);

  const hasPackageSelected = useMemo(() => formData.selectedPackages.length > 0, [formData.selectedPackages]);

  // Filter motorcycle services and packages
  const motorcycleServices = useMemo(() => services.filter(s => s.vehicle_type === 'motorcycle'), [services]);
  const motorcyclePackages = useMemo(() => packages.filter(p => p.vehicle_type === 'motorcycle'), [packages]);

  // Initialize service prices based on motorcycle size
  useEffect(() => {
    const prices: Record<string, number> = {};
    motorcycleServices.forEach(service => {
      const pricing = service.pricing as any; // Cast to any to handle both pricing types
      prices[service.id] = pricing?.[formData.size] || 0;
    });
    setServicePrices(prices);
  }, [motorcycleServices, formData.size]);

  // Initialize package prices based on motorcycle size
  useEffect(() => {
    const prices: Record<string, number> = {};
    motorcyclePackages.forEach(pkg => {
      const pricing = pkg.pricing as any; // Cast to any to handle both pricing types
      prices[pkg.id] = pricing?.[formData.size] || 0;
    });
    setPackagePrices(prices);
  }, [motorcyclePackages, formData.size]);

  // Calculate total cost
  useEffect(() => {
    const serviceTotal = formData.selectedServices.reduce((sum, serviceId) => {
      return sum + (servicePrices[serviceId] || 0);
    }, 0);
    
    // For motorcycles, we assume only one package can be selected via radio button
    const packageId = formData.selectedPackages[0];
    const packageTotal = packageId ? (packagePrices[packageId] || 0) : 0;
    
    const total = serviceTotal + packageTotal;
    setCalculatedCost(total);
    
    if (!isCostOverridden) {
      setFormData(prev => ({ ...prev, total_cost: total }));
    }
  }, [formData.selectedServices, formData.selectedPackages, servicePrices, packagePrices, isCostOverridden]);

  // Search motorcycle history when plate changes
  useEffect(() => {
    const searchHistory = async () => {
      if (formData.plate.length >= 3) {
        setIsSearchingHistory(true);
        try {
          const history = await searchMotorcycleHistory(formData.plate);
          if (history) {
            setFormData(prev => ({
              ...prev,
              model: history.model,
              phone: history.phone || '',
              size: history.size
            }));
            setAutoFilledFromHistory(true);
          }
        } catch (error) {
          console.error('Error searching motorcycle history:', error);
        } finally {
          setIsSearchingHistory(false);
        }
      }
    };

    const timeoutId = setTimeout(searchHistory, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.plate, searchMotorcycleHistory]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue: string | number = value;

    if (name === 'plate') {
      const cleanValue = value.replace(/[-\s]/g, '').toUpperCase();
      const numbers = cleanValue.slice(0, 3).replace(/[^0-9]/g, '');
      const letters = cleanValue.slice(3, 6).replace(/[^A-Z]/g, '');
      
      if (cleanValue.length > 3) {
        formattedValue = `${numbers}-${letters}`;
      } else {
        formattedValue = numbers;
      }
    } else if (name === 'total_cost') {
      const costValue = value.trim() === '' ? '' : value;
      setManualTotalCost(costValue as number);
      setIsCostOverridden(value.trim() !== '');
      return;
    } else if (name === 'phone') {
      formattedValue = value.replace(/[^\d+]/g, '');
      if (formattedValue.startsWith('+63') && formattedValue.length > 3) {
        formattedValue = `+63 ${formattedValue.slice(3).match(/.{1,3}/g)?.join(' ')}`;
      } else if (formattedValue.startsWith('0') && formattedValue.length > 1) {
        formattedValue = `${formattedValue.slice(0, 4)} ${formattedValue.slice(4, 7)} ${formattedValue.slice(7, 11)}`;
      }
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }));

    if (errors[name]) {
      validateField(name, formattedValue);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const validateField = (name: string, value: any) => {
    let result;
    switch (name) {
      case 'plate':
        result = validateMotorcyclePlate(value);
        break;
      case 'model':
        result = validateMotorcycleModel(value);
        break;
      case 'phone':
        result = validatePhoneNumber(value);
        break;
      case 'size':
        result = validateMotorcycleSize(value);
        break;
      case 'status':
        result = validateServiceStatus(value);
        break;
      case 'total_cost':
        result = validateCost(formData.total_cost);
        break;
      default:
        return;
    }

    if (!result.isValid) {
      setErrors(prev => ({ ...prev, [name]: result.error! }));
    } else {
      setErrors(prev => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    const newSelectedServices = formData.selectedServices.includes(serviceId)
      ? formData.selectedServices.filter(id => id !== serviceId)
      : [...formData.selectedServices, serviceId];
      
    setFormData(prev => ({
      ...prev,
      selectedServices: newSelectedServices
    }));
    validateServicesAndPackages(newSelectedServices, formData.selectedPackages);
  };

  const handlePackageToggle = (packageId: string) => {
    const newSelectedPackages = formData.selectedPackages.includes(packageId)
      ? formData.selectedPackages.filter(id => id !== packageId)
      : [...formData.selectedPackages, packageId];

    setFormData(prev => ({
      ...prev,
      selectedPackages: newSelectedPackages,
      crew: newSelectedPackages.length > 0 ? [] : prev.crew,
    }));
    validateServicesAndPackages(formData.selectedServices, newSelectedPackages);
  };

  const handleCrewToggle = (crewId: string) => {
    setFormData(prev => ({
      ...prev,
      crew: prev.crew.includes(crewId)
        ? prev.crew.filter(id => id !== crewId)
        : [...prev.crew, crewId]
    }));
  };

  const validateServicesAndPackages = (services: string[], packages: string[]) => {
    if (services.length === 0 && packages.length === 0) {
      setErrors(prev => ({ ...prev, services: 'Please select at least one service or package.' }));
    } else {
      setErrors(prev => {
        const { services: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    const plateResult = validateMotorcyclePlate(formData.plate);
    if (!plateResult.isValid) newErrors.plate = plateResult.error!;

    const modelResult = validateMotorcycleModel(formData.model);
    if (!modelResult.isValid) newErrors.model = modelResult.error!;

    const sizeResult = validateMotorcycleSize(formData.size);
    if (!sizeResult.isValid) newErrors.size = sizeResult.error!;

    const statusResult = validateServiceStatus(formData.status);
    if (!statusResult.isValid) newErrors.status = statusResult.error!;

    // Validate optional fields
    if (formData.phone) {
      const phoneResult = validatePhoneNumber(formData.phone);
      if (!phoneResult.isValid) newErrors.phone = phoneResult.error!;
    }

    // Validate services/packages
    if (formData.selectedServices.length === 0 && formData.selectedPackages.length === 0) {
      newErrors.services = 'Please select at least one service or package.';
    }

    // Validate crew if status is 'in-progress'
    if (formData.status === 'in-progress' && formData.crew.length === 0 && !hasPackageSelected) {
      newErrors.crew = 'Assign at least one crew member for motorcycles "In Progress".';
    }

    setErrors(newErrors);
    setFormError(Object.keys(newErrors).length > 0 ? 'Please fix the errors below.' : null);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const allSelectedServiceIds = [...formData.selectedServices, ...formData.selectedPackages];
      const selectedServices = motorcycleServices.filter(s => formData.selectedServices.includes(s.id));
      const selectedPackages = motorcyclePackages.filter(p => formData.selectedPackages.includes(p.id));
      const selectedServiceNames = formData.selectedServices.map(id => {
        const service = motorcycleServices.find(s => s.id === id);
        return service?.name || '';
      }).filter(name => name.length > 0);
      const selectedPackageNames = formData.selectedPackages.map(id => {
        const pkg = motorcyclePackages.find(p => p.id === id);
        return pkg?.name || '';
      }).filter(name => name.length > 0);

      const motorcycleData = {
        plate: sanitizeInput(formData.plate).toUpperCase(),
        model: sanitizeInput(formData.model),
        size: formData.size,
        status: formData.status,
        phone: sanitizeInput(formData.phone.trim()),
        crew: formData.crew,
        services: formData.selectedServices,
        package: formData.selectedPackages[0] || null,
        total_cost: isCostOverridden && manualTotalCost !== '' ? Number(manualTotalCost) : calculatedCost,
        vehicle_type: 'motorcycle' as const
      };

      await addMotorcycle(motorcycleData);
      onComplete();
    } catch (error) {
      console.error('Error adding motorcycle:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('license plate already exists')) {
          setFormError('A motorcycle with this license plate is already in the queue. You can add the same motorcycle multiple times for returning customers.');
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

  // Only allow 'waiting' and 'in-progress' for motorcycle status
  const MOTORCYCLE_STATUSES = [
    { label: 'Waiting', value: 'waiting' },
    { label: 'In Progress', value: 'in-progress' },
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm border border-border-light dark:border-border-dark">
        <div ref={formTopRef} />
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold">Please fix the following errors:</p>
                <p className="text-sm mt-1">{formError}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">Add New Motorcycle to Queue</h2>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            Fill in the required information below to add a motorcycle to the service queue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Plate, Model, Size, Phone */}
          <div className="space-y-4">
            <div>
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
                  onBlur={handleBlur}
                  className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2 uppercase pr-10 ${
                    errors.plate 
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                      : 'border-border-light dark:border-border-dark'
                  }`}
                  placeholder="123-ABC"
                  maxLength={7}
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
                  Motorcycle license plate (format: 123-ABC)
                </p>
              )}
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                Motorcycle Model <span className="text-red-500">*</span>
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
                onBlur={handleBlur}
                className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2 ${
                  errors.model 
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                    : autoFilledFromHistory
                    ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
                    : 'border-border-light dark:border-border-dark'
                }`}
                placeholder="e.g., Honda Click 160"
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
                  Enter the motorcycle's make and model (e.g., Honda Click 160, Yamaha NMAX)
                </p>
              )}
            </div>

            <div>
              <label htmlFor="size" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                Motorcycle Size <span className="text-red-500">*</span>
              </label>
              <select
                id="size"
                name="size"
                value={formData.size}
                onChange={handleChange}
                onBlur={handleBlur}
                className="block w-full rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2"
                required
              >
                {MOTORCYCLE_SIZES.map(size => (
                  <option key={size.value} value={size.value}>{size.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                Motorcycle size affects service pricing
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
                onBlur={handleBlur}
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

          {/* Column 2: Status, Services, Packages, Crew */}
          <div className="space-y-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                onBlur={handleBlur}
                className="block w-full rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2"
                required
              >
                {MOTORCYCLE_STATUSES.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                Current service status of the motorcycle
              </p>
            </div>

            {/* Services Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                Services <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <div className="max-h-32 overflow-y-auto pr-2 rounded-md bg-background-light dark:bg-gray-900/50 p-2 border border-border-light dark:border-border-dark">
                {motorcycleServices.map(service => (
                  <label key={service.id} className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800">
                    <div>
                      <input
                        type="checkbox"
                        checked={formData.selectedServices.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className="form-checkbox h-4 w-4 text-brand-blue bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark rounded focus:ring-brand-blue"
                      />
                      <span className="ml-2 text-sm text-text-primary-light dark:text-text-primary-dark">{service.name}</span>
                    </div>
                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">₱{servicePrices[service.id] || 0}</span>
                  </label>
                ))}
              </div>
              {errors.services && (
                <p className="mt-1 text-xs text-red-500">{errors.services}</p>
              )}
            </div>

            {/* Packages Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                Packages <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <div className="max-h-32 overflow-y-auto pr-2 rounded-md bg-background-light dark:bg-gray-900/50 p-2 border border-border-light dark:border-border-dark">
                {motorcyclePackages.map(pkg => (
                  <label key={pkg.id} className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800">
                    <div>
                      <input
                        type="checkbox"
                        checked={formData.selectedPackages.includes(pkg.id)}
                        onChange={() => handlePackageToggle(pkg.id)}
                        className="form-checkbox h-4 w-4 text-brand-blue bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark rounded focus:ring-brand-blue"
                      />
                      <span className="ml-2 text-sm text-text-primary-light dark:text-text-primary-dark">{pkg.name}</span>
                    </div>
                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">₱{packagePrices[pkg.id] || 0}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Crew Selection */}
            {!hasPackageSelected && (
              <div className="mb-6">
                <label className="block text-lg font-bold mb-2 text-gray-800 dark:text-white">Assign Crew</label>
                <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsCrewOpen(!isCrewOpen)}>
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {formData.crew.length > 0
                        ? crews.filter(c => formData.crew.includes(c.id)).map(c => c.name).join(', ')
                        : 'Select Crew...'}
                    </span>
                    <svg className={`w-5 h-5 text-gray-500 transition-transform ${isCrewOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                  {isCrewOpen && (
                    <div className="mt-4 space-y-3">
                      {crews.map((crewMember) => (
                        <label 
                          key={crewMember.id} 
                          className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.crew.includes(crewMember.id)}
                              onChange={() => handleCrewToggle(crewMember.id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-200">{crewMember.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {errors.crew && <p className="text-red-500 text-sm mt-2">{errors.crew}</p>}
              </div>
            )}

            {/* Total Cost */}
            <div className="mb-4">
              <label htmlFor="total_cost" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                Total Cost <span className="text-gray-500 text-xs">(Manual Override)</span>
              </label>
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
                Cost is calculated automatically based on selected services and packages.
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark">₱</span>
                <input
                  type="number"
                  id="total_cost"
                  name="total_cost"
                  value={isCostOverridden ? manualTotalCost : calculatedCost}
                  onChange={handleChange}
                  className="block w-full rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2 pl-8"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-border-light dark:border-border-dark">
          <button
            type="button"
            onClick={onComplete}
            className="px-4 py-2 border border-border-light dark:border-border-dark text-sm font-medium rounded-md text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-dark-blue"
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
              'Add Motorcycle'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMotorcycleForm; 