import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ServicePackage, Service } from '../types';
import { supabase } from '../lib/supabase';
import EditMotorcyclePackageForm from './EditMotorcyclePackageForm';

const defaultPricing = { small: 0, large: 0 };

const EditMotorcyclePackagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const [packageFormData, setPackageFormData] = useState<any>({ name: '', description: '', pricing: defaultPricing });
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [motorcycleServices, setMotorcycleServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFormError('');
      // Fetch package
      const { data: pkg, error: pkgError } = await supabase
        .from('service_packages')
        .select('*')
        .eq('id', id)
        .single();
      if (pkgError || !pkg) {
        setFormError('Failed to load package.');
        setLoading(false);
        return;
      }
      setEditingPackage(pkg);
      setPackageFormData({
        name: pkg.name || '',
        description: pkg.description || '',
        pricing: pkg.pricing || defaultPricing,
      });
      // Fetch motorcycle services
      const { data: services, error: svcError } = await supabase
        .from('services')
        .select('*')
        .eq('vehicle_type', 'motorcycle');
      if (!svcError && services) setMotorcycleServices(services);
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!packageFormData.name || !packageFormData.pricing.small || !packageFormData.pricing.large) {
      setFormError('Please fill out all required fields.');
      return;
    }
    const { error } = await supabase
      .from('service_packages')
      .update({
        name: packageFormData.name,
        description: packageFormData.description,
        pricing: packageFormData.pricing,
      })
      .eq('id', id);
    if (error) {
      setFormError('Failed to update package.');
      return;
    }
    navigate('/motorcycle-packages');
  };

  const handleCancel = () => {
    navigate('/motorcycle-packages');
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (formError && !editingPackage) return <div className="p-8 text-center text-red-500">{formError}</div>;

  return (
    <EditMotorcyclePackageForm
      editingPackage={editingPackage}
      packageFormData={packageFormData}
      setPackageFormData={setPackageFormData}
      onSave={handleSave}
      onCancel={handleCancel}
      formError={formError}
      motorcycleServices={motorcycleServices}
    />
  );
};

export default EditMotorcyclePackagePage; 