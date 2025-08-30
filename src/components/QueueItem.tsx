import React, { useState, useEffect, useMemo } from 'react';
import { useQueue } from '../context/QueueContext';
import { Car, Motor, ServiceStatus } from '../types';
import StatusBadge from './StatusBadge';
import LoadingSpinner from './LoadingSpinner';
import { Edit2, Check, X, DollarSign, CheckCircle, Wrench as Tool, Users, XCircle, ChevronDown } from 'lucide-react';
import EditCarForm from './EditCarForm';
import EditMotorcycleForm from './EditMotorcycleForm';
import CancellationModal from './CancellationModal';
// @ts-ignore
import { sendSMS } from '../../MyBusyBee/scripts/busybee-sms.js';

interface QueueItemProps {
  vehicle: Car | Motor;
  countCrewAsBusy?: boolean; // Add this prop
  queuePosition?: number; // Add queue position for waiting vehicles
}

const QueueItem: React.FC<QueueItemProps> = ({ vehicle, countCrewAsBusy = true, queuePosition }) => {
  const { updateCar, updateMotorcycle, removeCar, removeMotorcycle, crews, cars, motorcycles, packages, services, isTransactionInProgress } = useQueue();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [isAssigningCrew, setIsAssigningCrew] = useState(false);
  const [showCrewWarning, setShowCrewWarning] = useState(false);
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>(vehicle.crew || []);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 640);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isMotorcycle = 'vehicle_type' in vehicle && vehicle.vehicle_type === 'motorcycle';
  const isTransactionLoading = isTransactionInProgress(vehicle.id);

  const hasPackage = useMemo(() => {
    if (isMotorcycle) {
      return !!vehicle.package;
    }
    if (!vehicle.services || vehicle.services.length === 0) {
      return false;
    }
    const packageIds = new Set(packages.map(p => p.id));
    return vehicle.services.some(serviceId => packageIds.has(serviceId));
  }, [vehicle, packages, isMotorcycle]);

  const removeVehicle = isMotorcycle ? removeMotorcycle : removeCar;

  const busyCrewIds = useMemo(() => {
    const today = new Date();
    const isToday = (dateString: string) => {
      if (!dateString) return false;
      const date = new Date(dateString);
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    };

    const busyIds = new Set<string>();
    const allVehicles = [...cars, ...motorcycles];
    allVehicles.forEach(v => {
      // A crew member is busy if another vehicle is 'in-progress' AND was created today.
      if (v.status === 'in-progress' && v.id !== vehicle.id && isToday(v.created_at)) {
        v.crew?.forEach(crewId => busyIds.add(crewId));
      }
    });
    return busyIds;
  }, [cars, motorcycles, vehicle.id]);

  useEffect(() => {
    const checkSize = () => {
      setIsCollapsed(window.innerWidth < 640);
    };
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Helper to resolve service/package names for motorcycles
  const getServiceBadges = (vehicle: Car | Motor) => {
    if ('vehicle_type' in vehicle && vehicle.vehicle_type === 'motorcycle') {
      // For motorcycles, use services (IDs) and package (ID or name)
      const serviceBadges = (vehicle.services || [])
        .map(id => {
          const s = services.find(s => s.id === id);
          return s ? (
            <span key={id} className="inline-block bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30 rounded-full px-2 py-0.5 text-xs font-semibold mr-1 mb-1 dark:bg-brand-cyan/20 dark:text-brand-cyan">
              {s.name}
            </span>
          ) : null;
        });
      let packageBadge = null;
      if (vehicle.package) {
        const pkg = packages.find(p => p.id === vehicle.package || p.name === vehicle.package);
        if (pkg) packageBadge = (
          <span key={pkg.id} className="inline-block bg-brand-blue/10 text-brand-blue border border-brand-blue/30 rounded-full px-2 py-0.5 text-xs font-semibold mr-1 mb-1 dark:bg-brand-blue/20 dark:text-brand-blue">
            {pkg.name}
          </span>
        );
      }
      return <div className="flex flex-wrap gap-1">{serviceBadges}{packageBadge}</div>;
    } else {
      // For cars, use the service string
      return (
        <span className="inline-block bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30 rounded-full px-2 py-0.5 text-xs font-semibold mr-1 mb-1 dark:bg-brand-cyan/20 dark:text-brand-cyan">
          {(vehicle as Car).service || ''}
        </span>
      );
    }
  };

  const handleStartServiceClick = () => {
    // If the vehicle has a package, start the service immediately without a crew check.
    if (hasPackage) {
      handleQuickAction('in-progress');
      return;
    }

    // If no package, check for crew before starting.
    if ((!vehicle.crew || vehicle.crew.length === 0)) {
      setShowCrewWarning(true);
      setIsAssigningCrew(true);
    } else {
      handleQuickAction('in-progress');
    }
  };

  const handleQuickAction = async (newStatus: Car['status']) => {
    // Prevent status change if crew warning is active for another action
    if (showCrewWarning && newStatus === 'in-progress') {
      return;
    }
    try {
      setIsUpdating(true);

      // For completion, ensure we have a stable update by doing database update first
      if (newStatus === 'completed') {
        const updates = {
          status: newStatus,
          updated_at: new Date().toISOString(),
          // completed_at will be set automatically by database trigger
        };
        
        // Update database first before SMS or local state
        if (isMotorcycle) {
          await updateMotorcycle(vehicle.id, updates);
        } else {
          await updateCar(vehicle.id, updates);
        }
      }
      
      // Prepare the service type information
      let serviceType = '';
      if ('vehicle_type' in vehicle && vehicle.vehicle_type === 'motorcycle') {
        const serviceNames = (vehicle.services || []).map(id => {
          const s = services.find(s => s.id === id);
          return s ? s.name : '';
        }).filter(Boolean);
        let packageName = '';
        if (vehicle.package) {
          const pkg = packages.find(p => p.id === vehicle.package || p.name === vehicle.package);
          if (pkg) packageName = pkg.name;
        }
        serviceType = [...serviceNames, packageName].filter(Boolean).join(', ');
      } else {
        serviceType = (vehicle as Car).service || '';
      }

      // Calculate queue number for waiting status
      let queueNumber = undefined;
      if (newStatus === 'waiting') {
        const allVehicles = isMotorcycle ? motorcycles : cars;
        // Filter out deleted vehicles and count only those in waiting status
        const waitingCount = allVehicles.filter(v => v.status === 'waiting' && !v.is_deleted).length;
        queueNumber = waitingCount;
      }

      // Send SMS for every status update except for cancelled status
      if (newStatus !== 'cancelled') {
        await fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            plateNumber: vehicle.plate,
            serviceType,
            phoneNumber: vehicle.phone,
            queueNumber
          })
        });
      }

      // Update the vehicle status in the database (skip if already updated for completion)
      if (newStatus !== 'completed') {
        if (isMotorcycle) {
          const updates: Partial<Motor> = {
            status: newStatus as ServiceStatus,
            updated_at: new Date().toISOString(),
          };
          await updateMotorcycle(vehicle.id, updates);
        } else {
          const updates: Partial<Car> = {
            status: newStatus as ServiceStatus,
            updated_at: new Date().toISOString(),
          };
          await updateCar(vehicle.id, updates);
        }
      }
      setIsAssigningCrew(false);
    } catch (error) {
      console.error('Error updating status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to update status: ${errorMessage}. Please try again.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (isConfirmingDelete) {
      try {
        setIsDeleting(true);
        await removeVehicle(vehicle.id);
      } catch (error) {
        console.error('Error deleting vehicle:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Failed to delete vehicle: ${errorMessage}. Please try again.`);
        setIsConfirmingDelete(false);
      } finally {
        setIsDeleting(false);
      }
    } else {
      setIsConfirmingDelete(true);
    }
  };

  const cancelDelete = () => {
    setIsConfirmingDelete(false);
  };

  const handleCrewToggle = (crewId: string) => {
    setSelectedCrewIds(prev => 
      prev.includes(crewId)
        ? prev.filter(id => id !== crewId)
        : [...prev, crewId]
    );
  };

  const handleAssignCrew = async () => {
    try {
      setIsUpdating(true);
      let newStatus = vehicle.status;
      let statusChanged = false;

      // Prepare updates
      if (isMotorcycle) {
        const updates: Partial<Motor> = {
          crew: selectedCrewIds,
          updated_at: new Date().toISOString(),
        };
        if (vehicle.status === 'waiting' && selectedCrewIds.length > 0) {
          updates.status = 'in-progress';
          newStatus = 'in-progress';
          statusChanged = true;
        }
        await updateMotorcycle(vehicle.id, updates);
      } else {
        const updates: Partial<Car> = {
          crew: selectedCrewIds,
          updated_at: new Date().toISOString(),
        };
        if (vehicle.status === 'waiting' && selectedCrewIds.length > 0) {
          updates.status = 'in-progress';
          newStatus = 'in-progress';
          statusChanged = true;
        }
        await updateCar(vehicle.id, updates);
      }

      // Send SMS if status changed to in-progress
      if (statusChanged) {
        // Prepare service type information
        let serviceType = '';
        if ('vehicle_type' in vehicle && vehicle.vehicle_type === 'motorcycle') {
          const serviceNames = (vehicle.services || []).map(id => {
            const s = services.find(s => s.id === id);
            return s ? s.name : '';
          }).filter(Boolean);
          let packageName = '';
          if (vehicle.package) {
            const pkg = packages.find(p => p.id === vehicle.package || p.name === vehicle.package);
            if (pkg) packageName = pkg.name;
          }
          serviceType = [...serviceNames, packageName].filter(Boolean).join(', ');
        } else {
          serviceType = (vehicle as Car).service || '';
        }

        // Send SMS with all required fields
        await fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            plateNumber: vehicle.plate,
            serviceType,
            phoneNumber: vehicle.phone,
            queueNumber: undefined // Not applicable for in-progress status
          })
        });
      }

      setIsAssigningCrew(false);
      setShowCrewWarning(false);
    } catch (error) {
      console.error('Error assigning crew:', error);
      alert(`Failed to assign crew: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const cancelCrewAssignment = () => {
    setIsAssigningCrew(false);
    setShowCrewWarning(false);
    setSelectedCrewIds(vehicle.crew || []);
  };

  const handleCancellation = async (reason: string) => {
    try {
      setIsUpdating(true);
      
      // Update the vehicle status to cancelled with reason
      if (isMotorcycle) {
        const updates: Partial<Motor> = {
          status: 'cancelled' as ServiceStatus,
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        };
        await updateMotorcycle(vehicle.id, updates);
      } else {
        const updates: Partial<Car> = {
          status: 'cancelled' as ServiceStatus,
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        };
        await updateCar(vehicle.id, updates);
      }
      
      setShowCancellationModal(false);
      setIsAssigningCrew(false);
    } catch (error) {
      console.error('Error cancelling vehicle:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to cancel service: ${errorMessage}. Please try again.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    // Prevent toggling when clicking on a button or interactive element
    if (e.target instanceof HTMLElement && e.target.closest('button, a, input')) {
      return;
    }
    if (window.innerWidth < 640) {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Helper: get valid next statuses for this vehicle
  const getValidActions = () => {
    if (isMotorcycle) {
      switch (vehicle.status) {
        case 'waiting':
          return ['in-progress', 'cancelled'];
        case 'in-progress':
          return ['payment-pending', 'waiting', 'cancelled'];
        case 'payment-pending':
          return ['completed', 'waiting', 'cancelled'];
        default:
          return [];
      }
    } else {
      switch (vehicle.status) {
        case 'waiting':
          return ['in-progress', 'cancelled'];
        case 'in-progress':
          return ['payment-pending', 'waiting', 'cancelled'];
        case 'payment-pending':
          return ['completed', 'waiting', 'cancelled'];
        default:
          return [];
      }
    }
  };

  if (isEditing) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border-l-4 border-brand-blue overflow-hidden transition-all duration-300 border border-border-light dark:border-border-dark">
        <div className="p-4 sm:p-6">
          {isMotorcycle ? (
            <EditMotorcycleForm motorcycle={vehicle as Motor} onComplete={() => setIsEditing(false)} />
          ) : (
            <EditCarForm car={vehicle as Car} onComplete={() => setIsEditing(false)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm overflow-hidden transition-all duration-300 border border-border-light dark:border-border-dark
        ${
          vehicle.status === 'waiting' 
            ? 'border-l-4 border-brand-blue' 
            : vehicle.status === 'in-progress' 
              ? 'border-l-4 border-brand-cyan' 
              : vehicle.status === 'completed' 
                ? 'border-l-4 border-green-500' 
                : vehicle.status === 'payment-pending'
                  ? 'border-l-4 border-yellow-400'
                  : vehicle.status === 'cancelled'
                    ? 'border-l-4 border-red-500'
                    : 'border-l-4 border-brand-gray'
        }
      `}
    >
      <div className="p-3 sm:p-4" onClick={toggleCollapse}>
        <div className="flex items-start justify-between">
            <div className="flex-grow min-w-0">
            <div className="flex flex-col xs:flex-row xs:items-center gap-x-3 gap-y-1 mb-1">
              <div className="flex items-center gap-2">
                {/* Queue Number for Waiting Vehicles */}
                {vehicle.status === 'waiting' && queuePosition && (
                  <div className="flex-shrink-0 bg-green-600 text-white font-bold text-lg px-3 py-1.5 rounded-full border-2 border-green-500 shadow-md">
                    #{queuePosition}
                  </div>
                )}
                <div className="flex-shrink-0 bg-brand-blue text-white font-bold text-sm px-2.5 py-1 rounded-md">
                  {vehicle.plate}
                </div>
              </div>
              <span className="text-base font-medium text-text-primary-light dark:text-text-primary-dark truncate">{vehicle.model}</span>
              {isMotorcycle && (
                <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  MC
                </span>
              )}
            </div>
            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark capitalize">({vehicle.size})</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
                <div className="hidden sm:block">
                    <StatusBadge status={vehicle.status} />
                </div>
            <button className="sm:hidden p-1" aria-label="Toggle details">
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${!isCollapsed ? 'transform rotate-180' : ''}`} />
                </button>
            </div>
          </div>
        <div className="sm:hidden mt-2">
          <StatusBadge status={vehicle.status} />
        </div>

        {!isCollapsed && (
          <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4 text-sm">
              <div className="col-span-2 md:col-span-1">
                <h4 className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider mb-1">Service</h4>
                <div className="flex flex-wrap items-center gap-1">{getServiceBadges(vehicle)}</div>
          </div>
          <div>
                <h4 className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider mb-1">Phone</h4>
                <p className="text-text-primary-light dark:text-text-primary-dark">{vehicle.phone || 'N/A'}</p>
          </div>
          <div>
                <h4 className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider mb-1">Total Cost</h4>
                <p className="text-base font-bold text-green-500 dark:text-green-400">₱{(vehicle.total_cost || 0).toLocaleString()}</p>
          </div>
              <div className="lg:col-span-2">
                <h4 className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider mb-1">Added</h4>
                <p className="text-text-primary-light dark:text-text-primary-dark">
                  {new Date(vehicle.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          </div>
        </div>

            <div className="mb-3 sm:mb-4">
              <h4 className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider mb-1">Crew</h4>
          {vehicle.crew && vehicle.crew.length > 0 ? (
                <div className={`flex flex-wrap gap-1.5 ${!countCrewAsBusy ? 'opacity-50' : ''}`}>
                  {vehicle.crew.map((crewId) => {
                const crewMember = crews.find(c => c.id === crewId);
                return crewMember ? (
                      <span key={crewId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark">
                    {crewMember.name}
                  </span>
                ) : null;
              })}
            </div>
          ) : (
                <span className="text-text-secondary-light dark:text-text-secondary-dark text-sm">Not assigned</span>
          )}
        </div>
        
        {/* Cancellation Reason Display */}
        {vehicle.status === 'cancelled' && vehicle.cancellation_reason && (
          <div className="mb-3 sm:mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">Cancellation Reason</h4>
            <p className="text-sm text-red-700 dark:text-red-300">{vehicle.cancellation_reason}</p>
          </div>
        )}
        {isAssigningCrew && vehicle.status !== 'completed' && (
              <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-background-light dark:bg-black/50 rounded-lg border border-border-light dark:border-border-dark">
                <div className="flex flex-col space-y-3">
                  <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                Select Crew Members
              </label>
                  {showCrewWarning && (
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Action Required:</strong> Please assign at least one crew member before starting the service.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto pr-2">
                {crews.map(member => {
                  const isBusy = busyCrewIds.has(member.id);
                  return (
                    <label 
                      key={member.id} 
                      className={`flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
                        isBusy ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCrewIds.includes(member.id)}
                          onChange={() => handleCrewToggle(member.id)}
                          disabled={isBusy}
                          className="form-checkbox h-4 w-4 text-brand-blue bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark rounded focus:ring-brand-blue"
                        />
                        <span className="ml-2 text-sm text-text-primary-light dark:text-text-primary-dark truncate">{member.name}</span>
                      </div>
                      {isBusy && (
                        <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50 px-2 py-1 rounded-full">Busy</span>
                      )}
                    </label>
                  );
                })}
              </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2 mt-3">
                <button
                      onClick={cancelCrewAssignment}
                      className="inline-flex items-center justify-center px-3 py-1.5 border border-border-light dark:border-border-dark shadow-sm text-xs font-medium rounded-md text-text-primary-light dark:text-text-primary-dark bg-surface-light dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-light dark:focus:ring-offset-surface-dark focus:ring-brand-blue transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignCrew}
                      className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-brand-blue hover:bg-brand-dark-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-light dark:focus:ring-offset-surface-dark focus:ring-brand-blue transition-colors"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4">
              <div className="flex items-center gap-2">
                {getValidActions().includes('in-progress') && vehicle.status === 'waiting' && (
                  <button
                    onClick={handleStartServiceClick}
                    disabled={isUpdating || isTransactionLoading}
                    className="inline-flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-semibold bg-brand-blue text-white hover:bg-brand-dark-blue transition-all duration-200 disabled:opacity-50 transform hover:scale-105 active:scale-95"
                  >
                    {isUpdating || isTransactionLoading ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Tool className="h-4 w-4 mr-2" />
                    )}
                    {isUpdating || isTransactionLoading ? 'Starting...' : 'Start Service'}
                  </button>
                )}
                {getValidActions().includes('payment-pending') && vehicle.status === 'in-progress' && (
                  <button
                    onClick={() => handleQuickAction('payment-pending')}
                    disabled={isUpdating}
                    className="inline-flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 text-white hover:bg-yellow-600 transition-all duration-200 disabled:opacity-50 transform hover:scale-105 active:scale-95"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Ready for Payment
                  </button>
                )}
                {getValidActions().includes('completed') && vehicle.status === 'payment-pending' && (
                  <button
                    onClick={() => handleQuickAction('completed')}
                    disabled={isUpdating || isTransactionLoading}
                    className="inline-flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-all duration-200 disabled:opacity-50 transform hover:scale-105 active:scale-95"
                  >
                    {isUpdating || isTransactionLoading ? (
                      <LoadingSpinner size="sm" variant="completion" className="mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {isUpdating || isTransactionLoading ? 'Completing...' : 'Mark as Completed'}
                  </button>
                )}
                {getValidActions().includes('waiting') && (vehicle.status === 'in-progress' || vehicle.status === 'payment-pending') && (
                  <button
                    onClick={() => handleQuickAction('waiting')}
                    disabled={isUpdating}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Send to Waiting
                  </button>
                )}
                {getValidActions().includes('cancelled') && vehicle.status !== 'completed' && vehicle.status !== 'cancelled' && (
                  <button
                    onClick={() => setShowCancellationModal(true)}
                    disabled={isUpdating}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30 dark:text-red-400 dark:hover:bg-red-500/40 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Cancel
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                {vehicle.status !== 'completed' && (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Edit Vehicle"
                    aria-label="Edit Vehicle"
                  >
                    <Edit2 className="h-4 w-4 text-gray-500" />
                  </button>
                )}
            <button
                  onClick={() => setIsAssigningCrew(!isAssigningCrew)}
                  className={`inline-flex items-center p-1.5 sm:p-2 border shadow-sm text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-colors ${
                    isAssigningCrew 
                      ? 'bg-brand-blue text-white border-transparent' 
                      : 'bg-surface-light dark:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark border-border-light dark:border-border-dark hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              disabled={isUpdating}
                  title="Assign Crew"
            >
                  <Users className="h-4 w-4" />
                  <span className="sr-only">Assign Crew</span>
            </button>

          </div>
        </div>
          </div>
        )}
      </div>
      
      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        onConfirm={handleCancellation}
        vehicle={vehicle}
        isLoading={isUpdating}
      />
    </div>
  );
};

export default QueueItem;