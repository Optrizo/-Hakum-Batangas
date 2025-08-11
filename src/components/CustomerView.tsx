import React, { useState, useEffect, useMemo } from 'react';
import { useQueue } from '../context/QueueContext';
import { Car, Motor } from '../types';
import { Car as CarIcon, Bike as BikeIcon } from 'lucide-react';
import HakumLogoBlue from '/Hakum V2 (Blue).png';
import { useLocation, Navigate } from 'react-router-dom';

// Rebuilt based on user feedback to be non-scrollable and to correctly display service names.

const CustomerView: React.FC = () => {
  const location = useLocation();
  // Kiosk mode: if not on /customer, redirect to /customer
  if (location.pathname !== '/customer') {
    return <Navigate to="/customer" replace />;
  }
  const { cars, motorcycles, services, packages, crews, loading } = useQueue();
  const [currentTime, setCurrentTime] = useState(new Date());

  console.log('CustomerView debug:', { loading, cars, motorcycles });

  useEffect(() => {
    // Update every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    document.body.style.backgroundColor = '#111113';

    return () => {
      clearInterval(timer);
      document.body.style.backgroundColor = '';
    };
  }, []);

  const bgMain = 'bg-[#111113]';
  const textSecondary = 'text-gray-300';
  const textHeader = 'text-blue-400';

  const cardTextColor = '#fff';
  const overlayOpacity = 0.5;

  // Correctly find service/package names, falling back to '...' instead of the raw ID.
  const getServiceName = (id: string) => services.find(s => s.id === id)?.name || '...';
  const getPackageName = (id: string) => packages.find(p => p.id === id)?.name || '...';

  const activeVehicles = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const combined = [...cars, ...motorcycles];
    return combined
      .filter(v => {
        const isMotorcycle = 'vehicle_type' in v && v.vehicle_type === 'motorcycle';
        const hasPackage = isMotorcycle
          ? !!v.package
          : packages.some(p => p.name === (v as Car).service);
        const isActiveStatus = ['waiting', 'in-progress', 'payment-pending'].includes(v.status);
        if (!isActiveStatus) return false;
        if (hasPackage) {
          // Show package vehicles until completed/cancelled
          return v.status !== 'completed' && v.status !== 'cancelled';
        } else {
          // Non-package vehicles: only show if created today
          return new Date(v.created_at) >= today;
        }
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [cars, motorcycles, packages]);

  const columns = useMemo(() => [
    { title: 'WAITING IN QUEUE', vehicles: activeVehicles.filter(v => v.status === 'waiting'), color: '#3b82f6' },
    { title: 'IN PROGRESS', vehicles: activeVehicles.filter(v => v.status === 'in-progress'), color: '#2dd4bf' },
    { title: 'READY FOR PAYMENT', vehicles: activeVehicles.filter(v => v.status === 'payment-pending'), color: '#f59e0b' },
  ], [activeVehicles]);

  // Dynamically adjust sizes based on vehicle count
  const getSizeClasses = (count: number) => {
    // Base on how many items we have to determine the optimal size
    if (count <= 2) return {
      plate: 'text-[2em]',
      model: 'text-[1.1em]',
      service: 'text-[1.2em]',
      spacing: 'py-6 px-6 mb-6 gap-5'
    };
    if (count <= 4) return {
      plate: 'text-[1.8em]',
      model: 'text-[1em]',
      service: 'text-[1.1em]',
      spacing: 'py-5 px-5 mb-5 gap-4'
    };
    if (count <= 6) return {
      plate: 'text-[1.6em]',
      model: 'text-[0.9em]',
      service: 'text-[1em]',
      spacing: 'py-4 px-4 mb-4 gap-3'
    };
    return {
      plate: 'text-[1.4em]',
      model: 'text-[0.85em]',
      service: 'text-[0.9em]',
      spacing: 'py-3 px-3 mb-3 gap-2'
    };
  };

  const VehicleCard = ({ vehicle, plateColor, columnVehicleCount }: { vehicle: Car | Motor, plateColor: string, columnVehicleCount: number }) => {
    const isMotorcycle = 'vehicle_type' in vehicle && vehicle.vehicle_type === 'motorcycle';
    const crewMembers = vehicle.crew?.map(id => crews.find(c => c.id === id)?.name).filter(Boolean) || [];

    const hasPackage = (() => {
      if (isMotorcycle) {
        return !!(vehicle as Motor).package;
      }
      const carService = (vehicle as Car).service;
      return packages.some(p => p.name === carService);
    })();

    // Refactored to return an array of badge elements for both cars and motorcycles
    const getServiceDisplay = () => {
      let badgeNames: string[] = [];

      if (isMotorcycle) {
        const motor = vehicle as Motor;
        const serviceNames = motor.services.map(getServiceName).filter(name => name && name !== '...');
        badgeNames.push(...serviceNames);
        if (motor.package) {
          const pkgName = getPackageName(motor.package);
          if (pkgName && pkgName !== '...') {
            badgeNames.push(pkgName);
          }
        }
      } else { // Car
        const car = vehicle as Car;
        if (car.service) {
          // Split by comma for multiple services
          const services = car.service.split(',').map(s => s.trim()).filter(Boolean);
          badgeNames.push(...services);
        }
      }

      if (badgeNames.length === 0) return null;

      const sizes = getSizeClasses(columnVehicleCount);
      return badgeNames.map((name, idx) => (
        <span 
          key={`${name}-${idx}`} 
          className={`
            inline-flex items-center
            ${textSecondary}
            font-bold tracking-wider
            ${sizes.service}
            transition-all duration-200
          `}
          style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {name}
        </span>
      ));
    };

    const sizes = getSizeClasses(columnVehicleCount);
    
    return (
      <div className={`${sizes.spacing} transition-all duration-300`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 text-blue-400">
              {isMotorcycle ? <BikeIcon className="h-6 w-6" /> : <CarIcon className="h-6 w-6" />}
            </div>
            <div>
              <p className={`${sizes.plate} font-black tracking-wider leading-none mb-1`}
                style={{ 
                  color: plateColor,
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                {vehicle.plate}
              </p>
              <p className={`${sizes.model} ${textSecondary} font-bold tracking-wide`}>
                {vehicle.model} • {vehicle.size}
              </p>
            </div>
          </div>
          
          {/* Right: Crew Names */}
          {crewMembers.length > 0 && (
            <div className="flex items-center gap-2">
              {crewMembers.map(name => (
                <span key={name} 
                  className={`
                    ${sizes.model} font-bold tracking-wider
                    ${textHeader}
                  `}
                  style={{
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Services/Packages */}
        <div className={`flex flex-wrap pl-9 ${sizes.spacing}`}>
          {getServiceDisplay()}
        </div>
      </div>
    );
  };

  const bannerUrl = '/Hakum Auto Care Banner 03.png';

  if (loading) {
    return (
      <div className={`${bgMain} h-screen w-screen flex items-center justify-center`}>
        <h1 className="text-4xl text-blue-400 font-bold">Loading Queue...</h1>
        <div style={{color: 'red'}}>DEBUG: Loading...</div>
      </div>
    );
  }

  const plateColor = '#fff';  // Always use white for plate color in dark mode

  return (
    <div
      style={{
        minHeight: '100vh',
        height: '100vh',
        overflow: 'hidden',
        background: `linear-gradient(rgba(24,26,32,${overlayOpacity}), rgba(24,26,32,${overlayOpacity})), url('${bannerUrl}') center center / cover no-repeat`,
        color: cardTextColor,
      }}
      className={`${bgMain} flex flex-col min-h-screen`}
    >
      {/* HEADER */}
      <header className="flex justify-between items-center mb-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src={HakumLogoBlue} alt="Hakum Logo" className="h-8" />
          <h1
            className="text-lg font-bold tracking-wider"
            style={{ color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
          >
            HAKUM AUTO CARE BACOOR
          </h1>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${textHeader}`}>LIVE QUEUE</p>
          <p className={`${textSecondary} text-xs`}>
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
            {' | '}
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })}
          </p>
        </div>
      </header>
      <main
        className="flex-grow grid grid-cols-3 gap-4"
        style={{
          height: 'calc(100vh - 80px)', // Account for header height
          overflow: 'hidden',
          padding: '0.5rem',
        }}
      >
        {columns.map(column => {
          // Split vehicles into two columns if more than 5
          let vehicleGroups: Array<Array<Car | Motor>> = [];
          if (column.vehicles.length > 5) {
            const mid = Math.ceil(column.vehicles.length / 2);
            vehicleGroups = [column.vehicles.slice(0, mid), column.vehicles.slice(mid)];
          } else {
            vehicleGroups = [column.vehicles];
          }
          return (
            <div
              key={column.title}
              className="rounded-lg flex flex-col min-h-0 flex-1"
              style={{
                background: 'transparent',
                border: 'none',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div className="p-3 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h2
                    className="text-lg font-bold tracking-widest"
                    style={{ color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
                  >
                    {column.title}
                  </h2>
                  <span className="bg-gray-600 text-white w-7 h-7 flex items-center justify-center rounded-full font-bold text-base">
                    {column.vehicles.length}
                  </span>
                </div>
                <div className="mt-1 h-1 rounded-full" style={{ backgroundColor: column.color }}></div>
              </div>
              <div
                className={`flex-grow flex ${vehicleGroups.length > 1 ? 'flex-row gap-4' : 'flex-col'} p-3`}
                style={{
                  height: 'calc(100% - 60px)', // Account for header height
                  overflow: 'hidden',
                  justifyContent: 'flex-start',
                }}
              >
                {vehicleGroups.map((group, idx) => (
                  <div key={idx} className={`${vehicleGroups.length > 1 ? 'flex flex-col flex-1 gap-4' : 'flex flex-col gap-4'}`} style={{ height: '100%' }}>
                    {group.length > 0 ? (
                      group.map(v => (
                        <div
                          key={v.id}
                          className="rounded-lg"
                          style={{
                            background: 'transparent',
                            color: cardTextColor,
                            border: 'none',
                            textShadow: '0 2px 8px rgba(0,0,0,0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            flex: '1 1 0',
                            minHeight: 0,
                          }}
                        >
                          <VehicleCard 
                            key={v.id} 
                            vehicle={v} 
                            plateColor={plateColor} 
                            columnVehicleCount={column.vehicles.length}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No vehicles here</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default CustomerView;