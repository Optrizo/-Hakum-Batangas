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

  useEffect(() => {
    // Kiosk mode: hide navigation, block route changes
    if (window.location.pathname === '/customer') {
      // Hide nav/header/footer if present
      const nav = document.querySelector('nav');
      if (nav) nav.style.display = 'none';
      const header = document.querySelector('header');
      if (header) header.style.display = 'none';
      const footer = document.querySelector('footer');
      if (footer) footer.style.display = 'none';
      // Block back/forward navigation
      window.onpopstate = () => {
        window.location.pathname = '/customer';
      };
      // Block programmatic navigation
      window.addEventListener('hashchange', () => {
        window.location.pathname = '/customer';
      });
    }
    return () => {
      window.onpopstate = null;
      window.removeEventListener('hashchange', () => {});
    };
  }, []);

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
    { title: 'WAITING', vehicles: activeVehicles.filter(v => v.status === 'waiting'), color: '#3b82f6' },
    { title: 'IN PROGRESS', vehicles: activeVehicles.filter(v => v.status === 'in-progress'), color: '#2dd4bf' },
    { title: 'READY FOR PAYMENT', vehicles: activeVehicles.filter(v => v.status === 'payment-pending'), color: '#f59e0b' },
  ], [activeVehicles]);

  // Dynamically adjust card size and font size based on vehicle count to fit everything on screen.
  const getCardSizeClass = (count: number) => {
    if (count <= 1) return 'p-8 text-xl'; // Large and spacious for one item
    if (count <= 2) return 'p-6 text-lg';
    if (count <= 4) return 'p-4 text-base';
    if (count <= 6) return 'p-3 text-sm';
    return 'p-2 text-xs'; // Smaller for many items
  };

  const VehicleCard = ({ vehicle, sizeClass }: { vehicle: Car | Motor, sizeClass: string }) => {
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
            inline-block ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-200 text-blue-900'} 
            font-bold rounded-full shadow
            text-[0.8em] px-3 py-1 
            break-words max-w-full
          `}
        >
          {name}
        </span>
      ));
    };

    return (
      // Use flex-col and justify-start for a professional, non-stretching layout
      <div 
        className={`${bgCard} ${borderCard} rounded-xl flex flex-col justify-start gap-4 shadow-2xl transition-all duration-300 ${sizeClass} mb-4`} 
        style={{ boxShadow: isDark ? '0 4px 24px 0 #0006' : '0 4px 24px 0 #b6c6e6' }}
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
              <p className="text-[1.4em] font-extrabold tracking-wide mb-0.5">{vehicle.plate}</p>
              <p className={`text-[0.8em] ${textSecondary}`}>{vehicle.model} ({vehicle.size})</p>
            </div>
          </div>
          {/* Right part of top section: Crew */}
          {crewMembers.length > 0 && !hasPackage && (
            <div className="flex items-center gap-2 flex-wrap justify-end text-right ml-4">
              <p className={`text-[0.8em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Crew:</p>
              {crewMembers.map(name => (
                <span key={name} className={`
                  ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-blue-100 text-blue-900'}
                  text-[0.8em] font-bold px-2 py-0.5 rounded-full shadow-sm
                  ${!isDark ? 'border border-blue-200' : ''}
                `}>{name}</span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom section: Service Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4 w-full">
            {getServiceDisplay()}
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
              <div className="flex-grow grid gap-3 p-3 min-h-0" style={{ gridTemplateRows: `repeat(${column.vehicles.length || 1}, minmax(0, 1fr))` }}>
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