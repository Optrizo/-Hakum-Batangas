import React, { useState, useEffect, useMemo } from 'react';
import { useQueue } from '../context/QueueContext';
import { Car, Motor } from '../types';
import { Car as CarIcon, Bike as BikeIcon, Clock, Wrench } from 'lucide-react';
import HakumLogoBlue from '/Hakum V2 (Blue).png';
import { useLocation, Navigate } from 'react-router-dom';

const MobileView: React.FC = () => {
  const location = useLocation();
  // Mobile kiosk mode: if not on /mobile, redirect to /mobile
  if (location.pathname !== '/mobile') {
    return <Navigate to="/mobile" replace />;
  }
  
  const { cars, motorcycles, loading } = useQueue();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Set mobile-optimized dark background
    document.body.style.backgroundColor = '#0a0a0a';

    return () => {
      clearInterval(timer);
      document.body.style.backgroundColor = '';
    };
  }, []);

  // Get counts for waiting and in-progress vehicles
  const vehicleCounts = useMemo(() => {
    const allVehicles = [...cars, ...motorcycles];
    const activeVehicles = allVehicles.filter(v => 
      v.status !== 'completed' && 
      v.status !== 'cancelled' && 
      !v.is_deleted
    );

    return {
      waiting: activeVehicles.filter(v => v.status === 'waiting').length,
      inProgress: activeVehicles.filter(v => v.status === 'in-progress').length,
      total: activeVehicles.length
    };
  }, [cars, motorcycles]);

  const bannerUrl = '/Hakum Auto Care Banner 03.png';

  if (loading) {
    return (
      <div className="bg-gray-900 h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <h1 className="text-2xl text-blue-400 font-bold">Loading Queue...</h1>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-900 text-white relative overflow-hidden"
      style={{
        background: `linear-gradient(rgba(10,10,10,0.8), rgba(10,10,10,0.8)), url('${bannerUrl}') center center / cover no-repeat`,
      }}
    >
      {/* Header */}
      <header className="p-4 sm:p-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <img src={HakumLogoBlue} alt="Hakum Logo" className="h-12 sm:h-16" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-white">
            HAKUM AUTO CARE BATANGAS
          </h1>
          <div className="text-blue-400 font-semibold text-lg sm:text-xl">
            LIVE QUEUE STATUS
          </div>
          <div className="text-gray-300 text-sm">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
            {' • '}
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 pb-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8">
          {/* Waiting Queue Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 sm:p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">WAITING</h2>
                  <p className="text-blue-100 text-sm sm:text-base">In Queue</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-6xl sm:text-8xl font-black text-white mb-2">
                {vehicleCounts.waiting}
              </div>
              <div className="text-blue-100 text-lg sm:text-xl font-semibold">
                {vehicleCounts.waiting === 1 ? 'Vehicle' : 'Vehicles'}
              </div>
            </div>
          </div>

          {/* In Progress Card */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-3xl p-6 sm:p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <Wrench className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">IN PROGRESS</h2>
                  <p className="text-teal-100 text-sm sm:text-base">Being Serviced</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-6xl sm:text-8xl font-black text-white mb-2">
                {vehicleCounts.inProgress}
              </div>
              <div className="text-teal-100 text-lg sm:text-xl font-semibold">
                {vehicleCounts.inProgress === 1 ? 'Vehicle' : 'Vehicles'}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-gray-800 bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 sm:p-8">
          <div className="text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Total Active Services
            </h3>
            <div className="flex justify-center items-center space-x-8">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <CarIcon className="h-6 w-6 text-blue-400" />
                  <BikeIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white">
                  {vehicleCounts.total}
                </div>
                <div className="text-gray-300 text-lg font-semibold">
                  {vehicleCounts.total === 1 ? 'Vehicle' : 'Vehicles'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <div className="bg-yellow-600 bg-opacity-20 border border-yellow-500 rounded-xl p-4">
            <p className="text-yellow-100 text-sm sm:text-base">
              <strong>Please wait for your turn.</strong> We'll call you when your vehicle is ready for pickup.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-gray-400 text-xs sm:text-sm">
          © 2024 Hakum Auto Care Batangas • Mobile Queue View
        </p>
      </footer>
    </div>
  );
};

export default MobileView;