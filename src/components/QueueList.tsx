import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import QueueItem from './QueueItem';
import { Search, Filter, Calendar, AlertCircle, ChevronLeft, ChevronRight, X, Car, Bike } from 'lucide-react';
import { ServiceStatus, Car as CarType, Motor } from '../types';

interface QueueListProps {
  vehicles: (CarType | Motor)[];
  vehicleType: 'car' | 'motorcycle';
}

const QueueList: React.FC<QueueListProps> = ({ vehicles, vehicleType }) => {
  const { loading, error } = useQueue();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'all'>('waiting');
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedDate, setSelectedDate] = useState<string | { start: string; end: string }>('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter(vehicle => {
        // Apply date filter
        const vehicleDate = new Date(vehicle.status === 'completed' && vehicle.completed_at ? vehicle.completed_at : vehicle.created_at);
        const today = new Date();
        // Set time to noon for consistent comparison
        const vehicleDateNoon = new Date(vehicleDate.getFullYear(), vehicleDate.getMonth(), vehicleDate.getDate(), 12, 0, 0, 0);
        const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
        
        let matchesDate = false;
        if (dateFilter === 'today') {
          matchesDate = vehicleDateNoon.toDateString() === todayNoon.toDateString();
        } else if (dateFilter === 'all') {
          matchesDate = true;
        } else if (dateFilter === 'custom' && selectedDate) {
          if (typeof selectedDate === 'object') {
            const startDate = new Date(selectedDate.start);
            const endDate = new Date(selectedDate.end);
            matchesDate = vehicleDateNoon >= startDate && vehicleDateNoon <= endDate;
          } else {
            const selectedDateObj = new Date(selectedDate);
            matchesDate = vehicleDateNoon.toDateString() === selectedDateObj.toDateString();
          }
        }

        if (!matchesDate) return false;

        // Apply search filter
        const matchesSearch = 
          vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
          vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ('service' in vehicle ? vehicle.service.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
          vehicle.phone?.toLowerCase().includes(searchTerm.toLowerCase());

        // Apply status filter
        const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        // Sort waiting vehicles by creation time (oldest first)
        if (a.status === 'waiting' && b.status === 'waiting') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        // Sort completed vehicles by completion time (newest first)
        if (a.status === 'completed' && b.status === 'completed') {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        return 0;
      });
  }, [vehicles, searchTerm, statusFilter, dateFilter, selectedDate]);

  // Get vehicles for the selected date (for statistics)
  const dateFilteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const vehicleDate = new Date(vehicle.status === 'completed' && vehicle.completed_at ? vehicle.completed_at : vehicle.created_at);
      const today = new Date();
      // Set time to noon for consistent comparison
      const vehicleDateNoon = new Date(vehicleDate.getFullYear(), vehicleDate.getMonth(), vehicleDate.getDate(), 12, 0, 0, 0);
      const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
      
      let matchesDate = false;
      if (dateFilter === 'today') {
        matchesDate = vehicleDateNoon.toDateString() === todayNoon.toDateString();
      } else if (dateFilter === 'all') {
        matchesDate = true;
      } else if (dateFilter === 'custom' && selectedDate) {
        if (typeof selectedDate === 'object') {
          const startDate = new Date(selectedDate.start);
          const endDate = new Date(selectedDate.end);
          matchesDate = vehicleDateNoon >= startDate && vehicleDateNoon <= endDate;
        } else {
          const selectedDateObj = new Date(selectedDate);
          matchesDate = vehicleDateNoon.toDateString() === selectedDateObj.toDateString();
        }
      }
      
      return matchesDate;
    });
  }, [vehicles, dateFilter, selectedDate]);

  const waitingCount = dateFilteredVehicles.filter(vehicle => vehicle.status === 'waiting').length;
  const inProgressCount = dateFilteredVehicles.filter(vehicle => vehicle.status === 'in-progress').length;
  const paymentPendingCount = dateFilteredVehicles.filter(vehicle => vehicle.status === 'payment-pending').length;
  const cancelledCount = dateFilteredVehicles.filter(vehicle => vehicle.status === 'cancelled').length;
  const completedCount = dateFilteredVehicles.filter(vehicle => vehicle.status === 'completed').length;

  // Calculate daily total cost for completed vehicles
  const completedDailyTotal = useMemo(() => {
    return dateFilteredVehicles
      .filter(vehicle => vehicle.status === 'completed')
      .reduce((total, vehicle) => total + (vehicle.total_cost || 0), 0);
  }, [dateFilteredVehicles]);

  // Get vehicle history regardless of date filter
  const getVehicleHistory = (searchPlate: string) => {
    if (!searchPlate) return [];
    return vehicles
      .filter(vehicle => vehicle.plate.toLowerCase().includes(searchPlate.toLowerCase()))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const vehicleHistory = useMemo(() => {
    return getVehicleHistory(historySearch);
  }, [vehicles, historySearch]);

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date: string | { start: string; end: string }) => {
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      return parsedDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      const start = new Date(date.start).toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      const end = new Date(date.end).toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      return `${start} - ${end}`;
    }
  };

  const handleDateSelect = (day: number) => {
    // Set the time to noon (12:00) to avoid timezone issues
    const selectedDateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0, 0);
    const formattedDate = formatDate(selectedDateObj);
    setSelectedDate(formattedDate);
    setDateFilter('custom');
    setShowCalendar(false);
  };

  const isToday = (day: number) => {
    const today = new Date();
    // Create dates with same time components for comparison
    const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0, 0);
    return todayNoon.toDateString() === checkDate.toDateString();
  };

  const isSelectedDate = (day: number) => {
    if (!selectedDate) return false;
    const selectedDateObj = typeof selectedDate === 'string' ? new Date(selectedDate) : new Date(selectedDate.start);
    // Create dates with same time components for comparison
    const selectedNoon = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate(), 12, 0, 0, 0);
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0, 0);
    return selectedNoon.toDateString() === checkDate.toDateString();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isTodayDate = isToday(day);
      const isSelected = isSelectedDate(day);
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day)}
          className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${
            isSelected 
              ? 'bg-blue-600 text-white' 
              : isTodayDate 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const quickDateOptions = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'this-week' },
    { label: 'Last Week', value: 'last-week' },
    { label: 'All Time', value: 'all' },
  ];

  const handleQuickDateSelect = (value: string) => {
    setDateFilter(value);
    setSelectedDate('');
    setShowCalendar(false);
    
    if (value === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setSelectedDate(formatDate(yesterday));
      setDateFilter('custom');
    } else if (value === 'this-week') {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Set to Saturday
      endOfWeek.setHours(23, 59, 59, 999); // Set time to 11:59:59.999 PM

      // Store the range as an object or separate values
      setSelectedDate({ start: formatDate(startOfWeek), end: formatDate(endOfWeek) });
      setDateFilter('custom');
    } else if (value === 'last-week') {
      const today = new Date();
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7); // Start of last week (Sunday)
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6); // End of last week (Saturday)

      setSelectedDate({ start: formatDate(startOfLastWeek), end: formatDate(endOfLastWeek) });
      setDateFilter('custom');
    }
  };

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowCalendar(false);
    }
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    const today = new Date();
    setSelectedDate(formatDate(today));
    setDateFilter('custom');
    setShowCalendar(false);
  };

  const getVehicleTypeIcon = () => {
    return vehicleType === 'car' ? <Car className="h-4 w-4" /> : <Bike className="h-4 w-4" />;
  };

  const getVehicleTypeLabel = () => {
    return vehicleType === 'car' ? 'Cars' : 'Motorcycles';
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Error loading queue</h3>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-xs bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Vehicle Type Header */}
      <div className="flex items-center gap-2 text-text-secondary-light dark:text-text-secondary-dark">
        {getVehicleTypeIcon()}
        <span className="text-sm font-medium">Showing {getVehicleTypeLabel()}</span>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark p-3 sm:p-4 rounded-lg shadow-sm border border-border-light dark:border-border-dark">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={`Search ${vehicleType === 'car' ? 'car' : 'motorcycle'} plate, model, service...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="relative">
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-text-secondary-light dark:text-text-secondary-dark flex-shrink-0" />
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  onKeyDown={handleKeyDown}
                  className="block w-full pl-3 pr-10 py-2.5 sm:py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue text-sm text-left flex items-center justify-between transition-all duration-200"
                  aria-label="Select date"
                  aria-expanded={showCalendar}
                >
                  <span className="text-text-primary-light dark:text-text-primary-dark truncate">
                    {dateFilter === 'today' ? 'Today' : 
                     dateFilter === 'all' ? 'All Time' : 
                     selectedDate ? formatDisplayDate(selectedDate) : 'Choose a Day'}
                  </span>
                  <ChevronRight className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 text-text-secondary-light dark:text-text-secondary-dark ${showCalendar ? 'rotate-90' : ''}`} />
                </button>
              </div>

              {showCalendar && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-xl z-50 p-3 sm:p-4 max-h-96 overflow-y-auto" ref={calendarRef}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="p-1.5 sm:p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-text-secondary-light dark:text-text-secondary-dark" />
                    </button>
                    <h3 className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="p-1.5 sm:p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-text-secondary-light dark:text-text-secondary-dark" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-3 sm:mb-4 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                      <div key={day} className="h-8 w-8 flex items-center justify-center text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
                        {day}
                      </div>
                    ))}
                    {generateCalendarDays()}
                  </div>

                  <div className="border-t border-border-light dark:border-border-dark pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Quick Select:</p>
                      <button
                        onClick={goToToday}
                        className="px-2 py-1 text-xs bg-brand-blue hover:bg-brand-dark-blue text-white rounded transition-colors"
                      >
                        Today
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {quickDateOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => handleQuickDateSelect(option.value)}
                          className="px-2 py-1 text-xs bg-background-light dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark rounded transition-colors"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedDate && (
                    <div className="border-t border-border-light dark:border-border-dark pt-3 mt-3 flex items-center justify-between">
                      <span className="text-sm text-text-primary-light dark:text-text-primary-dark">
                        Selected: {formatDisplayDate(selectedDate)}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedDate('');
                          setDateFilter('today');
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        aria-label="Clear selection"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5 text-text-secondary-light dark:text-text-secondary-dark" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-text-secondary-light dark:text-text-secondary-dark flex-shrink-0" />
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ServiceStatus | 'all')}
                className="block w-full pl-3 pr-10 py-2.5 sm:py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue text-sm transition-all duration-200"
              >
                <option value="all">All Statuses</option>
                <option value="waiting">Waiting</option>
                <option value="in-progress">In Progress</option>
                <option value="payment-pending">Ready for Payment</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle History Search Section */}
      <div className="bg-surface-light dark:bg-surface-dark p-3 sm:p-4 rounded-lg shadow-sm border border-border-light dark:border-border-dark">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">Vehicle History Search</h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs px-2 py-1 bg-brand-blue hover:bg-brand-dark-blue text-white rounded transition-colors"
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search plate number for full history..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
            />
          </div>

          {showHistory && historySearch && (
            <div className="mt-2">
              {vehicleHistory.length > 0 ? (
                <div className="space-y-2">
                  {vehicleHistory.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{vehicle.plate}</h4>
                          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{vehicle.model}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            vehicle.status === 'cancelled' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-brand-blue/10 text-brand-blue'
                          }`}>
                            {vehicle.status}
                          </span>
                          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                            {new Date(vehicle.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      {'service' in vehicle && (
                        <p className="mt-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                          Service: {vehicle.service}
                        </p>
                      )}
                      {vehicle.status === 'cancelled' && 'cancellation_reason' in vehicle && vehicle.cancellation_reason && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Cancellation Reason:</p>
                          <p className="text-xs text-red-700 dark:text-red-300">{vehicle.cancellation_reason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center py-4">
                  No history found for this plate number
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: 'Waiting', count: waitingCount, status: 'waiting' },
          { title: 'In Progress', count: inProgressCount, status: 'in-progress' },
          { title: 'Payment', count: paymentPendingCount, status: 'payment-pending' },
          { title: 'Completed', count: completedCount, status: 'completed', total: completedDailyTotal },
          { title: 'Cancelled', count: cancelledCount, status: 'cancelled' },
          { title: 'All', count: dateFilteredVehicles.length, status: 'all' }
        ].map(item => (
          <div 
            key={item.status}
            onClick={() => setStatusFilter(item.status as ServiceStatus | 'all')}
            className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${statusFilter === item.status ? 'bg-brand-blue text-white shadow-lg' : 'bg-surface-light dark:bg-surface-dark hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <p className={`text-sm font-medium ${statusFilter === item.status ? 'text-white/80' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>{item.title}</p>
            <p className="text-2xl font-bold">{item.count}</p>
            {item.status === 'completed' && item.total !== undefined && (
              <p className={`text-xs mt-1 ${statusFilter === item.status ? 'text-white/70' : 'text-green-600 dark:text-green-400'}`}>
                ₱{item.total.toLocaleString()} total
              </p>
            )}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center p-8">Loading...</div>
      ) : (
        <div className="space-y-4">
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle, index) => {
              // Calculate queue position only for waiting vehicles
              const queuePosition = statusFilter === 'waiting' && vehicle.status === 'waiting' ? index + 1 : undefined;
              
              return (
                <QueueItem 
                  key={vehicle.id} 
                  vehicle={vehicle} 
                  countCrewAsBusy={vehicle.status !== 'payment-pending'}
                  queuePosition={queuePosition}
                />
              );
            })
      ) : (
            <div className="text-center p-8 bg-surface-light dark:bg-surface-dark rounded-lg">
              <p className="font-medium">No {vehicleType === 'car' ? 'cars' : 'motorcycles'} match the current filters.</p>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QueueList;