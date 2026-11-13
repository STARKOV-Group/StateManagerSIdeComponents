import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { IExtendetEntity, IIntegrationSetting } from '../controls/CommonComponents/types';
import { IRemoteComponentCardApi } from '@directum/sungero-remote-component-types';
import axios from 'axios';

interface SettingsState {
    settings: IIntegrationSetting;
    loading: boolean;
    error: string | null;
}

type SettingsAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SETTINGS'; payload: IIntegrationSetting }
    | { type: 'SET_ERROR'; payload: string };

const initialState: SettingsState = {
    settings: { Url: '', User: '', Password: '' },
    loading: false,
    error: null
};

const settingsReducer = (state: SettingsState, action: SettingsAction): SettingsState => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_SETTINGS':
            return { ...state, settings: action.payload, loading: false, error: null };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        default:
            return state;
    }
};

interface SettingsContextType {
    state: SettingsState;
    loadSettings: (api: IRemoteComponentCardApi) => Promise<void>;
    createApiClient: () => any;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(settingsReducer, initialState);

    const loadSettings = useCallback(async (api: IRemoteComponentCardApi) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            let settingsData: any = null;
            try {
                settingsData = await api.getSettings();
            } catch (settingsError) {
                console.warn('getSettings() не доступен, используем сущность:', settingsError);
            }

            if (!settingsData || !settingsData.IntegrationUrl || settingsData.IntegrationUrl.length == 0) {
                const entity = api.getEntity<IExtendetEntity>();
                settingsData = {
                    IntegrationUrl: entity.IntegrationUrl || '',
                    User: entity.User || '',
                    Password: entity.Password || ''
                };

            }

            if (settingsData) {
                const newSettings = {
                    Url: settingsData.IntegrationUrl,
                    User: settingsData.User,
                    Password: settingsData.Password
                };
                dispatch({ type: 'SET_SETTINGS', payload: newSettings });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Ошибка загрузки настроек' });
        }
    }, []);

    // Функция для создания API клиента с использованием настроек из контекста
    const createApiClient = useCallback(() => {
        const { settings } = state;
        const baseURL = settings.Url?.length > 0 ? settings.Url : undefined;

        if (!baseURL) {
            throw new Error('URL интеграции не настроен');
        }

        const normalizedBaseURL = baseURL.endsWith('/') ? baseURL : baseURL + '/';

        const instance = axios.create({
            baseURL: normalizedBaseURL,
            timeout: 10000,
            // auth: {
            //     username: settings.User?.length > 0 ? settings.User : entity.User,
            //     password: settings.Password?.length > 0 ? settings.Password : entity.Password,
            // },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            withCredentials: true
        });

        instance.interceptors.request.use(config => {
            if (config.method?.toUpperCase() === 'OPTIONS') {
                config.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
                config.headers['Access-Control-Allow-Headers'] = 'Content-Type';
            }
            return config;
        });

        instance.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 401) {
                    console.error('Ошибка авторизации');
                }
                return Promise.reject(error);
            }
        );

        return instance;
    }, [state.settings]);

    const value = useMemo(() => ({ state, loadSettings, createApiClient }), [state, loadSettings, createApiClient]);
    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
};