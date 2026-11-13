import axios from "axios";
import { IPropertyDto, IPropertyMetadata, CalculateFrom, IPropertyDisplayNameDto, NavigationData, EnumerationData } from "../controls/CommonComponents/types";
import React, { useCallback, useMemo } from "react";
import { useSettings } from "../context/SettingsContext";

const handleApiError = (error: unknown, context: string): never => {
  if (axios.isAxiosError(error)) {
    console.error(`Ошибка запроса (${context}):`, {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
    });

    if (error.response?.status === 401) {
      throw new Error('Ошибка авторизации: неверные учетные данные');
    }
    if (error.response?.status === 404) {
      throw new Error(`Метод API не найден: ${context}`);
    }
  } else {
    console.error(`Неожиданная ошибка (${context}):`, error);
  }

  throw new Error(`Не удалось выполнить запрос (${context}). Пожалуйста, попробуйте позже.`);
};

export const useApi = () => {
  const { createApiClient } = useSettings();

  const fetchEntityMetadata = useCallback(async (guid: string): Promise<IPropertyMetadata> => {
    try {
      const response = await createApiClient().get(`GetEntityProperties(typeGuid='${guid}')`);
      if (!response.data) {
        console.warn('Пустой ответ от сервера');
        return createEmptyMetadata(guid);
      }

      return mapMetadataResponse(response.data, guid);
    } catch (error) {
      handleApiError(error, 'GetEntityProperties');
      return createEmptyMetadata(guid);
    }
  }, [createApiClient]);

  const fetchNavigationSelectDataList = useCallback(async (entityTypeGuid: string, searchText: string, selectedValue: string): Promise<NavigationData[]> => {
    try {
      const response = await createApiClient().get(`GetDataForNavigationSelectControl(entityTypeGuid='${entityTypeGuid}',searchText='${searchText}',selectedValues='${selectedValue}')`)
      if (!response.data || !response.data.value) {
        console.warn('Пустой ответ от сервера');
        return [];
      }

      const data = response.data.value as Array<{ Id: string; DisplayValue: string }>;

      return data.map<NavigationData>((item) => ({
        label: item.DisplayValue,
        value: item.Id,
      }));

    }
    catch (error) {
      handleApiError(error, 'GetDataForNavigationSelectControl');
      return [{ label: '', value: '0' }]
    }
  }, [createApiClient]);

  const fetchPropertyEnumerationValues = useCallback(async (entityGuid: string, propertyName: string): Promise<EnumerationData[]> => {
    try {
      const response = await createApiClient().get(`GetPropertyEnumerationValues(entityGuid='${entityGuid}',propertyName='${propertyName}')`)
      if (!response.data || !response.data.value) {
        console.warn('Пустой ответ от сервера');
        return [];
      }
      return response.data.value as EnumerationData[];
    }
    catch (error) {
      handleApiError(error, 'GetPropertyEnemerationValues');
      return []
    }
  }, [createApiClient]);

  const fetchEntitiesData = useCallback(async (entityTypeGuid: string, entityIds: string): Promise<NavigationData[]> => {
    try {

      const response = await createApiClient().get(`GetEntitiesData(entityTypeGuid='${entityTypeGuid}',entityIds='${entityIds}')`)
      if (!response.data || !response.data.value) {
        console.warn('Пустой ответ от сервера');
        return [];
      }

      const data = response.data.value as Array<{ Id: string; DisplayValue: string }>;

      return data.map<NavigationData>((item) => ({
        label: item.DisplayValue,
        value: item.Id,
      }));
    }
    catch (error) {
      handleApiError(error, 'GetEntitiesData');
      return [{ label: '', value: '0' }]
    }
  }, [createApiClient]);

  const fetchPropertyDisplayNames = useCallback(async (id: number = 0, signal?: AbortSignal): Promise<IPropertyDisplayNameDto[]> => {
    let result: IPropertyDisplayNameDto[] = [];

    try {
      if (id === 0)
        return result;

      const response = await createApiClient().get(`GetPropertiesDisplayName(docKindId=${id})`, { signal });
      if (!response.data) {
        console.warn('Пустой ответ от сервера');
        return [];
      }

      if (response.data.value && Array.isArray(response.data.value)) {
        result = response.data.value.map((prop: any) => ({
          Id: prop.Id,
          CustomName: prop.CustomName || '',
          LocalisedName: prop.LocalisedName || '',
        }));
      } else if (response.data.PropertySettings && Array.isArray(response.data.PropertySettings)) {
        result = response.data.PropertySettings.map((prop: IPropertyDisplayNameDto) => ({
          Id: prop.Id,
          CustomName: prop.CustomName || '',
          LocalisedName: prop.LocalisedName || '',
        }));
      } else {
        throw new Error('Неожиданный формат ответа GetPropertiesDisplayName');
      }

    } catch (error) {
      if (axios.isCancel(error)) {
        return result;
      }
      handleApiError(error, 'GetPropertiesDisplayName');
      return [];
    }

    return result;
  }, [createApiClient]);

  return useMemo(() => ({
    fetchEntityMetadata,
    fetchNavigationSelectDataList,
    fetchEntitiesData,
    fetchPropertyEnumerationValues,
    fetchPropertyDisplayNames
  }), [
    fetchEntityMetadata,
    fetchNavigationSelectDataList,
    fetchEntitiesData,
    fetchPropertyEnumerationValues,
    fetchPropertyDisplayNames]);
};

const mapMetadataResponse = (data: any, guid: string): IPropertyMetadata => ({
  EntityId: data.EntityId || 0,
  EntityGuid: data.EntityGuid,
  Properties: data.Properties?.map((prop: any) => ({
    PropertyGuid: generatePropertyId(prop, data.EntityGuid),
    PropertyNameGuid: prop.PropertyNameGuid || '',
    Name: prop.Name || '',
    LocalisedName: prop.LocalisedName || prop.Name || '',
    PropertyType: prop.PropertyType || 'Unknown',
    ParentGuid: guid,
    CalculateFrom: CalculateFrom.Property
  })).sort((a: IPropertyDto, b: IPropertyDto) =>
    a.LocalisedName.localeCompare(b.LocalisedName)
  ) || []
});

const createEmptyMetadata = (guid: string, id: number = 0): IPropertyMetadata => ({
  EntityId: id,
  EntityGuid: guid,
  Properties: []
});

const generatePropertyId = (prop: {
  PropertyGuid: string | null,
  Name: string,
  PropertyType: string
}, entityGuid: string): string => {
  // Для Navigation свойств используем оригинальный GUID
  if ((prop.PropertyType === 'Navigation' || prop.PropertyType === 'Collection') && prop.PropertyGuid) {
    return prop.PropertyGuid;
  }

  // Для простых свойств создаем составной идентификатор
  const prefix = 'simple_';
  return `${prefix}${prop.Name}_${entityGuid}`;
};