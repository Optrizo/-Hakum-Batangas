import React, { useState, useEffect, useMemo } from 'react';
import { useQueue } from '../context/QueueContext';
import { Car, Motor } from '../types';
import { Clock, Wrench, Zap } from 'lucide-react';
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
    document.body.style.backgroundColor = '#030712';
    document.body.style.overflow = 'hidden'; // Prevent scrolling for kiosk mode

    return () => {
      clearInterval(timer);
      document.body.style.backgroundColor = '';
      document.body.style.overflow = '';
    };
  }, []);

  // Get counts for waiting and in-progress vehicles only
  const vehicleCounts = useMemo(() => {
    const allVehicles = [...cars, ...motorcycles];
    const activeVehicles = allVehicles.filter(v => 
      (v.status === 'waiting' || v.status === 'in-progress') && 
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
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse"></div>
          </div>
          <h1 className="text-3xl text-white font-bold tracking-wide">Loading Queue...</h1>
          <p className="text-blue-300 mt-2">Preparing your service status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white relative flex flex-col">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-16 w-1 h-1 bg-teal-400/40 rounded-full animate-ping"></div>
        <div className="absolute bottom-32 left-20 w-3 h-3 bg-blue-500/20 rounded-full animate-bounce"></div>
        <div className="absolute bottom-48 right-12 w-1.5 h-1.5 bg-teal-300/30 rounded-full animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-6 px-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img src={HakumLogoBlue} alt="Hakum Logo" className="h-16 w-auto drop-shadow-lg" />
              <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-xl"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-wider text-white drop-shadow-md">
              HAKUM AUTO CARE
            </h1>
            <div className="text-blue-300 font-bold text-lg tracking-wide">
              LIVE QUEUE
            </div>
          </div>
          
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-white">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pb-6 flex flex-col justify-center">
        {/* Status Cards - Only Waiting and In Progress */}
        <div className="space-y-6 mb-8">
          {/* Waiting Queue Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-3xl p-8 shadow-2xl border border-blue-500/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                      <Clock className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-300 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-wide">WAITING</h2>
                    <p className="text-blue-100 font-semibold">Next in Queue</p>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="text-8xl font-black text-white mb-2 drop-shadow-lg">
                    {vehicleCounts.waiting}
                  </div>
                  {vehicleCounts.waiting > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Zap className="h-3 w-3 text-yellow-900" />
                    </div>
                  )}
                </div>
                <div className="text-blue-100 text-xl font-bold tracking-wide">
                  {vehicleCounts.waiting === 1 ? 'Vehicle' : 'Vehicles'}
                </div>
              </div>
            </div>
          </div>

          {/* In Progress Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-emerald-400 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
            <div className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 rounded-3xl p-8 shadow-2xl border border-teal-500/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                      <Wrench className="h-10 w-10 text-white" />
                    </div>
                    {vehicleCounts.inProgress > 0 && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-bounce"></div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-wide">IN PROGRESS</h2>
                    <p className="text-teal-100 font-semibold">Being Serviced</p>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="text-8xl font-black text-white mb-2 drop-shadow-lg">
                    {vehicleCounts.inProgress}
                  </div>
                  {vehicleCounts.inProgress > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full animate-pulse"></div>
                  )}
                </div>
                <div className="text-teal-100 text-xl font-bold tracking-wide">
                  {vehicleCounts.inProgress === 1 ? 'Vehicle' : 'Vehicles'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-gray-600 to-gray-500 rounded-2xl blur opacity-20"></div>
          <div className="relative bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-600/30">
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-3">
                Total Active Queue
              </h3>
              <div className="text-5xl font-black text-white mb-2">
                {vehicleCounts.total}
              </div>
              <div className="text-gray-300 font-semibold">
                {vehicleCounts.total === 1 ? 'Vehicle' : 'Vehicles'} Currently Being Processed
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Customer Message */}
      <footer className="relative z-10 px-6 pb-8">
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 backdrop-blur-sm rounded-2xl p-4 border border-yellow-500/30">
          <p className="text-yellow-100 text-center font-semibold">
            <span className="text-yellow-300">●</span> Please wait for your turn • We'll notify you when ready <span className="text-yellow-300">●</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MobileView;