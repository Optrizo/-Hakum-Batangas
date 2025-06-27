import React, { useState, useEffect, useMemo } from 'react';
import { useQueue } from '../context/QueueContext';
import { Car, Motor } from '../types';
import { Car as CarIcon, Bike as BikeIcon } from 'lucide-react';
import HakumLogoBlue from '/Hakum V2 (Blue).png';

// Rebuilt based on user feedback to be non-scrollable and to correctly display service names.

const CustomerView: React.FC = () => {
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
  const bgColumn = isDark ? 'bg-[#181a20]' : 'bg-white';
  const bgCard = isDark ? 'bg-[#1e2129]' : 'bg-[#f8fafc]';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-300' : 'text-gray-600';
  const textHeader = isDark ? 'text-blue-400' : 'text-blue-700';
  const borderCard = isDark ? 'border border-[#23262f]' : 'border border-blue-100';

  // Correctly find service/package names, falling back to '...' instead of the raw ID.
  const getServiceName = (id: string) => services.find(s => s.id === id)?.name || '...';
  const getPackageName = (id: string) => packages.find(p => p.id === id)?.name || '...';

  const activeVehicles = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const combined = [...cars, ...motorcycles];
    return combined
      .filter(v => ['waiting', 'in-progress', 'payment-pending'].includes(v.status) && new Date(v.created_at) >= today)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [cars, motorcycles]);

  const columns = useMemo(() => [
    { title: 'WAITING', vehicles: activeVehicles.filter(v => v.status === 'waiting'), color: '#3b82f6' },
    { title: 'IN PROGRESS', vehicles: activeVehicles.filter(v => v.status === 'in-progress'), color: '#2dd4bf' },
    { title: 'READY FOR PAYMENT', vehicles: activeVehicles.filter(v => v.status === 'payment-pending'), color: '#f59e0b' },
  ], [activeVehicles]);

  // Helper to determine card/text size based on vehicle count
  const getCardSizeClass = (count: number) => {
    if (count <= 2) return 'text-2xl p-8 min-h-[200px]';
    if (count <= 4) return 'text-xl p-6 min-h-[160px]';
    if (count <= 6) return 'text-lg p-4 min-h-[120px]';
    return 'text-base p-3 min-h-[90px]';
  };

  const VehicleCard = ({ vehicle, sizeClass }: { vehicle: Car | Motor, sizeClass: string }) => {
    const isMotorcycle = 'vehicle_type' in vehicle && vehicle.vehicle_type === 'motorcycle';
    const crewMembers = vehicle.crew?.map(id => crews.find(c => c.id === id)?.name).filter(Boolean) || [];

    const hasPackage = (() => {
      if (isMotorcycle) {
        // Motorcycles have an explicit package field
        return !!(vehicle as Motor).package;
      }
      // For cars, check if the service name matches a package name
      const carService = (vehicle as Car).service;
      return packages.some(p => p.name === carService);
    })();

    const getServiceDisplay = () => {
      if (isMotorcycle) {
        const motor = vehicle as Motor;
        const serviceNames = motor.services.map(getServiceName).filter(name => name && name !== '...');
        const badges = serviceNames.map(name => (
          <span key={name} className={`inline-block ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-200 text-blue-900'} text-xs font-bold px-3 py-1 rounded-full mr-2 mb-2 whitespace-nowrap shadow`}>
            {name}
          </span>
        ));
        if (motor.package) {
          const pkgName = getPackageName(motor.package);
          if (pkgName && pkgName !== '...') {
            badges.push(
              <span key={pkgName} className={`inline-block ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-200 text-blue-900'} text-xs font-bold px-3 py-1 rounded-full mr-2 mb-2 whitespace-nowrap shadow`}>
                {pkgName}
              </span>
            );
          }
        }
        return <div className="flex flex-wrap mt-2">{badges}</div>;
      }
      // Car: show as single badge
      return (
        <span className={`inline-block ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-200 text-blue-900'} text-xs font-bold px-3 py-1 rounded-full mr-2 mb-2 whitespace-nowrap shadow`}>{(vehicle as Car).service}</span>
      );
    };

    return (
      <div className={`${bgCard} ${borderCard} rounded-xl flex flex-row items-stretch flex-grow basis-0 min-h-0 shadow-2xl transition-all duration-300 ${sizeClass} mb-4 pb-2`} style={{ boxShadow: isDark ? '0 4px 24px 0 #0006' : '0 4px 24px 0 #b6c6e6' }}>
        {/* Left column: icon, plate/model, crew */}
        <div className="flex flex-col justify-center min-w-[160px] pr-4">
          <div className="flex items-center gap-3 mb-1">
            {isMotorcycle ?
              <BikeIcon className={`h-6 w-6 ${textSecondary} flex-shrink-0`} /> :
              <CarIcon className={`h-6 w-6 ${textSecondary} flex-shrink-0`} />
            }
            <div>
              <p className="text-2xl font-extrabold tracking-wide mb-0.5">{vehicle.plate}</p>
              <p className={`text-sm ${textSecondary}`}>{vehicle.model} ({vehicle.size})</p>
            </div>
          </div>
          {/* Crew section (if present) */}
          {crewMembers.length > 0 && !hasPackage && (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Crew:</p>
              {crewMembers.map(name => (
                <span key={name} className={`
                  ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-blue-100 text-blue-900'}
                  text-xs font-bold px-2 py-0.5 rounded-full shadow-sm
                  ${!isDark ? 'border border-blue-200' : ''}
                `}>{name}</span>
              ))}
            </div>
          )}
        </div>
        {/* Right column: badges, vertically centered */}
        <div className="flex flex-col justify-center flex-grow">
          <div className="flex flex-wrap items-center gap-2">
            {getServiceDisplay()}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`${bgMain} h-screen w-screen flex items-center justify-center`}>
        <h1 className="text-4xl text-blue-400 font-bold">Loading Queue...</h1>
        <div style={{color: 'red'}}>DEBUG: Loading...</div>
      </div>
    );
  }

  return (
    <div className={`${bgMain} flex flex-col font-sans ${textMain} h-screen w-screen p-4 select-none overflow-hidden`}>
      {/* HEADER */}
      <header className="flex justify-between items-center mb-2 flex-shrink-0">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setTheme(isDark ? 'light' : 'dark')} title="Toggle light/dark mode">
          <img src={HakumLogoBlue} alt="Hakum Logo" className="h-8 transition-all duration-300 group-active:scale-95" />
          <h1 className="text-lg font-bold tracking-wider">HAKUM AUTO CARE</h1>
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
      {/* MAIN CONTENT */}
      <main className="flex-grow grid grid-cols-3 gap-4 min-h-0">
        {columns.map(column => {
          const sizeClass = getCardSizeClass(column.vehicles.length);
          return (
            <div key={column.title} className={`${bgColumn} rounded-lg flex flex-col min-h-0`}>
              <div className="p-3 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold tracking-widest">{column.title}</h2>
                  <span className="bg-gray-600 text-white w-7 h-7 flex items-center justify-center rounded-full font-bold text-base">
                    {column.vehicles.length}
                  </span>
                </div>
                <div className="mt-1 h-1 rounded-full" style={{ backgroundColor: column.color }}></div>
              </div>
              <div className="flex-grow grid auto-rows-fr gap-3 p-3 min-h-0" style={{ gridTemplateRows: `repeat(${column.vehicles.length}, minmax(0, 1fr))` }}>
                {column.vehicles.length > 0 ? (
                  column.vehicles.map(v => <VehicleCard key={v.id} vehicle={v} sizeClass={sizeClass} />)
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No vehicles here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default CustomerView;