import React, { useState, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { CrewMember } from '../types';
import { UserPlus, Edit2, Trash2, Phone, User } from 'lucide-react';

const CrewManager: React.FC = () => {
  const { crews, addCrew, updateCrew, removeCrew } = useQueue();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);
  const formStateRef = useRef<{ name: string; phone: string }>({ name: '', phone: '' });
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFormDataPersist = (data: { name: string; phone: string }) => {
    formStateRef.current = data;
    setFormData(data);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow letters and spaces
    const value = e.target.value.replace(/[^A-Za-z\s]/g, '');
    setFormDataPersist({ ...formData, name: value });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 11
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    setFormDataPersist({ ...formData, phone: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[A-Za-z\s]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name must only contain letters and spaces';
    }
    if (formData.phone) {
      if (!/^\d{11}$/.test(formData.phone)) {
        newErrors.phone = 'Phone number must be exactly 11 digits';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      if (editingCrew) {
        await updateCrew(editingCrew.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
        });
        setEditingCrew(null);
      } else {
        await addCrew({
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          is_active: true,
        });
        setShowAddForm(false);
      }
      setFormDataPersist({ name: '', phone: '' });
      setErrors({});
    } catch (error) {
      console.error('Error saving crew member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save crew member: ${errorMessage}. Please try again.`);
    }
  };

  const handleEdit = (crew: CrewMember) => {
    setEditingCrew(crew);
    setFormDataPersist({
      name: crew.name,
      phone: crew.phone || '',
    });
    setShowAddForm(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this crew member? This action cannot be undone.')) {
    try {
      await removeCrew(id);
    } catch (error) {
      console.error('Error removing crew member:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Failed to delete crew member: ${errorMessage}. Please try again.`);
      }
    }
  };

  const CrewForm = React.useMemo(() => (
    <div className="bg-surface-light dark:bg-surface-dark p-4 sm:p-6 rounded-lg shadow-sm border border-border-light dark:border-border-dark mb-6">
      <div className="mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">
        {editingCrew ? 'Edit Crew Member' : 'Add New Crew Member'}
      </h3>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
          {editingCrew ? 'Update crew member information' : 'Add a new crew member to your team'}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={handleNameChange}
              className={`block w-full rounded-lg bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2.5 sm:p-2 transition-all duration-200 ${
                errors.name ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' : 'border-border-light dark:border-border-dark'
              }`}
              placeholder="Enter crew member name"
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500 flex items-start">
                <svg className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.name}
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
              Phone <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              maxLength={11}
              className={`block w-full rounded-lg bg-background-light dark:bg-background-dark border shadow-sm focus:ring-brand-blue focus:border-brand-blue sm:text-sm p-2.5 sm:p-2 transition-all duration-200 ${
                errors.phone ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' : 'border-border-light dark:border-border-dark'
              }`}
              placeholder="e.g., 09123456789"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500 flex items-start">
                <svg className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.phone}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setShowAddForm(false);
              setEditingCrew(null);
              setFormDataPersist({ name: '', phone: '' });
              setErrors({});
            }}
            className="inline-flex items-center justify-center px-4 py-2 border border-border-light dark:border-border-dark shadow-sm text-sm font-medium rounded-lg text-text-secondary-light dark:text-text-secondary-dark bg-surface-light dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-brand-blue hover:bg-brand-dark-blue transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            {editingCrew ? 'Update Member' : 'Add Member'}
          </button>
        </div>
      </form>
    </div>
  ), [formData, errors, editingCrew]);

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 xl:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark truncate">Crew Management</h1>
            <p className="text-xs sm:text-sm lg:text-base text-text-secondary-light dark:text-text-secondary-dark mt-1">
              Add, edit, or remove crew members from your team
            </p>
        </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
            <span className="text-xs sm:text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
              {crews.length} Active Members
            </span>
          {!showAddForm && !editingCrew && (
            <button
              onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-brand-blue hover:bg-brand-dark-blue transition-all duration-200 transform hover:scale-105 active:scale-95 whitespace-nowrap"
            >
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Add Member</span>
                <span className="xs:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

        {/* Form */}
        {(showAddForm || editingCrew) && CrewForm}

        {/* Crew List */}
        <div className="bg-surface-light dark:bg-surface-dark shadow overflow-hidden rounded-lg border border-border-light dark:border-border-dark">
          {crews.length === 0 ? (
            <div className="p-4 sm:p-6 lg:p-8 text-center">
              <User className="h-8 w-8 sm:h-12 sm:w-12 text-text-secondary-light dark:text-text-secondary-dark mx-auto mb-3 sm:mb-4 opacity-50" />
              <h3 className="text-sm sm:text-base font-medium text-text-primary-light dark:text-text-primary-dark mb-1">No crew members yet</h3>
              <p className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
                Get started by adding your first crew member to the team.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-brand-blue hover:bg-brand-dark-blue transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Add First Member
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {crews.map((crew) => (
                <div key={crew.id} className="p-3 sm:p-4 lg:p-6 hover:bg-background-light dark:hover:bg-background-dark transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-brand-blue text-white rounded-full flex items-center justify-center">
                            <span className="text-sm sm:text-base font-medium">
                              {crew.name.charAt(0).toUpperCase()}
                            </span>
                    </div>
                  </div>
                      <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base lg:text-lg font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                            {crew.name}
                        </h3>
                          {crew.phone && (
                            <div className="flex items-center gap-1 mt-1">
                              <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-text-secondary-light dark:text-text-secondary-dark flex-shrink-0" />
                              <span className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark truncate">
                                {crew.phone}
                              </span>
                        </div>
                      )}
                    </div>
                  </div>
                    </div>
                    <div className="flex items-center gap-2">
                  <button
                        onClick={() => handleEdit(crew)}
                        className="inline-flex items-center p-1.5 sm:p-2 border border-border-light dark:border-border-dark shadow-sm text-xs font-medium rounded-md text-text-secondary-light dark:text-text-secondary-dark bg-surface-light dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-light dark:focus:ring-offset-surface-dark focus:ring-brand-blue transition-colors"
                        title="Edit crew member"
                  >
                    <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                  </button>
                  <button
                        onClick={() => handleDelete(crew.id)}
                        className="inline-flex items-center p-1.5 sm:p-2 border border-border-light dark:border-border-dark shadow-sm text-xs font-medium rounded-md text-red-600 dark:text-red-400 bg-surface-light dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-light dark:focus:ring-offset-surface-dark focus:ring-red-500 transition-colors"
                        title="Delete crew member"
                  >
                    <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                  </button>
                </div>
              </div>
                </div>
          ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrewManager;