import React, { useState, useEffect, useMemo } from 'react';
import { useQueue } from '../context/QueueContext';
import { Service, MotorcycleSizePricing, ServicePackage } from '../types';
import { Wrench, Edit2, Trash2, Box } from 'lucide-react';

const emptyService: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'price' | 'pricing'> & { pricing: MotorcycleSizePricing } = {
  name: '',
  description: '',
  pricing: { small: 0, large: 0 },
  vehicle_type: 'motorcycle',
};

const emptyPackage: Omit<ServicePackage, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  description: '',
  vehicle_type: 'motorcycle',
};

const MotorcycleServicesPage: React.FC = () => {
  const { services, packages, addService, updateService, deleteService, addPackage, updatePackage, deletePackage } = useQueue();
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [serviceFormData, setServiceFormData] = useState(emptyService);
  const [packageFormData, setPackageFormData] = useState(emptyPackage);
  const [formError, setFormError] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');

  const motorcycleServices = useMemo(() => services.filter(s => s.vehicle_type === 'motorcycle'), [services]);
  const motorcyclePackages = useMemo(() => packages.filter(p => p.vehicle_type === 'motorcycle'), [packages]);

  useEffect(() => {
    if (editingService) {
      setServiceFormData({
        name: editingService.name,
        description: editingService.description || '',
        pricing: {
          small: (editingService.pricing as MotorcycleSizePricing)?.small || 0,
          large: (editingService.pricing as MotorcycleSizePricing)?.large || 0,
        },
        vehicle_type: 'motorcycle',
      });
      setShowServiceForm(true);
    } else {
      setServiceFormData(emptyService);
    }
  }, [editingService]);

  useEffect(() => {
    if (editingPackage) {
      setPackageFormData({
        name: editingPackage.name,
        description: editingPackage.description || '',
        vehicle_type: 'motorcycle',
      });
      setShowPackageForm(true);
    } else {
      setPackageFormData(emptyPackage);
    }
  }, [editingPackage]);

  const handleAddClick = () => {
    setEditingService(null);
    setServiceFormData(emptyService);
    setShowServiceForm(true);
    setFormError('');
  };

  const handleAddPackageClick = () => {
    setEditingPackage(null);
    setPackageFormData(emptyPackage);
    setShowPackageForm(true);
    setFormError('');
  };

  const handleCancel = () => {
    setShowServiceForm(false);
    setShowPackageForm(false);
    setEditingService(null);
    setEditingPackage(null);
    setServiceFormData(emptyService);
    setPackageFormData(emptyPackage);
    setFormError('');
  };

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setFormError('');
  };

  const handleDeleteClick = async (service: Service) => {
    if (window.confirm(`Are you sure you want to delete "${service.name}"? This action cannot be undone.`)) {
      try {
        await deleteService(service.id);
        if (editingService?.id === service.id) {
          handleCancel();
        }
      } catch (error) {
        console.error('Failed to delete service:', error);
        alert(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
      }
    }
  };

  const handlePricingChange = (size: 'small' | 'large', value: number) => {
    const price = !isNaN(value) && value >= 0 ? value : 0;
    setServiceFormData(prev => ({ ...prev, pricing: { ...prev.pricing, [size]: price } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!serviceFormData.name.trim()) {
      setFormError('Service name is required.');
      return;
    }
    if (serviceFormData.pricing.small <= 0 && serviceFormData.pricing.large <= 0) {
      setFormError('At least one price (Small or Large) must be greater than zero.');
      return;
    }

    try {
      const serviceData = {
        ...serviceFormData,
        name: serviceFormData.name.trim(),
        description: serviceFormData.description?.trim() || undefined,
      };

      if (editingService) {
        await updateService(editingService.id, serviceData);
      } else {
        await addService(serviceData);
      }
      handleCancel();
    } catch (error) {
      console.error('Failed to save service', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      setFormError(`Failed to save service: ${message}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 xl:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-brand-blue truncate">Motorcycle Services & Packages</h1>
            <p className="text-xs sm:text-sm lg:text-base text-text-secondary-light dark:text-text-secondary-dark mt-1">
              Manage your motorcycle service offerings and package deals
            </p>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark">
              <span className="font-medium">{motorcycleServices.length}</span> Services, <span className="font-medium">{motorcyclePackages.length}</span> Packages
            </div>
            {!showServiceForm && !showPackageForm && (
              <button
                onClick={() => activeTab === 'services' ? setShowServiceForm(true) : setShowPackageForm(true)}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-brand-blue hover:bg-brand-dark-blue transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {activeTab === 'services' ? <Wrench className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" /> : <Box className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />}
                <span className="hidden xs:inline">Add New</span>
                <span className="xs:hidden">Add</span>
              </button>
            )}
          </div>
        </div>
        <div className="border-b border-border-light dark:border-border-dark mb-4 sm:mb-6">
          <nav className="-mb-px flex space-x-6 sm:space-x-8">
            <button
              onClick={() => setActiveTab('services')}
              className={`py-2 px-1 border-b-2 font-medium text-sm sm:text-base transition-colors duration-200 ${activeTab === 'services' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:border-border-light dark:hover:border-border-dark'}`}
            >
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Services</span>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">{motorcycleServices.length}</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`py-2 px-1 border-b-2 font-medium text-sm sm:text-base transition-colors duration-200 ${activeTab === 'packages' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:border-border-light dark:hover:border-border-dark'}`}
            >
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Packages</span>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">{motorcyclePackages.length}</span>
            </div>
            </button>
          </nav>
        </div>
        {activeTab === 'services' && showServiceForm && (
          <div className="bg-surface-light dark:bg-surface-dark p-4 sm:p-6 rounded-lg shadow-sm border border-border-light dark:border-border-dark mb-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                {editingService ? 'Update the details for this motorcycle service.' : 'Define a new service for motorcycles.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={serviceFormData.name}
                  onChange={e => setServiceFormData(prev => ({...prev, name: e.target.value}))}
                  className="block w-full rounded-lg bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2.5"
                  placeholder="e.g., Change Oil"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  Description <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <textarea
                  id="description"
                  value={serviceFormData.description}
                  onChange={e => setServiceFormData(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                  className="block w-full rounded-lg bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2.5"
                  placeholder="Briefly describe the service..."
                />
              </div>
              
              <div>
                <label htmlFor="price-small" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  Small Size Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark sm:text-sm">₱</span>
                  </div>
                  <input
                    type="number"
                    id="price-small"
                    value={serviceFormData.pricing.small === 0 ? '' : serviceFormData.pricing.small}
                    onChange={e => {
                      const value = e.target.value.replace(/^0+(?!$)/, '');
                      setServiceFormData(prev => ({
                        ...prev,
                        pricing: { ...prev.pricing, small: Number(value) || 0 }
                      }));
                    }}
                    className="block w-full rounded-lg bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2.5 pl-7"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="price-large" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  Large Size Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark sm:text-sm">₱</span>
                  </div>
                  <input
                    type="number"
                    id="price-large"
                    value={serviceFormData.pricing.large === 0 ? '' : serviceFormData.pricing.large}
                    onChange={e => {
                      const value = e.target.value.replace(/^0+(?!$)/, '');
                      setServiceFormData(prev => ({
                        ...prev,
                        pricing: { ...prev.pricing, large: Number(value) || 0 }
                      }));
                    }}
                    className="block w-full rounded-lg bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2.5 pl-7"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {formError && <p className="md:col-span-2 mt-2 text-sm text-red-500">{formError}</p>}
              
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark bg-surface-light dark:bg-surface-dark border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-dark-blue">{editingService ? 'Save Changes' : 'Create Service'}</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'packages' && showPackageForm && (
          <div className="bg-surface-light dark:bg-surface-dark p-4 sm:p-6 rounded-lg shadow-sm border border-border-light dark:border-border-dark mb-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">
                {editingPackage ? 'Edit Package' : 'Add New Package'}
              </h3>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                {editingPackage ? 'Update the details for this motorcycle package.' : 'Define a new package for motorcycles.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={packageFormData.name}
                  onChange={e => setPackageFormData(prev => ({...prev, name: e.target.value}))}
                  className="block w-full rounded-lg bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2.5"
                  placeholder="e.g., Oil Change Package"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  Description <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <textarea
                  id="description"
                  value={packageFormData.description}
                  onChange={e => setPackageFormData(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                  className="block w-full rounded-lg bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2.5"
                  placeholder="Briefly describe the package..."
                />
              </div>

              <div>
                <label htmlFor="package-price-small" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  Small Size Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark sm:text-sm">₱</span>
                  </div>
                  <input
                    type="number"
                    id="package-price-small"
                    value={packageFormData.pricing?.small === 0 ? '' : packageFormData.pricing?.small}
                    onChange={e => {
                      const value = e.target.value.replace(/^0+(?!$)/, '');
                      setPackageFormData(prev => ({
                        ...prev,
                        pricing: { ...prev.pricing, small: Number(value) || 0 }
                      }));
                    }}
                    className="block w-full rounded-lg bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2.5 pl-7"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="package-price-large" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  Large Size Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark sm:text-sm">₱</span>
                  </div>
                  <input
                    type="number"
                    id="package-price-large"
                    value={packageFormData.pricing?.large === 0 ? '' : packageFormData.pricing?.large}
                    onChange={e => {
                      const value = e.target.value.replace(/^0+(?!$)/, '');
                      setPackageFormData(prev => ({
                        ...prev,
                        pricing: { ...prev.pricing, large: Number(value) || 0 }
                      }));
                    }}
                    className="block w-full rounded-lg bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2.5 pl-7"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {formError && <p className="md:col-span-2 mt-2 text-sm text-red-500">{formError}</p>}
              
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark bg-surface-light dark:bg-surface-dark border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-dark-blue">{editingPackage ? 'Save Changes' : 'Create Package'}</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'services' && !showServiceForm && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-text-primary-light dark:text-text-primary-dark">Services</h2>
        <div className="bg-surface-light dark:bg-surface-dark shadow overflow-hidden rounded-lg border border-border-light dark:border-border-dark">
          <ul className="divide-y divide-border-light dark:divide-border-dark">
            {motorcycleServices.length > 0 ? motorcycleServices.map(service => (
              <li key={service.id} className="p-4 sm:p-6 hover:bg-background-light dark:hover:bg-background-dark transition-colors duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark truncate">{service.name}</h4>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1 truncate">
                      {service.description || 'No description available.'}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-4 mt-4 sm:mt-0 sm:ml-6">
                    <div className="flex flex-col text-right">
                      <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Small</span>
                      <span className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                        ₱{(service.pricing as MotorcycleSizePricing)?.small ?? 'N/A'}
                      </span>
                    </div>
                     <div className="flex flex-col text-right">
                      <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Large</span>
                      <span className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                        ₱{(service.pricing as MotorcycleSizePricing)?.large ?? 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditClick(service)}
                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Edit Service"
                      >
                        <Edit2 className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(service)}
                        className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        title="Delete Service"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )) : (
                  <li className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">No motorcycle services found.</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'packages' && !showPackageForm && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-text-primary-light dark:text-text-primary-dark">Packages</h2>
            <div className="bg-surface-light dark:bg-surface-dark shadow overflow-hidden rounded-lg border border-border-light dark:border-border-dark">
              <ul className="divide-y divide-border-light dark:divide-border-dark">
                {motorcyclePackages.length > 0 ? motorcyclePackages.map(pkg => (
                  <li key={pkg.id} className="p-4 sm:p-6 hover:bg-background-light dark:hover:bg-background-dark transition-colors duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark truncate">{pkg.name}</h4>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1 truncate">
                          {pkg.description || 'No description available.'}
                </p>
              </div>
                      <div className="flex items-baseline gap-4 mt-4 sm:mt-0 sm:ml-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(pkg)}
                            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Edit Package"
                          >
                            <Edit2 className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(pkg)}
                            className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete Package"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                )) : (
                  <li className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">No motorcycle packages found.</li>
            )}
          </ul>
        </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MotorcycleServicesPage; 