import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Select, DatePicker, InputNumber, Input, ConfigProvider } from "antd";
import dayjs from 'dayjs';
import locale from 'antd/locale/ru_RU';
import { useApi } from "../../functions/fetchMetadata";
import { EnumerationData, IPropertyDto, NavigationData } from "../CommonComponents/types";
import AsyncSelect from "../CommonComponents/AsyncSelect";

interface CriteriaValueEditorProps {
    rootDocTypeGuid: string;
    property?: IPropertyDto;
    propertyGuid?: string;
    value: string;
    onChange: (value: string, propertyType?: string, propertyGuid?: string) => void;
    enabled?: boolean;
    isMultiSelect?: boolean;
}

const boolOptions = [
    { value: 'true', label: 'Да' },
    { value: 'false', label: 'Нет' }
];

const safeToString = (val: any): string => {
    if (val === undefined || val === null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (Array.isArray(val)) return val.join('|');
    if (typeof val === 'object') {
        if (val.value !== undefined) return String(val.value);
        if (val.label !== undefined) return String(val.label);
        return JSON.stringify(val);
    }
    return String(val);
};

export const CriteriaValueEditor = React.memo<CriteriaValueEditorProps>(({
    rootDocTypeGuid,
    property,
    propertyGuid,
    value,
    onChange,
    enabled = true,
    isMultiSelect = false
}) => {
    const { fetchNavigationSelectDataList, fetchEntitiesData, fetchPropertyEnumerationValues } = useApi();
    const [enumOptions, setEnumOptions] = useState<{ value: string; label: string }[]>([]);
    const [navigationOptions, setNavigationOptions] = useState<{ value: string; label: string }[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);

    const lastLoadedIdsRef = useRef<string>('');
    const isMountedRef = useRef(true);

    const stringValue = safeToString(value);
    const propertyType = property?.PropertyType || 'String';

    const multiSelectValues = useMemo(
        () => isMultiSelect ? stringValue.split('|').filter(v => v) : [],
        [stringValue, isMultiSelect]
    );

    // Загрузка значений для Enumeration
    useEffect(() => {
        setEnumOptions([]);
        if (propertyType !== 'Enumeration' || !propertyGuid) {
            return;
        }

        let cancelled = false;
        const loadEnumValues = async () => {
            try {
                const parentGuid = property && property.ParentGuid && property.ParentGuid.length > 0 ? property.ParentGuid : rootDocTypeGuid;
                const options = await fetchPropertyEnumerationValues(parentGuid, property?.Name ?? "");
                if (cancelled || !isMountedRef.current)
                    return;

                const mapped = options.map((item: EnumerationData) => ({
                    value: item.Value,
                    label: item.Label
                }));

                setEnumOptions(mapped);
            } catch (error) {
                console.error('Ошибка загрузки enum значений:', error);
                if (isMountedRef.current) {
                    setEnumOptions([]);
                }
            }
        };

        loadEnumValues();

        return () => { cancelled = true }
    }, [propertyType, propertyGuid, property?.ParentGuid, property?.Name]);

    // Загрузка значений для Navigation по ID
    useEffect(() => {
        if (propertyType !== 'Navigation' || !propertyGuid)
            return;

        if (!stringValue) {
            if (navigationOptions.length > 0) {
                setNavigationOptions([]);
                lastLoadedIdsRef.current = '';
            }

            return;
        }

        const idsString = stringValue.split('|').filter(v => v).sort().join(',');
        if (lastLoadedIdsRef.current === idsString) {
            return;
        }

        let cancelled = false;
        const loadNavigationValues = async () => {
            setIsLoadingOptions(true);
            try {
                const options = await fetchEntitiesData(propertyGuid, stringValue);
                if (cancelled || !isMountedRef.current)
                    return;

                const newOptions = options.map((item: any) => ({
                    value: String(item.Id || item.id || item.value),
                    label: item.DisplayValue || item.Name || item.label || String(item)
                }));
                setNavigationOptions(newOptions);
                lastLoadedIdsRef.current = idsString;
            } catch (error) {
                if (cancelled || !isMountedRef.current)
                    return;

                console.error('Ошибка загрузки navigation значений:', error);
                lastLoadedIdsRef.current = idsString;
                setNavigationOptions([]);
            } finally {
                if (!cancelled && isMountedRef.current) {
                    setIsLoadingOptions(false);
                }
            }
        };

        loadNavigationValues();
        return () => { cancelled = true; };
    }, [propertyType, propertyGuid, stringValue]);

    const normalizeValue = useCallback((newValue: unknown): string => {
        if (newValue === undefined || newValue === null)
            return '';
        if (typeof newValue === 'string') {
            return newValue;
        }
        if (typeof newValue === 'number')
            return newValue.toString();
        if (typeof newValue === 'boolean')
            return newValue ? 'true' : 'false';
        if (Array.isArray(newValue)) {
            return newValue.map(item => {
                if (item && typeof item === 'object') {
                    const obj = item as { value?: unknown; label?: unknown };
                    return String(obj.value ?? obj.label ?? item);
                }
                return String(item);
            }).join('|');
        }
        if (typeof newValue === 'object') {
            const obj = newValue as { value?: unknown; label?: unknown };
            if (obj.value !== undefined) {
                return String(obj.value);
            }
            if (obj.label !== undefined) {
                return String(obj.label);
            }

            return JSON.stringify(newValue);
        }
        return String(newValue);
    }, []);

    const handleValueChange = useCallback((newValue: unknown) => {
        onChange(normalizeValue(newValue), propertyType, propertyGuid);
    }, [onChange, propertyType, propertyGuid, normalizeValue]);

    const getSingleSelectValue = useCallback(() => {
        if (!stringValue) return undefined;
        const foundOption = navigationOptions.find(opt => opt.value === stringValue);
        if (foundOption) {
            return { label: foundOption.label, value: foundOption.value };
        }
        return { label: stringValue, value: stringValue };
    }, [stringValue, navigationOptions]);

    const getMultipleSelectValue = useCallback(() => {
        if (!stringValue)
            return undefined;
        const values = stringValue.split('|').filter(v => v);
        if (values.length === 0)
            return undefined;

        return values.map(val => {
            const foundOption = navigationOptions.find(opt => opt.value === val);
            return foundOption ? { label: foundOption.label, value: foundOption.value } : { label: val, value: val };
        });
    }, [stringValue, navigationOptions]);

    const fetchOptions = useCallback(
        (searchText: string) => fetchNavigationSelectDataList(propertyGuid || '', searchText, stringValue),
        [fetchNavigationSelectDataList, propertyGuid, stringValue]
    );

    // Для мультивыбора (IncludedIn)
    if (isMultiSelect) {
        if (propertyType === 'Navigation') {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                    <AsyncSelect<NavigationData>
                        disabled={!enabled}
                        mode="multiple"
                        value={getMultipleSelectValue()}
                        bordered={false}
                        fetchOptions={fetchOptions}
                        placeholder="Выберите значения"
                        onChange={handleValueChange}
                        style={{
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            flex: 1
                        }}
                    />
                </div>
            );
        }

        if (propertyType === 'Enumeration') {
            return (
                <Select
                    disabled={!enabled}
                    mode="multiple"
                    value={multiSelectValues}
                    onChange={handleValueChange}
                    options={enumOptions}
                    bordered={false}
                    style={{ width: '100%' }}
                    showSearch
                    placeholder="Выберите значения"
                    allowClear
                    filterOption={(input, option) =>
                        (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                />
            );
        }

        return (
            <Select
                disabled={!enabled}
                mode="tags"
                value={multiSelectValues}
                onChange={handleValueChange}
                bordered={false}
                style={{ width: '100%' }}
                placeholder="Введите значения и нажмите Enter"
                tokenSeparators={[',']}
                allowClear
            />
        );
    }

    // Одиночный выбор

    switch (propertyType) {
        case 'Navigation':
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                    <AsyncSelect<NavigationData>
                        disabled={!enabled}
                        value={getSingleSelectValue()}
                        bordered={false}
                        fetchOptions={fetchOptions}
                        placeholder="Выберите значение"
                        onChange={handleValueChange}
                        style={{
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            flex: 1
                        }}
                        loading={isLoadingOptions}
                    />
                </div>
            );

        case 'Boolean':
            return (
                <Select
                    disabled={!enabled}
                    value={stringValue || undefined}
                    onChange={handleValueChange}
                    options={boolOptions}
                    bordered={false}
                    style={{ width: '100%' }}
                    placeholder="Выберите значение"
                    allowClear
                />
            );

        case 'DateTime':
            const dateValue = stringValue ? dayjs(stringValue, 'DD.MM.YYYY HH:mm') : null;
            return (
                <ConfigProvider locale={locale}>
                    <DatePicker
                        disabled={!enabled}
                        value={dateValue?.isValid() ? dateValue : null}
                        placeholder=""
                        bordered={false}
                        style={{ padding: 0, width: '100%' }}
                        format="DD.MM.YYYY HH:mm"
                        showTime={{ format: 'HH:mm', minuteStep: 1 }}
                        onChange={(date) => {
                            if (date && date.isValid()) {
                                handleValueChange(date.format('DD.MM.YYYY HH:mm'));
                            } else {
                                handleValueChange('');
                            }
                        }}
                    />
                </ConfigProvider>
            );

        case 'Integer':
        case 'LongInteger':
        case 'DoubleType':
            const isDouble = propertyType === 'DoubleType';
            const step = isDouble ? 0.01 : 1;
            const numValue = stringValue ? parseFloat(stringValue) : undefined;

            return (
                <InputNumber
                    disabled={!enabled}
                    value={numValue}
                    bordered={false}
                    style={{ padding: 0, width: '100%' }}
                    controls={false}
                    step={step}
                    precision={isDouble ? 2 : 0}
                    onChange={handleValueChange}
                    placeholder="Введите число"
                />
            );

        case 'Enumeration':
            return (
                <Select
                    disabled={!enabled}
                    value={stringValue || undefined}
                    onChange={handleValueChange}
                    options={enumOptions}
                    bordered={false}
                    style={{ width: '100%' }}
                    showSearch
                    placeholder="Выберите значение"
                    allowClear
                    filterOption={(input, option) =>
                        (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                />
            );

        default:
            return (
                <Input
                    disabled={!enabled}
                    value={stringValue}
                    bordered={false}
                    style={{ padding: 0, width: '100%' }}
                    placeholder="Введите значение"
                    onChange={(e) => handleValueChange(e.target.value)}
                />
            );
    }
});