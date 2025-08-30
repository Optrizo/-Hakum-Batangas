import React from 'react';
import { CheckCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface TransactionStatusProps {
  status: 'pending' | 'success' | 'error' | 'verifying' | 'offline';
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showActions?: boolean;
}

const TransactionStatus: React.FC<TransactionStatusProps> = ({
  status,
  message,
  onRetry,
  onDismiss,
  showActions = true,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <LoadingSpinner size="sm" />,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-700 dark:text-blue-300',
          title: 'Processing Transaction...',
          defaultMessage: 'Please wait while we update the service status.',
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-700 dark:text-green-300',
          title: 'Transaction Successful',
          defaultMessage: 'The service status has been updated successfully.',
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-700 dark:text-red-300',
          title: 'Transaction Failed',
          defaultMessage: 'Failed to update service status. Please try again.',
        };
      case 'verifying':
        return {
          icon: <LoadingSpinner size="sm" variant="verification" />,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-700 dark:text-blue-300',
          title: 'Verifying Transaction...',
          defaultMessage: 'Confirming that the changes were saved properly.',
        };
      case 'offline':
        return {
          icon: <WifiOff className="h-5 w-5 text-red-500" />,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-700 dark:text-red-300',
          title: 'No Internet Connection',
          defaultMessage: 'Changes will be saved when connection is restored.',
        };
      default:
        return {
          icon: <LoadingSpinner size="sm" />,
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-700 dark:text-gray-300',
          title: 'Processing...',
          defaultMessage: 'Please wait...',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 mb-4`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {config.icon}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${config.textColor}`}>
            {config.title}
          </h3>
          <p className={`mt-1 text-sm ${config.textColor}`}>
            {message || config.defaultMessage}
          </p>
          {showActions && (status === 'error' || status === 'offline') && (
            <div className="mt-3 flex space-x-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:underline"
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:underline"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionStatus;