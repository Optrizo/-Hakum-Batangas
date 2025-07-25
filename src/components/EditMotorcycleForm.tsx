import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { Motor, MOTORCYCLE_SIZES, SERVICE_STATUSES, MotorcycleSizePricing } from '../types';
import { 
  validateMotorcyclePlate,
  validateMotorcycleModel,
  validatePhoneNumber,
  validateCost,
  validateMotorcycleSize,
  validateServiceStatus
} from '../lib/validation';

interface EditMotorcycleFormProps {
  motorcycle: Motor;
  onComplete: () => void;
}

const EditMotorcycleForm: React.FC<EditMotorcycleFormProps> = ({ motorcycle, onComplete }) => {
  const { updateMotorcycle, services, packages, crews, motorcycles } = useQueue();
  
  const [formData, setFormData] = useState({
    plate: motorcycle.plate,
    model: motorcycle.model,
    size: motorcycle.size,
    status: motorcycle.status,
    phone: motorcycle.phone || '',
    crew: motorcycle.crew || [],
    selectedServices: motorcycle.services || [],
    selectedPackages: [] as string[],
    total_cost: motorcycle.total_cost || 0
  });

  // Filter and memoize motorcycle-specific services and packages
  const motorcycleServices = useMemo(() => services.filter(s => s.vehicle_type === 'motorcycle'), [services]);
  const motorcyclePackages = useMemo(() => packages.filter(p => p.vehicle_type === 'motorcycle'), [packages]);

  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [packagePrices, setPackagePrices] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedCost, setCalculatedCost] = useState(0);
  const [isCostOverridden, setIsCostOverridden] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  const [isCrewOpen, setIsCrewOpen] = useState(false);

  const hasPackageSelected = useMemo(() => formData.selectedPackages.length > 0, [formData.selectedPackages]);

  // Only allow 'waiting' and 'in-progress' for motorcycle status
  const MOTORCYCLE_STATUSES = [
    { label: 'Waiting', value: 'waiting' },
    { label: 'In Progress', value: 'in-progress' },
  ];

  useEffect(() => {
    // Initialize service prices based on motorcycle size
    const prices: Record<string, number> = {};
    services.forEach(service => {
      const pricing = service.pricing as MotorcycleSizePricing;
      prices[service.id] = pricing?.[formData.size as keyof MotorcycleSizePricing] || service.price;
    });
    setServicePrices(prices);
  }, [services, formData.size]);

  useEffect(() => {
    // Initialize package prices based on motorcycle size
    const prices: Record<string, number> = {};
    packages.forEach(pkg => {
      const pricing = pkg.pricing as MotorcycleSizePricing;
      prices[pkg.id] = pricing?.[formData.size as keyof MotorcycleSizePricing] || 0;
    });
    setPackagePrices(prices);
  }, [packages, formData.size]);

  // Auto-calculate total cost
  useEffect(() => {
    const serviceTotal = formData.selectedServices.reduce((sum, serviceId) => {
      const service = motorcycleServices.find(s => s.id === serviceId);
      const price = (service?.pricing as MotorcycleSizePricing)?.[formData.size] || 0;
      return sum + price;
    }, 0);

    const packageId = formData.selectedPackages[0];
    const packageTotal = useMemo(() => {
      if (!packageId) return 0;
      const pkg = motorcyclePackages.find(p => p.id === packageId);
      return (pkg?.pricing as MotorcycleSizePricing)?.[formData.size] || 0;
    }, [packageId, formData.size, motorcyclePackages]);

    const total = serviceTotal + packageTotal;
    
    if (!isCostOverridden) {
      setFormData(prev => ({ ...prev, total_cost: total }));
    }
  }, [formData.selectedServices, formData.selectedPackages, formData.size, motorcycleServices, motorcyclePackages, isCostOverridden]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let formattedValue: string | number = value;

    if (name === 'total_cost') {
      setIsCostOverridden(true);
      formattedValue = value === '' ? 0 : parseFloat(value);
    } else if (name === 'plate') {
      formattedValue = value.toUpperCase();
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
  
  const validateServicesAndPackages = (_services: string[], _packages: string[]) => {
    // Services and packages are now optional - no validation required
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.services;
      return newErrors;
    });
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
    if (!validate()) {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const allSelectedServiceIds = [...formData.selectedServices, ...formData.selectedPackages];
      const selectedServices = services.filter(s => formData.selectedServices.includes(s.id));
      const selectedPackages = packages.filter(p => formData.selectedPackages.includes(p.id));
      const allServiceNames = [
        ...selectedServices.map(s => s.name),
        ...selectedPackages.map(p => p.name)
      ];
      await updateMotorcycle(motorcycle.id, {
        plate: formData.plate,
        model: formData.model,
        size: formData.size,
        status: formData.status,
        phone: formData.phone.trim() ? formData.phone : '',
        crew: formData.crew,
        service: allServiceNames.join(', '),
        services: allSelectedServiceIds,
        total_cost: formData.total_cost,
      });
      onComplete();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'An unknown error occurred. Please try again.');
      console.error('Error updating motorcycle:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    const plateResult = validateMotorcyclePlate(formData.plate);
    if (!plateResult.isValid) newErrors.plate = plateResult.error!;
    else {
      // Check for duplicate plate in active queue, excluding the current motorcycle
      const trimmedPlate = formData.plate.trim().toUpperCase();
      const isDuplicate = motorcycles.some(
        m => m.id !== motorcycle.id &&
             m.plate.trim().toUpperCase() === trimmedPlate &&
             (m.status === 'waiting' || m.status === 'in-progress')
      );
      if (isDuplicate) {
        newErrors.plate = 'This license plate is already in the active queue for another motorcycle.';
      }
    }

    const modelResult = validateMotorcycleModel(formData.model);
    if (!modelResult.isValid) newErrors.model = modelResult.error!;

    const sizeResult = validateMotorcycleSize(formData.size);
    if (!sizeResult.isValid) newErrors.size = sizeResult.error!;

    const statusResult = validateServiceStatus(formData.status);
    if (!statusResult.isValid) newErrors.status = statusResult.error!;

    // Validate phone if provided
    if (formData.phone.trim()) {
      const phoneResult = validatePhoneNumber(formData.phone);
      if (!phoneResult.isValid) newErrors.phone = phoneResult.error!;
    }

    // Validate crew if status is 'in-progress'
    if (formData.status === 'in-progress' && formData.crew.length === 0 && !hasPackageSelected) {
      newErrors.crew = 'Assign at least one crew member for motorcycles "In Progress".';
    }

    // Require at least one service or package
    if (formData.selectedServices.length + formData.selectedPackages.length === 0) {
      newErrors.services = 'Please select at least one service or package.';
    }

    // Services and packages are now optional - no validation required

    setErrors(newErrors);
    setFormError(Object.keys(newErrors).length > 0 ? 'Please fix the errors below.' : null);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div ref={formTopRef} />
      {formError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong className="block mb-1">{formError}</strong>
          <ul className="list-disc pl-5">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">Edit Motorcycle Information</h3>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Update the motorcycle details below. Required fields are marked with a red asterisk (*).
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-plate" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
            License Plate <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="edit-plate"
            name="plate"
            value={formData.plate}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2 uppercase ${
              errors.plate 
                ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                : 'border-border-light dark:border-border-dark'
            }`}
            placeholder="123-ABC"
            maxLength={7}
            disabled={isSubmitting}
            required
          />
          {errors.plate ? (
            <p className="mt-1 text-xs text-red-500 flex items-start">
              <svg className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.plate}
            </p>
          ) : (
            <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
              Motorcycle's license plate number (format: 123-ABC)
            </p>
          )}
        </div>

        <div>
          <label htmlFor="edit-model" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
            Motorcycle Model <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="edit-model"
            name="model"
            value={formData.model}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2 ${
              errors.model 
                ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                : 'border-border-light dark:border-border-dark'
            }`}
            placeholder="e.g., Honda Click 160"
            disabled={isSubmitting}
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
              Motorcycle's make and model
            </p>
          )}
        </div>

        <div>
          <label htmlFor="edit-phone" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
            Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <input
            type="tel"
            id="edit-phone"
            name="phone"
            value={formData.phone || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2 ${
              errors.phone 
                ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                : 'border-border-light dark:border-border-dark'
            }`}
            placeholder="0912 345 6789"
            disabled={isSubmitting}
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
              Customer's contact number for notifications
            </p>
          )}
        </div>

        <div>
          <label htmlFor="edit-size" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
            Motorcycle Size <span className="text-red-500">*</span>
          </label>
          <select
            id="edit-size"
            name="size"
            value={formData.size}
            onChange={handleChange}
            onBlur={handleBlur}
            className="block w-full rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2"
            disabled={isSubmitting}
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
          <label htmlFor="edit-status" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            id="edit-status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            onBlur={handleBlur}
            className="block w-full rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2"
            disabled={isSubmitting}
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
      </div>

      {/* Service & Package Selection */}
      <div className="pt-4 border-t border-border-light dark:border-border-dark">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
            Services & Packages <span className="text-gray-500 text-xs">(Optional)</span>
          </h4>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
            Select or modify the services and packages for this motorcycle
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Services */}
          <div>
            <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              Services
            </label>
            <div className="max-h-48 sm:max-h-56 md:max-h-64 lg:max-h-32 overflow-y-auto pr-2 rounded-md bg-background-light dark:bg-gray-900/50 p-3 border border-border-light dark:border-border-dark">
              {motorcycleServices.length === 0 ? (
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark italic py-2">
                  No services available
                </p>
              ) : (
                motorcycleServices.map(service => (
                  <label key={service.id} className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={formData.selectedServices.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className="form-checkbox h-4 w-4 text-brand-blue bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark rounded focus:ring-brand-blue flex-shrink-0"
                      />
                      <span className="ml-2 text-sm text-text-primary-light dark:text-text-primary-dark truncate">{service.name}</span>
                    </div>
                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium ml-2 flex-shrink-0">₱{servicePrices[service.id] || 0}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          
          {/* Packages */}
          <div>
            <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              Packages
            </label>
            <div className="max-h-48 sm:max-h-56 md:max-h-64 lg:max-h-32 overflow-y-auto pr-2 rounded-md bg-background-light dark:bg-gray-900/50 p-3 border border-border-light dark:border-border-dark">
              {motorcyclePackages.length === 0 ? (
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark italic py-2">
                  No packages available
                </p>
              ) : (
                motorcyclePackages.map(pkg => (
                  <label key={pkg.id} className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={formData.selectedPackages.includes(pkg.id)}
                        onChange={() => handlePackageToggle(pkg.id)}
                        className="form-checkbox h-4 w-4 text-brand-blue bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark rounded focus:ring-brand-blue flex-shrink-0"
                      />
                      <span className="ml-2 text-sm text-text-primary-light dark:text-text-primary-dark truncate">{pkg.name}</span>
                    </div>
                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium ml-2 flex-shrink-0">₱{packagePrices[pkg.id] || 0}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Crew Selection */}
      {!hasPackageSelected && (
        <div className="mb-6">
          <label className="block text-lg font-bold mb-2 text-gray-800 dark:text-white">Assign Crew</label>
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsCrewOpen(!isCrewOpen)}>
              <span className="font-medium text-gray-700 dark:text-gray-200 text-sm sm:text-base">
                {formData.crew.length > 0
                  ? crews.filter(c => formData.crew.includes(c.id)).map(c => c.name).join(', ')
                  : 'Select Crew...'}
              </span>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${isCrewOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            {isCrewOpen && (
              <div className="mt-4 space-y-2 sm:space-y-3">
                {crews.map((crewMember) => (
                  <label 
                    key={crewMember.id} 
                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={formData.crew.includes(crewMember.id)}
                        onChange={() => handleCrewToggle(crewMember.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{crewMember.name}</span>
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
      <div className="pt-4 border-t border-border-light dark:border-border-dark">
        <div className="mb-4">
          <label htmlFor="edit-total_cost" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
            Total Cost <span className="text-gray-500 text-xs">(Manual Override)</span>
          </label>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
            Automatically calculated cost is ₱{calculatedCost.toLocaleString()}. You can override this amount if needed.
          </p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark">₱</span>
          <input
            type="number"
            id="edit-total_cost"
            name="total_cost"
            value={formData.total_cost}
            onChange={handleChange}
            onBlur={handleBlur}
            className="block w-full rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2 pl-8"
            placeholder="0.00"
            disabled={isSubmitting}
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t border-border-light dark:border-border-dark">
        <button
          type="button"
          onClick={onComplete}
          className="px-4 py-2 border border-border-light dark:border-border-dark text-sm font-medium rounded-md text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        {motorcycle.status !== 'completed' && (
          <button
            type="submit"
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-dark-blue transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        )}
        {motorcycle.status === 'completed' && (
          <button
            type="button"
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-400 cursor-not-allowed"
            disabled={true}
          >
            Completed
          </button>
        )}
      </div>
    </form>
  );
};

export default EditMotorcycleForm; 