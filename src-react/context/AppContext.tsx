import React, { createContext, ReactNode, useContext, useReducer } from 'react';
import { NetworkService, PublicNetworkInfo } from '../types/network';
import logger from '../utils/logger';

// Define the shape of the app's state
interface AppState {
  isScanning: boolean;
  services: NetworkService[];
  publicNetworkInfo: PublicNetworkInfo | null;
  filter: string;
}

// Define the possible actions
type AppAction =
  | { type: 'START_SCAN' }
  | { type: 'STOP_SCAN' }
  | { type: 'ADD_SERVICE'; service: NetworkService }
  | { type: 'REMOVE_SERVICE'; serviceId: string }
  | { type: 'UPDATE_SERVICE'; service: NetworkService }
  | { type: 'CLEAR_SERVICES' }
  | { type: 'SET_PUBLIC_INFO'; info: PublicNetworkInfo }
  | { type: 'UPDATE_FILTER'; filter: string };

// Create context with a default value
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const initialState: AppState = {
  isScanning: false,
  services: [],
  publicNetworkInfo: null,
  filter: '',
};

const getServiceKey = (service: NetworkService): string => {
  return `${service.name}:${service.address}:${service.port}`;
};

// Create the reducer function
export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'START_SCAN':
      logger.debug('START_SCAN action dispatched');
      logger.warn('START_SCAN changing isScanning', {
        from: state.isScanning,
        to: true,
      });
      return { ...state, isScanning: true };

    case 'STOP_SCAN':
      logger.debug('STOP_SCAN action dispatched');
      logger.warn('STOP_SCAN changing isScanning', {
        from: state.isScanning,
        to: false,
      });
      return {
        ...state,
        isScanning: false,
      };

    case 'ADD_SERVICE': {
      const existingService = state.services.find(
        s =>
          s.name === action.service.name &&
          s.address === action.service.address &&
          s.port === action.service.port
      );
      if (existingService) {
        logger.debug('Service already exists', {
          name: action.service.name,
          address: action.service.address,
          port: action.service.port,
        });
        return state;
      }
      logger.debug('Adding new service', {
        name: action.service.name,
        address: action.service.address,
        port: action.service.port,
      });
      return {
        ...state,
        services: [...state.services, action.service],
      };
    }

    case 'REMOVE_SERVICE': {
      logger.debug('Removing service', { serviceId: action.serviceId });
      return {
        ...state,
        services: state.services.filter(s => getServiceKey(s) !== action.serviceId),
      };
    }

    case 'UPDATE_SERVICE': {
      logger.debug('Updating service', { service: action.service });
      const serviceKey = getServiceKey(action.service);
      return {
        ...state,
        services: state.services.map(s => (getServiceKey(s) === serviceKey ? action.service : s)),
      };
    }

    case 'CLEAR_SERVICES':
      logger.debug('Clearing all services');
      return {
        ...state,
        services: [],
      };

    case 'SET_PUBLIC_INFO':
      return {
        ...state,
        publicNetworkInfo: action.info,
      };

    case 'UPDATE_FILTER':
      return {
        ...state,
        filter: action.filter,
      };

    default:
      return state;
  }
};

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Create the provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

// Create a custom hook for using the context
export function useAppState() {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }

  return context;
}

export default AppContext;
