import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Select, Spin } from 'antd';
import type { SelectProps } from 'antd';
import debounce from 'lodash/debounce';

export interface AsyncSelectProps<ValueType = any>
    extends Omit<SelectProps<ValueType | ValueType[]>, 'options' | 'children'> {
    fetchOptions: (searchText: string) => Promise<ValueType[]>;
    debounceTimeout?: number;
    mode?: 'multiple' | 'tags';
}

export function AsyncSelect<
    ValueType extends {
        key?: string;
        label: React.ReactNode;
        value: string | number;
    } = any,
>({ fetchOptions, debounceTimeout = 500, ...props }: AsyncSelectProps<ValueType>) {
    const [fetching, setFetching] = useState(false);
    const [options, setOptions] = useState<ValueType[]>([]);
    const fetchRef = useRef(0);

    const debounceFetcher = useMemo(() => {
        const loadOptions = (value: string) => {

            if (!value || value.length < 2) {
                setOptions([]);
                return;
            }

            fetchRef.current += 1;
            const fetchId = fetchRef.current;
            setOptions([]);
            setFetching(true);

            fetchOptions(value).then((newOptions) => {
                if (fetchId !== fetchRef.current) {
                    return;
                }

                setOptions(newOptions);
                setFetching(false);
            });
        };

        return debounce(loadOptions, debounceTimeout);
    }, [fetchOptions, debounceTimeout]);

    useEffect(() => () => debounceFetcher.cancel(), [debounceFetcher]);

    return (
        <Select
            labelInValue
            showSearch
            filterOption={false}
            onSearch={debounceFetcher}
            notFoundContent={fetching ? <Spin size="small" /> : 'Не найдено записей по запросу'}
            {...props}
            allowClear={true}
            clearIcon={
                <span
                    style={{
                        fontSize: '16px',
                        color: '#ff4d4f', // Красный
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#d9363e'; // Темнее при наведении
                        e.currentTarget.style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#ff4d4f';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    ✕
                </span>
            }
            options={options}
            optionRender={(option) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {option.label}
                </div>
            )}
        />
    );
}

export default React.memo(AsyncSelect) as typeof AsyncSelect;

