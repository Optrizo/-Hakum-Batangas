import { useState, useCallback, useRef } from 'react';

export interface LoadingOperation {
  id: string;
  type: 'completion' | 'status_update' | 'crud' | 'general';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface LoadingState {
  isLoading: boolean;
  operations: Map<string, LoadingOperation>;
  error: string | null;
}

export interface UseLoadingStateReturn {
  isLoading: boolean;
  error: string | null;
  startOperation: (id: string, type?: LoadingOperation['type'], maxRetries?: number) => void;
  endOperation: (id: string) => void;
  retryOperation: (id: string) => boolean;
  setError: (error: string | null) => void;
  isOperationActive: (id: string) => boolean;
  getOperationsByType: (type: LoadingOperation['type']) => LoadingOperation[];
  clearAllOperations: () => void;
}

/**
 * Custom hook to manage loading states for async operations with retry logic
 * Particularly useful for transaction state management where reliability is critical
 */
export const useLoadingState = (): UseLoadingStateReturn => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    operations: new Map(),
    error: null,
  });

  const operationsRef = useRef<Map<string, LoadingOperation>>(new Map());

  const updateState = useCallback(() => {
    setLoadingState({
      isLoading: operationsRef.current.size > 0,
      operations: new Map(operationsRef.current),
      error: loadingState.error,
    });
  }, [loadingState.error]);

  const startOperation = useCallback((
    id: string, 
    type: LoadingOperation['type'] = 'general',
    maxRetries: number = 3
  ) => {
    const operation: LoadingOperation = {
      id,
      type,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    operationsRef.current.set(id, operation);
    updateState();
  }, [updateState]);

  const endOperation = useCallback((id: string) => {
    operationsRef.current.delete(id);
    updateState();
  }, [updateState]);

  const retryOperation = useCallback((id: string): boolean => {
    const operation = operationsRef.current.get(id);
    if (!operation) return false;

    if (operation.retryCount >= operation.maxRetries) {
      operationsRef.current.delete(id);
      updateState();
      return false;
    }

    const updatedOperation: LoadingOperation = {
      ...operation,
      retryCount: operation.retryCount + 1,
      timestamp: Date.now(),
    };

    operationsRef.current.set(id, updatedOperation);
    updateState();
    return true;
  }, [updateState]);

  const setError = useCallback((error: string | null) => {
    setLoadingState(prev => ({
      ...prev,
      error,
    }));
  }, []);

  const isOperationActive = useCallback((id: string): boolean => {
    return operationsRef.current.has(id);
  }, []);

  const getOperationsByType = useCallback((type: LoadingOperation['type']): LoadingOperation[] => {
    return Array.from(operationsRef.current.values()).filter(op => op.type === type);
  }, []);

  const clearAllOperations = useCallback(() => {
    operationsRef.current.clear();
    updateState();
  }, [updateState]);

  return {
    isLoading: loadingState.isLoading,
    error: loadingState.error,
    startOperation,
    endOperation,
    retryOperation,
    setError,
    isOperationActive,
    getOperationsByType,
    clearAllOperations,
  };
};

/**
 * Wrapper function for executing operations with loading state management
 * Includes retry logic and error handling specifically for transaction operations
 */
export const executeWithLoadingState = async <T>(
  loadingHook: UseLoadingStateReturn,
  operationId: string,
  operation: () => Promise<T>,
  options: {
    type?: LoadingOperation['type'];
    maxRetries?: number;
    retryDelay?: number;
    verifyOperation?: () => Promise<boolean>;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> => {
  const {
    type = 'general',
    maxRetries = 3,
    retryDelay = 1000,
    verifyOperation,
    onRetry,
  } = options;

  loadingHook.startOperation(operationId, type, maxRetries);
  loadingHook.setError(null);

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const result = await operation();
      
      // If verification is provided and it's a critical operation, verify the result
      if (verifyOperation && type === 'completion') {
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for DB consistency
        const isVerified = await verifyOperation();
        if (!isVerified) {
          throw new Error('Operation verification failed. Please try again.');
        }
      }

      loadingHook.endOperation(operationId);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        // Check if we should retry this operation
        const shouldRetry = loadingHook.retryOperation(operationId);
        if (shouldRetry) {
          attempt++;
          // Add exponential backoff for completion operations
          const delay = type === 'completion' ? retryDelay * Math.pow(2, attempt - 1) : retryDelay;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      break;
    }
  }

  loadingHook.endOperation(operationId);
  loadingHook.setError(lastError?.message || 'Operation failed');
  throw lastError;
};