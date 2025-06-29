import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { Car, CAR_SIZES, SERVICE_STATUSES, SizePricing } from '../types';
import { 
  validateLicensePlate,
  validateCarModel,
  validatePhoneNumber,
  validateCost,
  validateCarSize,
  validateServiceStatus
} from '../lib/validation';

interface EditCarFormProps {
  car: Car;
  onComplete: () => void;
}

const EditCarForm: React.FC<EditCarFormProps> = ({ car, onComplete }) => {
  const { updateCar, services, packages, crews, cars } = useQueue();

  // Find all crew members who are currently busy on other cars
  const busyCrewIds = useMemo(() => {
    const today = new Date();
    const isToday = (dateString: string) => {
      if (!dateString) return false;
      const date = new Date(dateString);
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    };

    console.log(`%c[EditCarForm] Calculating busy crew for car: ${car.plate}`, 'color: #f59e0b');
    const busyIds = new Set<string>();
    cars.forEach(c => {
      // A crew member is busy if another car is 'in-progress' AND was created today.
      if (c.status === 'in-progress' && c.id !== car.id && isToday(c.created_at)) {
        c.crew?.forEach(crewId => busyIds.add(crewId));
      }
    });
    console.log(`%c[EditCarForm] Busy Crew IDs for today (excluding current car):`, 'color: #f59e0b', Array.from(busyIds));
    return busyIds;
  }, [cars, car.id]);

  // Helper to initialize selected services and packages from the car's data
  const initialServices = car.services || [];
  const serviceIds = new Set(services.map(s => s.id));
  const packageIds = new Set(packages.map(p => p.id));
  
  const initialSelectedServices = initialServices.filter(id => serviceIds.has(id));
  const initialSelectedPackages = initialServices.filter(id => packageIds.has(id));

  // Filter car services and packages
  const carServices = services.filter(s => !s.vehicle_type || s.vehicle_type === 'car');
  const carPackages = packages.filter(p => !p.vehicle_type || p.vehicle_type === 'car');

  const [formData, setFormData] = useState({
    plate: car.plate,
    model: car.model,
    size: car.size,
    service: car.service,
    status: car.status,
    phone: car.phone || '',
    crew: car.crew || [],
    selectedServices: initialSelectedServices,
    selectedPackages: initialSelectedPackages,
    total_cost: car.total_cost || 0,
  });
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [packagePrices, setPackagePrices] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isPackagesOpen, setIsPackagesOpen] = useState(false);
  const [isCrewOpen, setIsCrewOpen] = useState(false);
  const [totalCost, setTotalCost] = useState(car.total_cost || 0);
  const [isCostOverridden, setIsCostOverridden] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  const hasPackageSelected = useMemo(() => formData.selectedPackages.length > 0, [formData.selectedPackages]);

  useEffect(() => {
    // Initialize service prices based on car size
    const prices: Record<string, number> = {};
    carServices.forEach(service => {
      const pricing = service.pricing as SizePricing;
      prices[service.id] = pricing?.[formData.size as keyof SizePricing] || service.price;
    });
    setServicePrices(prices);
  }, [carServices, formData.size]);

  useEffect(() => {
    // Initialize package prices based on car size
    const prices: Record<string, number> = {};
    carPackages.forEach(pkg => {
      prices[pkg.id] = pkg.pricing[formData.size as keyof SizePricing] || 0;
    });
    setPackagePrices(prices);
  }, [carPackages, formData.size]);

  useEffect(() => {
    if (isCostOverridden) return;
    const serviceTotal = formData.selectedServices.reduce((sum, serviceId) => sum + (servicePrices[serviceId] || 0), 0);
    const packageTotal = formData.selectedPackages.reduce((sum, packageId) => sum + (packagePrices[packageId] || 0), 0);
    const total = serviceTotal + packageTotal;
    setTotalCost(total);
  }, [formData.selectedServices, formData.selectedPackages, servicePrices, packagePrices, isCostOverridden]);

  useEffect(() => {
    setFormData({
      plate: car.plate,
      model: car.model,
      size: car.size,
      service: car.service,
      status: car.status,
      phone: car.phone || '',
      crew: car.crew || [],
      selectedServices: initialSelectedServices,
      selectedPackages: initialSelectedPackages,
      total_cost: car.total_cost || 0,
    });
    setTotalCost(car.total_cost || 0);
    setIsCostOverridden(false);
  }, [car.id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    const plateResult = validateLicensePlate(formData.plate);
    if (!plateResult.isValid) newErrors.plate = plateResult.error!;
    else {
      // Check for duplicate plate in active queue, excluding the current car
      const trimmedPlate = formData.plate.trim().toUpperCase();
      const isDuplicate = cars.some(
        c => c.id !== car.id &&
             c.plate.trim().toUpperCase() === trimmedPlate &&
             (c.status === 'waiting' || c.status === 'in-progress')
      );
      if (isDuplicate) {
        newErrors.plate = 'This license plate is already in the active queue for another vehicle.';
      }
    }

    const modelResult = validateCarModel(formData.model);
    if (!modelResult.isValid) newErrors.model = modelResult.error!;
    
    const phoneResult = validatePhoneNumber(formData.phone);
    if (!phoneResult.isValid) newErrors.phone = phoneResult.error!;

    const sizeResult = validateCarSize(formData.size);
    if (!sizeResult.isValid) newErrors.size = sizeResult.error!;

    const statusResult = validateServiceStatus(formData.status);
    if (!statusResult.isValid) newErrors.status = statusResult.error!;

    const costResult = validateCost(totalCost);
    if (!costResult.isValid) newErrors.total_cost = costResult.error!;

    if (formData.status === 'in-progress' && formData.crew.length === 0 && !hasPackageSelected) {
      newErrors.crew = 'Assign at least one crew member for cars "In Progress".';
    }

    if (formData.selectedServices.length === 0 && formData.selectedPackages.length === 0) {
      newErrors.services = 'Please select at least one service or package.';
    }

    setErrors(newErrors);
    setFormError(Object.keys(newErrors).length > 0 ? 'Please fix the errors below.' : null);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue: string | number = value;

    if (name === 'total_cost') {
      setIsCostOverridden(true);
      setTotalCost(value === '' ? 0 : parseFloat(value));
      return;
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
        result = validateLicensePlate(value);
        break;
      case 'model':
        result = validateCarModel(value);
        break;
      case 'phone':
        result = validatePhoneNumber(value);
        break;
      case 'size':
        result = validateCarSize(value);
        break;
      case 'status':
        result = validateServiceStatus(value);
        break;
      case 'total_cost':
        result = validateCost(totalCost);
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
      const selectedServices = carServices.filter(s => formData.selectedServices.includes(s.id));
      const selectedPackages = carPackages.filter(p => formData.selectedPackages.includes(p.id));
      const selectedServiceNames = formData.selectedServices.map(id => {
        const service = carServices.find(s => s.id === id);
        return service?.name || '';
      }).filter(name => name.length > 0);
      const selectedPackageNames = formData.selectedPackages.map(id => {
        const pkg = carPackages.find(p => p.id === id);
        return pkg?.name || '';
      }).filter(name => name.length > 0);
      const allServiceNames = [
        ...selectedServiceNames,
        ...selectedPackageNames
      ];
      await updateCar(car.id, {
        ...formData,
        total_cost: totalCost,
        service: allServiceNames.join(', '),
        services: allSelectedServiceIds,
      });
      onComplete();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'An unknown error occurred. Please try again.');
      console.error('Error updating car:', error);
    } finally {
      setIsSubmitting(false);
    }
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
        <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">Edit Vehicle Information</h3>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Update the vehicle details below. Required fields are marked with a red asterisk (*).
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
            placeholder="ABC-1234"
            maxLength={8}
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
              Vehicle's license plate number
            </p>
          )}
        </div>

        <div>
          <label htmlFor="edit-model" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
            Car Model <span className="text-red-500">*</span>
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
            placeholder="e.g., Toyota Vios"
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
              Vehicle's make and model
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
            Car Size <span className="text-red-500">*</span>
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
            {CAR_SIZES.map(size => (
              <option key={size.value} value={size.value}>{size.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
            Vehicle size affects service pricing
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
            {SERVICE_STATUSES.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
            Current service status of the vehicle
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
            Select or modify the services and packages for this vehicle
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Services */}
          <div>
            <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
            Services
          </label>
            <div className="max-h-32 overflow-y-auto pr-2 rounded-md bg-background-light dark:bg-gray-900/50 p-2 border border-border-light dark:border-border-dark">
              {carServices.map(service => (
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
          </div>
          {/* Packages */}
          <div>
            <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              Packages
          </label>
            <div className="max-h-32 overflow-y-auto pr-2 rounded-md bg-background-light dark:bg-gray-900/50 p-2 border border-border-light dark:border-border-dark">
              {carPackages.map(pkg => (
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
          </div>
        </div>

      {!hasPackageSelected && (
        <div className="mb-6">
          <label className="block text-lg font-bold mb-2 text-gray-800 dark:text-white">Assign Crew</label>
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsCrewOpen(!isCrewOpen)}>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {formData.crew.length > 0
                  ? formData.crew.map(id => crews.find(c => c.id === id)?.name).join(', ')
                  : 'Select Crew...'}
              </span>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${isCrewOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            {isCrewOpen && (
              <div className="mt-4 space-y-3">
                {crews.map((crewMember) => {
                  const isBusy = busyCrewIds.has(crewMember.id);
                  return (
                    <label 
                      key={crewMember.id} 
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isBusy ? 'cursor-not-allowed bg-gray-200 dark:bg-gray-600 opacity-70' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.crew.includes(crewMember.id)}
                          onChange={() => !isBusy && handleCrewToggle(crewMember.id)}
                          disabled={isBusy}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-200">{crewMember.name}</span>
                      </div>
                      {isBusy && (
                        <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">Busy</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          {errors.crew && <p className="text-red-500 text-sm mt-2">{errors.crew}</p>}
        </div>
      )}
      
      {/* Total Cost */}
      <div className="mb-6">
        <label htmlFor="total_cost" className="block text-lg font-bold mb-2 text-gray-800 dark:text-white">Total Cost</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark">₱</span>
          <input
            type="number"
            id="edit-total_cost"
            name="total_cost"
            value={totalCost}
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
      </div>
    </form>
  );
};

export default EditCarForm;