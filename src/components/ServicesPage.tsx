import React, { useState, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { Service, ServicePackage, SizePricing, CAR_SIZES } from '../types';
import { Plus, Edit2, Trash2, Package, Wrench } from 'lucide-react';

const ServicesPage: React.FC = () => {
  const { 
    services, 
    packages, 
    addService, 
    updateService, 
    deleteService, 
    addPackage, 
    updatePackage, 
    deletePackage
  } = useQueue();
  
  const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Local form state - completely isolated from real-time updates
  const serviceFormStateRef = useRef({ name: '', description: '', pricing: { small: 0, medium: 0, large: 0, extra_large: 0 } });
  const [serviceFormData, setServiceFormData] = useState({ name: '', description: '', pricing: { small: 0, medium: 0, large: 0, extra_large: 0 } });
  const setServiceFormDataPersist = (data: typeof serviceFormData) => {
    serviceFormStateRef.current = data;
    setServiceFormData(data);
  };
  const packageFormStateRef = useRef({ name: '', description: '', service_ids: [], pricing: { small: 0, medium: 0, large: 0, extra_large: 0 }, vehicle_type: 'car' });
  const [packageFormData, setPackageFormData] = useState({ name: '', description: '', service_ids: [], pricing: { small: 0, medium: 0, large: 0, extra_large: 0 }, vehicle_type: 'car' });
  const setPackageFormDataPersist = (data: typeof packageFormData) => {
    setPackageFormData(data);
  };

  const resetServiceForm = () => {
    setServiceFormData({
      name: '',
      description: '',
      pricing: { small: 0, medium: 0, large: 0, extra_large: 0 }
    });
    setEditingService(null);
    setShowAddForm(false);
    setErrors({});
  };

  const resetPackageForm = () => {
    setPackageFormData({
      name: '',
      description: '',
      service_ids: [],
      pricing: { small: 0, medium: 0, large: 0, extra_large: 0 },
      vehicle_type: 'car',
    });
    setEditingPackage(null);
    setShowAddForm(false);
    setErrors({});
  };

  const validateService = () => {
    const newErrors: Record<string, string> = {};
    if (!serviceFormData.name.trim()) {
      newErrors.name = 'Service name is required.';
    }
    const hasAtLeastOnePrice = Object.values(serviceFormData.pricing).some(price => price > 0);
    if (!hasAtLeastOnePrice) {
      newErrors.pricing = 'At least one price for a car size must be set.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePackage = () => {
    const newErrors: Record<string, string> = {};
    if (!packageFormData.name.trim()) {
      newErrors.name = 'Package name is required.';
    }
    if (packageFormData.service_ids.length === 0) {
      newErrors.services = 'At least one service must be included in a package.';
    }
    const hasAtLeastOnePrice = Object.values(packageFormData.pricing).some(price => price > 0);
    if (!hasAtLeastOnePrice) {
      newErrors.pricing = 'At least one price for a car size must be set.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateService()) return;

    try {
      const serviceData = {
        name: serviceFormData.name.trim(),
        description: serviceFormData.description.trim() || null,
        price: serviceFormData.pricing.medium, // Use medium as base price
        pricing: serviceFormData.pricing,
      };

      if (editingService) {
        await updateService(editingService.id, serviceData);
      } else {
        await addService(serviceData);
      }
      
      resetServiceForm();
    } catch (error) {
      console.error('Error saving service:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrors({ form: `Failed to save service: ${errorMessage}. Please try again.` });
    }
  };

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePackage()) return;

    try {
      const packageData = {
        name: packageFormData.name.trim(),
        description: packageFormData.description.trim() || null,
        service_ids: packageFormData.service_ids,
        pricing: packageFormData.pricing,
        is_active: true,
        vehicle_type: 'car',
      };

      if (editingPackage) {
        await updatePackage(editingPackage.id, packageData);
      } else {
        await addPackage(packageData);
      }
      
      resetPackageForm();
    } catch (error) {
      console.error('Error saving package:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrors({ form: `Failed to save package: ${errorMessage}. Please try again.` });
    }
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setServiceFormData({
      name: service.name,
      description: service.description || '',
      pricing: service.pricing || { small: 0, medium: 0, large: 0, extra_large: 0 },
    });
    setActiveTab('services');
    setShowAddForm(false);
    setErrors({});
  };

  const handleEditPackage = (pkg: ServicePackage) => {
    setEditingPackage(pkg);
    setPackageFormData({
      name: pkg.name,
      description: pkg.description || '',
      service_ids: pkg.service_ids || [],
      pricing: pkg.pricing || { small: 0, medium: 0, large: 0, extra_large: 0 },
      vehicle_type: 'car',
    });
    setActiveTab('packages');
    setShowAddForm(false);
    setErrors({});
  };

  const handleDeleteService = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      try {
        await deleteService(id);
      } catch (error) {
        console.error('Error deleting service:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Failed to delete service: ${errorMessage}. Please try again.`);
      }
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this package? This action cannot be undone.')) {
      try {
        await deletePackage(id);
      } catch (error) {
        console.error('Error deleting package:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Failed to delete package: ${errorMessage}. Please try again.`);
      }
    }
  };

  const handleServicePricingChange = (size: keyof SizePricing, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    setServiceFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [size]: numValue
      }
    }));
  };

  const handlePackagePricingChange = (size: keyof SizePricing, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    setPackageFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [size]: numValue
      }
    }));
  };

  const handleServiceToggle = (serviceId: string) => {
    setPackageFormData(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId]
    }));
  };

  // Memoized forms (to prevent re-renders from killing input state)
  const ServiceForm = React.useMemo(() => (
    <form onSubmit={handleServiceSubmit} className="bg-surface-light dark:bg-surface-dark p-4 sm:p-6 rounded-lg shadow-sm border border-border-light dark:border-border-dark mb-6">
      <h3 className="text-xl font-medium text-text-primary-light dark:text-text-primary-dark mb-4">
        {editingService ? 'Edit Service' : 'Add New Service'}
      </h3>
      {errors.form && <p className="text-sm text-red-500 mb-4">{errors.form}</p>}
      <div className="space-y-4">
        <div>
          <label htmlFor="service-name" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
            Service Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="service-name"
            value={serviceFormData.name}
            onChange={(e) => setServiceFormData(prev => ({...prev, name: e.target.value}))}
            className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-3 ${errors.name ? 'border-red-500' : 'border-border-light dark:border-border-dark'}`}
            placeholder="e.g., Premium Wash"
            required
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        
        <div>
          <label htmlFor="service-description" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
            Description <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <textarea
            id="service-description"
            value={serviceFormData.description}
            onChange={(e) => setServiceFormData(prev => ({...prev, description: e.target.value}))}
            className="block w-full rounded-md bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-3"
            rows={3}
            placeholder="Briefly describe the service"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
            Pricing by Car Size <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CAR_SIZES.map(size => (
              <div key={size.value}>
                <label htmlFor={`service-price-${size.value}`} className="block text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1 capitalize">{size.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark">₱</span>
                  <input
                    type="number"
                    id={`service-price-${size.value}`}
                    value={serviceFormData.pricing[size.value] || ''}
                    onChange={(e) => handleServicePricingChange(size.value, e)}
                    className="block w-full rounded-md bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-3 pl-8 text-right"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            ))}
          </div>
          {errors.pricing && <p className="text-xs text-red-500 mt-2">{errors.pricing}</p>}
        </div>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={resetServiceForm}
          className="px-4 py-2 border border-border-light dark:border-border-dark text-sm font-medium rounded-md text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-dark-blue"
        >
          {editingService ? 'Update Service' : 'Save Service'}
        </button>
      </div>
    </form>
  ), [serviceFormData, editingService]);

  const PackageForm = React.useMemo(() => (
    <form onSubmit={handlePackageSubmit} className="bg-surface-light dark:bg-surface-dark p-4 sm:p-6 rounded-lg shadow-sm border border-border-light dark:border-border-dark mb-6">
      <h3 className="text-xl font-medium text-text-primary-light dark:text-text-primary-dark mb-4">
        {editingPackage ? 'Edit Package' : 'Add New Package'}
      </h3>
      {errors.form && <p className="text-sm text-red-500 mb-4">{errors.form}</p>}
      <div className="space-y-4">
        <div>
          <label htmlFor="package-name" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
            Package Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="package-name"
            value={packageFormData.name}
            onChange={(e) => setPackageFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`block w-full rounded-md bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-3 ${errors.name ? 'border-red-500' : 'border-border-light dark:border-border-dark'}`}
            placeholder="e.g., Full Service Detail"
            required
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        
        <div>
          <label htmlFor="package-description" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
            Description <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <textarea
            id="package-description"
            value={packageFormData.description}
            onChange={(e) => setPackageFormData(prev => ({ ...prev, description: e.target.value }))}
            className="block w-full rounded-md bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-3"
            rows={3}
            placeholder="Briefly describe the package"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
            Included Services <span className="text-red-500">*</span>
          </label>
          <div className="max-h-40 overflow-y-auto space-y-2 p-2 border border-border-light dark:border-border-dark rounded-md">
            {services.map(service => (
              <div key={service.id} className="flex items-center">
                  <input
                    type="checkbox"
                  id={`service-checkbox-${service.id}`}
                    checked={packageFormData.service_ids.includes(service.id)}
                    onChange={() => handleServiceToggle(service.id)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-blue focus:ring-brand-blue"
                  />
                <label htmlFor={`service-checkbox-${service.id}`} className="ml-2 text-sm text-text-primary-light dark:text-text-primary-dark">
                  {service.name}
                </label>
              </div>
            ))}
          </div>
          {errors.services && <p className="text-xs text-red-500 mt-1">{errors.services}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
            Pricing by Car Size <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CAR_SIZES.map(size => (
              <div key={size.value}>
                <label htmlFor={`package-price-${size.value}`} className="block text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1 capitalize">{size.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark">₱</span>
                  <input
                    type="number"
                    id={`package-price-${size.value}`}
                    value={packageFormData.pricing[size.value] || ''}
                    onChange={(e) => handlePackagePricingChange(size.value, e)}
                    className="block w-full rounded-md bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-3 pl-8 text-right"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            ))}
          </div>
          {errors.pricing && <p className="text-xs text-red-500 mt-2">{errors.pricing}</p>}
        </div>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={resetPackageForm}
          className="px-4 py-2 border border-border-light dark:border-border-dark text-sm font-medium rounded-md text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-dark-blue"
        >
          {editingPackage ? 'Update Package' : 'Save Package'}
        </button>
      </div>
    </form>
  ), [packageFormData, editingPackage, services]);

  const carPackages = packages.filter(p => p.vehicle_type === 'car');

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 xl:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-brand-blue truncate">Services & Packages</h1>
            <p className="text-xs sm:text-sm lg:text-base text-text-secondary-light dark:text-text-secondary-dark mt-1">
              Manage your service offerings and package deals
            </p>
        </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark">
              <span className="font-medium">{services.length}</span> Services, <span className="font-medium">{carPackages.length}</span> Packages
            </div>
        {!showAddForm && !editingService && !editingPackage && (
          <button
            onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-brand-blue hover:bg-brand-dark-blue transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Add New</span>
                <span className="xs:hidden">Add</span>
          </button>
        )}
          </div>
      </div>

      {/* Tabs */}
        <div className="border-b border-border-light dark:border-border-dark mb-4 sm:mb-6">
          <nav className="-mb-px flex space-x-6 sm:space-x-8">
          <button
              onClick={() => setActiveTab('services')}
              className={`py-2 px-1 border-b-2 font-medium text-sm sm:text-base transition-colors duration-200 ${
              activeTab === 'services'
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:border-border-light dark:hover:border-border-dark'
            }`}
          >
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Services</span>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                  {services.length}
                </span>
              </div>
          </button>
          <button
              onClick={() => setActiveTab('packages')}
              className={`py-2 px-1 border-b-2 font-medium text-sm sm:text-base transition-colors duration-200 ${
              activeTab === 'packages'
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:border-border-light dark:hover:border-border-dark'
            }`}
          >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Packages</span>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                  {carPackages.length}
                </span>
              </div>
          </button>
        </nav>
      </div>

        {/* Forms */}
        {showAddForm && activeTab === 'services' && !editingService && ServiceForm}
        {editingService && ServiceForm}
        {showAddForm && activeTab === 'packages' && !editingPackage && PackageForm}
        {editingPackage && PackageForm}

        {/* Content */}
        {activeTab === 'services' && (
            <ServiceList 
              services={services} 
              onEdit={handleEditService} 
              onDelete={handleDeleteService} 
            />
        )}
        {activeTab === 'packages' && (
            <PackageList 
              packages={carPackages} 
              services={services} 
              onEdit={handleEditPackage} 
              onDelete={handleDeletePackage} 
            />
          )}
      </div>
                          </div>
                        );
};


const ServiceList = ({ services, onEdit, onDelete }) => (
  <div className="bg-surface-light dark:bg-surface-dark shadow overflow-hidden rounded-lg border border-border-light dark:border-border-dark">
    <ul className="divide-y divide-border-light dark:divide-border-dark">
      {services.map((service) => (
        <li key={service.id} className="p-3 sm:p-4 lg:p-6 hover:bg-background-light dark:hover:bg-background-dark transition-colors duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-grow min-w-0">
              <h3 className="text-base sm:text-lg lg:text-xl font-medium text-text-primary-light dark:text-text-primary-dark">{service.name}</h3>
              {service.description && <p className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1 max-w-prose">{service.description}</p>}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-3 sm:gap-x-4 gap-y-2 text-xs sm:text-sm">
                {CAR_SIZES.map(size => (
                  <div key={size.value} className="flex justify-between items-baseline sm:block">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark capitalize">{size.label}: </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ₱{(service.pricing?.[size.value] || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex space-x-2 self-end sm:self-center flex-shrink-0">
              <button onClick={() => onEdit(service)} className="p-1.5 sm:p-2 text-text-secondary-light dark:text-text-secondary-dark hover:text-brand-blue bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors">
                <span className="sr-only">Edit {service.name}</span>
                      <Edit2 className="h-4 w-4" />
                    </button>
              <button onClick={() => onDelete(service.id)} className="p-1.5 sm:p-2 text-red-500 hover:text-red-400 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors">
                <span className="sr-only">Delete {service.name}</span>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {services.length === 0 && (
              <li className="p-4 sm:p-6 lg:p-8 text-center">
          <div className="flex flex-col items-center">
            <Wrench className="h-8 w-8 sm:h-12 sm:w-12 text-text-secondary-light dark:text-text-secondary-dark mb-3 sm:mb-4 opacity-50" />
            <h3 className="text-sm sm:text-base font-medium text-text-primary-light dark:text-text-primary-dark mb-1">No services yet</h3>
            <p className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark">Add your first service to get started.</p>
          </div>
              </li>
            )}
          </ul>
        </div>
);

const PackageList = ({ packages, services, onEdit, onDelete }) => (
  <div className="bg-surface-light dark:bg-surface-dark shadow overflow-hidden rounded-lg border border-border-light dark:border-border-dark">
    <ul className="divide-y divide-border-light dark:divide-border-dark">
            {packages.map((pkg) => (
        <li key={pkg.id} className="p-3 sm:p-4 lg:p-6 hover:bg-background-light dark:hover:bg-background-dark transition-colors duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-grow min-w-0">
              <h3 className="text-base sm:text-lg lg:text-xl font-medium text-text-primary-light dark:text-text-primary-dark">{pkg.name}</h3>
              {pkg.description && <p className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1 max-w-prose">{pkg.description}</p>}
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Included Services:</h4>
                <ul className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                  {pkg.service_ids.map(id => {
                    const service = services.find(s => s.id === id);
                          return service ? (
                      <li key={id} className="text-xs sm:text-sm text-text-primary-light dark:text-text-primary-dark bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                              {service.name}
                      </li>
                          ) : null;
                        })}
                </ul>
                      </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-3 sm:gap-x-4 gap-y-2 text-xs sm:text-sm">
                      {CAR_SIZES.map(size => (
                  <div key={size.value} className="flex justify-between items-baseline sm:block">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark capitalize">{size.label}: </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                            ₱{(pkg.pricing?.[size.value] || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
            <div className="flex space-x-2 self-end sm:self-center flex-shrink-0">
              <button onClick={() => onEdit(pkg)} className="p-1.5 sm:p-2 text-text-secondary-light dark:text-text-secondary-dark hover:text-brand-blue bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors">
                <span className="sr-only">Edit {pkg.name}</span>
                      <Edit2 className="h-4 w-4" />
                    </button>
              <button onClick={() => onDelete(pkg.id)} className="p-1.5 sm:p-2 text-red-500 hover:text-red-400 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors">
                <span className="sr-only">Delete {pkg.name}</span>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {packages.length === 0 && (
              <li className="p-4 sm:p-6 lg:p-8 text-center">
          <div className="flex flex-col items-center">
            <Package className="h-8 w-8 sm:h-12 sm:w-12 text-text-secondary-light dark:text-text-secondary-dark mb-3 sm:mb-4 opacity-50" />
            <h3 className="text-sm sm:text-base font-medium text-text-primary-light dark:text-text-primary-dark mb-1">No packages yet</h3>
            <p className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark">Add your first package to get started.</p>
          </div>
              </li>
            )}
          </ul>
    </div>
  );

export default ServicesPage;