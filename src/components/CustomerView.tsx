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
  const [theme, setTheme] = useState(() => localStorage.getItem('customerTheme') || 'dark');

  console.log('CustomerView debug:', { loading, cars, motorcycles });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    document.body.style.backgroundColor = theme === 'dark' ? '#111113' : '#f4f6fa';
    localStorage.setItem('customerTheme', theme);
    return () => {
      clearInterval(timer);
      document.body.style.backgroundColor = '';
    };
  }, [theme]);

  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-[#111113]' : 'bg-[#f4f6fa]';
  const textSecondary = isDark ? 'text-gray-300' : 'text-gray-600';
  const textHeader = isDark ? 'text-blue-400' : 'text-blue-700';
  
  const cardTextColor = isDark ? '#fff' : '#181a20';
  const overlayOpacity = isDark ? 0.5 : 0.7;

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

  // Dynamically adjust card size and font size based on vehicle count to fit everything on screen.
  const getCardSizeClass = (count: number) => {
    if (count <= 1) return 'p-4 text-3xl'; // Maximum size for single item
    if (count <= 3) return 'p-3 text-2xl'; // Large for 2-3 items
    if (count <= 5) return 'p-2 text-xl';  // Medium for 4-5 items
    if (count <= 8) return 'p-2 text-lg';  // Smaller for 6-8 items
    return 'p-1.5 text-base';              // Minimum size for 9+ items
  };

  const VehicleCard = ({ vehicle, sizeClass, plateColor }: { vehicle: Car | Motor, sizeClass: string, plateColor: string }) => {
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

      return badgeNames.map((name, idx) => (
        <span 
          key={`${name}-${idx}`} 
          className={`
            inline-flex items-center
            ${isDark ? 'bg-blue-900/40 text-blue-200' : 'bg-blue-100/80 text-blue-900'}
            backdrop-blur-sm
            font-semibold tracking-wide
            rounded-full border
            ${isDark ? 'border-blue-800/50' : 'border-blue-200/80'}
            px-3 py-0.5
            text-[0.75em]
            transition-all duration-200
            shadow-sm
          `}
          style={{
            textShadow: isDark ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
          }}
        >
          {name}
        </span>
      ));
    };

    return (
      <div 
        className={`rounded-xl flex flex-col justify-start gap-4 transition-all duration-300 ${sizeClass} mb-4`} 
        style={{ background: 'transparent' }}
      >
        {/* Top section: Plate, Model, Crew */}
        <div className="flex flex-row items-start justify-between w-full">
          {/* Left part of top section: Icon, Plate, Model */}
          <div className="flex items-center gap-3">
            {isMotorcycle ?
              <BikeIcon className={`h-6 w-6 ${textSecondary} flex-shrink-0`} /> :
              <CarIcon className={`h-6 w-6 ${textSecondary} flex-shrink-0`} />
            }
            <div>
              <p className="text-[1.4em] font-extrabold tracking-wide mb-0.5" style={{ color: plateColor }}>{vehicle.plate}</p>
              <p className={`text-[0.8em] ${textSecondary}`}>{vehicle.model} ({vehicle.size})</p>
            </div>
          </div>
          {/* Right part of top section: Crew */}
          {crewMembers.length > 0 && !hasPackage && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end text-right ml-4">
              <p className={`text-[0.7em] uppercase tracking-wider font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Crew</p>
              {crewMembers.map(name => (
                <span key={name} className={`
                  inline-flex items-center
                  ${isDark ? 'bg-gray-800/60 text-gray-200' : 'bg-blue-50/90 text-blue-900'}
                  backdrop-blur-sm
                  text-[0.75em] font-medium tracking-wide
                  px-2 py-0.5 rounded-full
                  border ${isDark ? 'border-gray-700/50' : 'border-blue-100/80'}
                  shadow-sm
                  transition-all duration-200
                `}
                style={{
                  textShadow: isDark ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
                }}
                >{name}</span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom section: Service Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 w-full">
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

  const plateColor = isDark ? '#fff' : '#181a20';

  return (
    <div
      style={{
        minHeight: '100vh',
        height: '100vh',
        overflow: 'hidden',
        background: `linear-gradient(rgba(24,26,32,${overlayOpacity}), rgba(24,26,32,${overlayOpacity})), url('${bannerUrl}') center center / cover no-repeat`,
        color: cardTextColor,
        transition: 'background 0.3s',
      }}
      className={`${bgMain} flex flex-col min-h-screen`}
    >
      {/* HEADER */}
      <header className="flex justify-between items-center mb-2 flex-shrink-0">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setTheme(isDark ? 'light' : 'dark')} title="Toggle light/dark mode">
          <img src={HakumLogoBlue} alt="Hakum Logo" className="h-8 transition-all duration-300 group-active:scale-95" />
          <h1
            className="text-lg font-bold tracking-wider"
            style={{ color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
          >
            HAKUM AUTO CARE
          </h1>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${textHeader}`}>LIVE QUEUE</p>
          <p className={`${textSecondary} text-xs`}>
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {' | '}
            {currentTime.toLocaleTimeString()}
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
          const sizeClass = getCardSizeClass(column.vehicles.length);
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
                className={`flex-grow flex ${vehicleGroups.length > 1 ? 'flex-row gap-2' : 'flex-col'} p-2`}
                style={{
                  height: 'calc(100% - 60px)', // Account for header height
                  overflow: 'hidden',
                  justifyContent: 'flex-start',
                }}
              >
                {vehicleGroups.map((group, idx) => (
                  <div key={idx} className={`${vehicleGroups.length > 1 ? 'flex flex-col flex-1 gap-2' : 'flex flex-col gap-2'}`} style={{ height: '100%' }}>
                    {group.length > 0 ? (
                      group.map(v => (
                        <div
                          key={v.id}
                          className={`rounded-lg ${sizeClass}`}
                          style={{
                            background: 'transparent',
                            color: cardTextColor,
                            border: 'none',
                            textShadow: isDark ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            flex: '1 1 0',
                            minHeight: 0,
                          }}
                        >
                          <VehicleCard key={v.id} vehicle={v} sizeClass={sizeClass} plateColor={plateColor} />
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