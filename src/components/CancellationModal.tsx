import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Car, Motor } from '../types';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  vehicle: Car | Motor;
  isLoading?: boolean;
}

const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  vehicle,
  isLoading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
      // Focus the textarea after a brief delay to ensure modal is rendered
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Cancellation reason is required');
      return;
    }
    
    if (trimmedReason.length < 3) {
      setError('Cancellation reason must be at least 3 characters long');
      return;
    }
    
    if (trimmedReason.length > 500) {
      setError('Cancellation reason must be less than 500 characters');
      return;
    }
    
    setError('');
    onConfirm(trimmedReason);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
    
    // Allow Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && reason.trim()) {
      handleSubmit(e);
    }
  };

  const commonReasons = [
    'Customer requested cancellation',
    'Vehicle not available',
    'Service not available',
    'Customer no-show',
    'Payment issues',
    'Schedule conflict',
    'Technical problems',
    'Customer changed mind'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={!isLoading ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative transform rounded-lg bg-surface-light dark:bg-surface-dark shadow-xl transition-all w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
                  Cancel Service
                </h3>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  {vehicle.plate} - {vehicle.model}
                </p>
              </div>
            </div>
            
            {!isLoading && (
              <button
                onClick={onClose}
                className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4 text-text-secondary-light dark:text-text-secondary-dark" />
              </button>
            )}
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4">
            <div className="mb-4">
              <label 
                htmlFor="cancellation-reason" 
                className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2"
              >
                Reason for cancellation <span className="text-red-500">*</span>
              </label>
              
              <textarea
                ref={textareaRef}
                id="cancellation-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="Please provide a reason for cancelling this service..."
                className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-md bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={3}
                maxLength={500}
                disabled={isLoading}
                required
              />
              
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  {reason.length}/500 characters
                </span>
                {error && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {error}
                  </span>
                )}
              </div>
            </div>

            {/* Quick reason buttons */}
            <div className="mb-4">
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">
                Quick reasons (click to use):
              </p>
              <div className="flex flex-wrap gap-1">
                {commonReasons.map((commonReason) => (
                  <button
                    key={commonReason}
                    type="button"
                    onClick={() => setReason(commonReason)}
                    disabled={isLoading}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-text-secondary-light dark:text-text-secondary-dark rounded transition-colors disabled:opacity-50"
                  >
                    {commonReason}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium border border-border-light dark:border-border-dark rounded-md text-text-secondary-light dark:text-text-secondary-dark bg-background-light dark:bg-background-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={isLoading || !reason.trim() || reason.trim().length < 3}
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CancellationModal;