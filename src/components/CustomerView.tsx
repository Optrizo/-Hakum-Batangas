import React, { useState, useEffect, useMemo } from 'react';
import { useQueue } from '../context/QueueContext';
import { Car, Motor } from '../types';
import { Car as CarIcon, Bike as BikeIcon } from 'lucide-react';
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
  const [containerHeight, setContainerHeight] = useState(window.innerHeight);

  console.log('CustomerView debug:', { loading, cars, motorcycles });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    document.body.style.backgroundColor = theme === 'dark' ? '#111113' : '#f4f6fa';
    localStorage.setItem('customerTheme', theme);

    const handleResize = () => {
      setContainerHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(timer);
      document.body.style.backgroundColor = '';
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-[#111113]' : 'bg-[#f4f6fa]';
  const bgCard = isDark ? 'bg-[#1e2129]' : 'bg-[#f8fafc]';
  const textSecondary = isDark ? 'text-gray-300' : 'text-gray-600';
  const textHeader = isDark ? 'text-blue-400' : 'text-blue-700';
  const borderCard = isDark ? 'border border-[#23262f]' : 'border border-blue-100';

  const cardBg = 'transparent';
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
    if (count <= 3) return 'py-3 text-xl';
    if (count <= 5) return 'py-2.5 text-lg';
    if (count <= 8) return 'py-2 text-base';
    return 'py-1.5 text-sm';
  };  const VehicleCard = ({ vehicle, sizeClass, plateColor }: { vehicle: Car | Motor, sizeClass: string, plateColor: string }) => {
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



      return (
        <div className="flex flex-wrap gap-1">
          {badgeNames.map((name, idx) => (
            <span 
              key={`${name}-${idx}`} 
              className={`
                inline-flex items-center
                ${isDark ? 'bg-gray-800/70 text-gray-100' : 'bg-gray-100 text-gray-900'} 
                font-medium 
                ${activeVehicles.length <= 5 ? 'text-sm px-3 py-1' : 'text-[11px] px-2 py-0.5'}
                rounded border ${isDark ? 'border-gray-700/50' : 'border-gray-200'}
                whitespace-nowrap
              `}
            >
              {name}
            </span>
          ))}
        </div>
      );
    };

    return (
      // Use flex-col and justify-start for a professional, non-stretching layout
      <div 
        className={`flex flex-col gap-1.5 ${sizeClass} mb-2`}
      >
        {/* Top section: Plate, Model, Crew */}
        <div className="flex flex-row items-start justify-between w-full">
          {/* Left part of top section: Icon, Plate, Model */}
          <div className="flex items-center gap-2">
            {isMotorcycle ?
              <BikeIcon className={`h-5 w-5 ${textSecondary} flex-shrink-0`} /> :
              <CarIcon className={`h-5 w-5 ${textSecondary} flex-shrink-0`} />
            }
            <div className="flex items-baseline gap-2">
              <p className={`font-bold tracking-wide ${activeVehicles.length <= 5 ? 'text-[1.3em]' : 'text-[1.1em]'}`}
                style={{ 
                  color: plateColor,
                  textShadow: isDark ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                {vehicle.plate}
              </p>
              <p className={`${activeVehicles.length <= 5 ? 'text-base' : 'text-[0.85em]'} ${textSecondary}`}>
                {vehicle.model} <span className="opacity-75">({vehicle.size})</span>
              </p>
            </div>
          </div>
          {/* Right part of top section: Crew */}
          {crewMembers.length > 0 && !hasPackage && (
            <div className="flex items-center gap-1.5 ml-auto">
              <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Crew:</p>
              {crewMembers.map(name => (
                <span 
                  key={name} 
                  className={`
                    ${isDark ? 'bg-gray-800/70 text-gray-100' : 'bg-gray-100 text-gray-900'}
                    ${activeVehicles.length <= 5 ? 'text-sm px-3 py-1' : 'text-[11px] px-2 py-0.5'} 
                    font-medium rounded
                    border ${isDark ? 'border-gray-700/50' : 'border-gray-200'}
                  `}
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom section: Service Badges */}
        <div className="w-full mt-2">
          <div className="flex flex-wrap items-start gap-1.5 max-w-full">
            {getServiceDisplay()}
          </div>
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
      <header className="flex justify-between items-center px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setTheme(isDark ? 'light' : 'dark')} title="Toggle light/dark mode">
          <img src="/Hakum V2 (Blue).png" alt="Hakum Logo" className="h-8 transition-all duration-300 group-active:scale-95" />
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
      <main className="flex-grow grid grid-cols-3 gap-6 px-6 pb-6 h-[calc(100vh-60px)] max-h-[calc(100vh-60px)] overflow-hidden"
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
                background: cardBg,
                border: 'none',
                boxShadow: isDark ? 'none' : '0 2px 16px rgba(24,26,32,0.12)',
                maxHeight: 'calc(100vh - 140px)',
                minHeight: 0,
                overflow: 'visible',
              }}
            >
              <div className="px-4 pt-2 pb-2 flex-shrink-0">
                <div className="flex justify-between items-center mb-2">
                  <h2
                    className={`font-bold tracking-widest ${column.vehicles.length <= 4 ? 'text-2xl' : 'text-xl'}`}
                    style={{ 
                      color: '#fff', 
                      textShadow: '0 2px 12px rgba(0,0,0,0.4)',
                      letterSpacing: '0.1em'
                    }}
                  >
                    {column.title}
                  </h2>
                  <span 
                    className={`text-white flex items-center justify-center rounded-full font-bold shadow-lg
                      ${column.vehicles.length <= 4 ? 'w-9 h-9 text-xl' : 'w-7 h-7 text-lg'}`}
                    style={{ 
                      backgroundColor: column.color,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                  >
                    {column.vehicles.length}
                  </span>
                </div>
                <div className="h-1 rounded-full" style={{ backgroundColor: column.color }}></div>
              </div>
              <div
                className={`flex-grow flex ${vehicleGroups.length > 1 ? 'flex-row gap-3' : 'flex-col'} p-3 min-h-0`}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                  justifyContent: column.vehicles.length === 0 ? 'center' : 'flex-start'
                }}
              >
                {vehicleGroups.map((group, idx) => (
                  <div key={idx} className={vehicleGroups.length > 1 ? 'flex flex-col flex-1 gap-3' : ''} style={{ minHeight: 0 }}>
                    {group.length > 0 ? (
                      group.map(v => (
                        <div
                          key={v.id}
                          className={`rounded-lg mb-3 ${sizeClass}`}
                          style={{
                            background: 'transparent',
                            color: cardTextColor,
                            border: 'none',
                            textShadow: isDark ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
                            minHeight: column.vehicles.length <= 4 ? '100px' : '80px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            flexGrow: column.vehicles.length <= 4 ? 1 : 0,
                            flexShrink: 0,
                            overflow: 'visible',
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