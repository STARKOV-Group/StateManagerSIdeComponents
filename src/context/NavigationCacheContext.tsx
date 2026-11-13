import React, { createContext, useContext, useCallback, ReactNode, useRef, useReducer } from 'react';
import { IPropertyDto } from '../controls/CommonComponents/types';

interface INavigationCacheContext {
  getCachedProperties: (guid: string) => IPropertyDto[] | undefined;
  setCachedProperties: (guid: string, properties: IPropertyDto[]) => void;
  clearCache: () => void;
  clearCacheEntry: (guid: string) => void;
  hasCachedProperties: (guid: string) => boolean;
}

const NavigationCacheContext = createContext<INavigationCacheContext | undefined>(undefined);

export const NavigationCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const cacheRef = useRef<Record<string, IPropertyDto[]>>({});
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const getCachedProperties = useCallback((guid: string): IPropertyDto[] => {
    return cacheRef.current[guid];
  }, []);

  const setCachedProperties = useCallback((guid: string, properties: IPropertyDto[]) => {
    cacheRef.current = { ...cacheRef.current, [guid]: properties };
    forceUpdate();
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
    forceUpdate();
  }, []);

  const clearCacheEntry = useCallback((guid: string) => {
    delete cacheRef.current[guid];
    forceUpdate();
  }, []);

  const hasCachedProperties = useCallback((guid: string): boolean => {
    return !!cacheRef.current[guid];
  }, []);

  return (
    <NavigationCacheContext.Provider value={{
      getCachedProperties,
      setCachedProperties,
      clearCache,
      clearCacheEntry,
      hasCachedProperties
    }}>
      {children}
    </NavigationCacheContext.Provider>
  );
};

export const useNavigationCache = (): INavigationCacheContext => {
  const context = useContext(NavigationCacheContext);
  if (!context) {
    throw new Error('useNavigationCache must be used within NavigationCacheProvider');
  }
  return context;
};