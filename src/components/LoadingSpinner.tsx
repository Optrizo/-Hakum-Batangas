import React from 'react';
import { Loader2, WifiOff, CheckCircle, Clock } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'completion' | 'retry' | 'verification' | 'offline';
  className?: string;
  text?: string;
  showIcon?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className = '',
  text,
  showIcon = true,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'completion':
        return {
          spinnerColor: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          textColor: 'text-green-700 dark:text-green-300',
          icon: CheckCircle,
        };
      case 'retry':
        return {
          spinnerColor: 'text-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          icon: Clock,
        };
      case 'offline':
        return {
          spinnerColor: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          textColor: 'text-red-700 dark:text-red-300',
          icon: WifiOff,
        };
      default:
        return {
          spinnerColor: 'text-brand-blue',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-700 dark:text-blue-300',
          icon: Loader2,
        };
    }
  };

  const { spinnerColor, bgColor, textColor, icon: Icon } = getVariantStyles();

  if (!text) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        {showIcon && (
          variant === 'offline' ? (
            <Icon className={`${sizeClasses[size]} ${spinnerColor}`} />
          ) : (
            <Icon className={`${sizeClasses[size]} ${spinnerColor} animate-spin`} />
          )
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor} ${className}`}>
      {showIcon && (
        variant === 'offline' ? (
          <Icon className={`${sizeClasses[size]} ${spinnerColor}`} />
        ) : (
          <Icon className={`${sizeClasses[size]} ${spinnerColor} animate-spin`} />
        )
      )}
      {text && (
        <span className={`text-sm font-medium ${textColor}`}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;