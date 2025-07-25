import React, { useState, useEffect, useRef } from 'react';
import { MotorcycleSizePricing, ServicePackage, Service } from '../types';

interface EditMotorcyclePackageFormProps {
  editingPackage: ServicePackage | null;
  packageFormData: any;
  setPackageFormData: (data: any) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  formError: string;
  motorcycleServices: Service[];
}

const EditMotorcyclePackageForm: React.FC<EditMotorcyclePackageFormProps> = ({
  editingPackage,
  packageFormData,
  setPackageFormData,
  onSave,
  onCancel,
  formError,
  motorcycleServices,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localFormError, setLocalFormError] = useState<string | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  // Simulate fetching all packages for duplicate check (should be passed as prop ideally)
  const [allPackages, setAllPackages] = useState<ServicePackage[]>([]);
  useEffect(() => {
    // This should be replaced with a prop or context fetch in real app
    // For now, just fetch from window if available
    if ((window as any).allMotorcyclePackages) {
      setAllPackages((window as any).allMotorcyclePackages);
    }
  }, []);

  useEffect(() => {
    setErrors({});
    setLocalFormError(null);
  }, [editingPackage]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    // Name required
    if (!packageFormData.name || !packageFormData.name.trim()) {
      newErrors.name = 'Package name is required.';
    } else {
      // Duplicate name check (case-insensitive, exclude self)
      const trimmedName = packageFormData.name.trim().toLowerCase();
      const isDuplicate = allPackages.some(
        p => p.id !== editingPackage?.id && p.name.trim().toLowerCase() === trimmedName
      );
      if (isDuplicate) {
        newErrors.name = 'A package with this name already exists.';
      }
    }
    // At least one price required
    if ((packageFormData.pricing?.small || 0) <= 0 && (packageFormData.pricing?.large || 0) <= 0) {
      newErrors.pricing = 'At least one price (Small or Large) must be greater than zero.';
    }
    setErrors(newErrors);
    setLocalFormError(Object.keys(newErrors).length > 0 ? 'Please fix the errors below.' : null);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const validateField = (name: string, value: unknown) => {
    let error = '';
    if (name === 'name') {
      if (!value || !(value as string).trim()) {
        error = 'Package name is required.';
      } else {
        const trimmedName = (value as string).trim().toLowerCase();
        const isDuplicate = allPackages.some(
          p => p.id !== editingPackage?.id && p.name.trim().toLowerCase() === trimmedName
        );
        if (isDuplicate) {
          error = 'A package with this name already exists.';
        }
      }
    }
    if (name === 'pricingSmall' || name === 'pricingLarge') {
      const small = name === 'pricingSmall' ? Number(value) : packageFormData.pricing?.small || 0;
      const large = name === 'pricingLarge' ? Number(value) : packageFormData.pricing?.large || 0;
      if (small <= 0 && large <= 0) {
        error = 'At least one price (Small or Large) must be greater than zero.';
      }
    }
    setErrors(prev => {
      if (error) return { ...prev, [name]: error };
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setPackageFormData((prev: any) => ({ ...prev, name: value }));
      validateField('name', value);
    } else if (name === 'description') {
      setPackageFormData((prev: any) => ({ ...prev, description: value }));
    } else if (name === 'pricingSmall') {
      const val = value.replace(/^0+(?!$)/, '');
      setPackageFormData((prev: any) => ({
        ...prev,
        pricing: { ...prev.pricing, small: Number(val) || 0 }
      }));
      validateField('pricingSmall', val);
    } else if (name === 'pricingLarge') {
      const val = value.replace(/^0+(?!$)/, '');
      setPackageFormData((prev: any) => ({
        ...prev,
        pricing: { ...prev.pricing, large: Number(val) || 0 }
      }));
      validateField('pricingLarge', val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    onSave(e);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-4 sm:p-6 rounded-lg shadow-sm border border-border-light dark:border-border-dark mb-8">
      <div ref={formTopRef} />
      {localFormError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong className="block mb-1">{localFormError}</strong>
          <ul className="list-disc pl-5">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </div>
      )}
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
            name="name"
            value={packageFormData.name}
            onChange={handleChange}
            onBlur={handleBlur}
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
            name="description"
            value={packageFormData.description}
            onChange={handleChange}
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
              name="pricingSmall"
              value={packageFormData.pricing?.small === 0 ? '' : packageFormData.pricing?.small}
              onChange={handleChange}
              onBlur={handleBlur}
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
              name="pricingLarge"
              value={packageFormData.pricing?.large === 0 ? '' : packageFormData.pricing?.large}
              onChange={handleChange}
              onBlur={handleBlur}
              className="block w-full rounded-lg bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2.5 pl-7"
              min="0"
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="md:col-span-2 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark bg-surface-light dark:bg-surface-dark border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-dark-blue">{editingPackage ? 'Save Changes' : 'Create Package'}</button>
        </div>
      </form>
    </div>
  );
};

export default EditMotorcyclePackageForm; 