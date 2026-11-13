import React from "react";
import { ComparisonOperator, RightValueType } from "./types";
import { Select, Switch } from "antd";

// GUIDы для специальных типов
export const EMPLOYEE_ENTITY_TYPE_GUID = 'b7905516-2be5-4931-961c-cb38d5677565';
export const USER_ENTITY_TYPE_GUID = '243c2d26-f5f7-495f-9faf-951d91215c77';
export const ROLE_OPERATOR_NAVIGATION_GUID = '5e9b55c2-c1f5-4e4f-aa09-7b6d461d87ed';

export const OFFICIALDOCUMENT_ENTITY_TYPE_GUID = '58cca102-1e97-4f07-b6ac-fd866a8b7cb1';

export const ALL_OPERATORS: { value: ComparisonOperator; label: string }[] = [
    { value: 'IsEqual', label: 'Равно' },
    { value: 'IsNotEqual', label: 'Не равно' },
    { value: 'Contains', label: 'Содержит' },
    { value: 'NotContains', label: 'Не содержит' },
    { value: 'GreaterThan', label: 'Больше чем' },
    { value: 'LessThan', label: 'Меньше чем' },
    { value: 'IncludedIn', label: 'Входит в' },
    { value: 'NotIncludedIn', label: 'Не входит в' },
    { value: 'IncludedInRole', label: 'Входит в роль' },
    { value: 'IsNull', label: 'Пусто' },
    { value: 'IsNotNull', label: 'Не пусто' },
];

// Функция для получения доступных операторов в зависимости от типа свойства
export const getAvailableOperators = (propertyType: string, propertyGuid?: string): ComparisonOperator[] => {
    if (propertyGuid === USER_ENTITY_TYPE_GUID || propertyGuid === EMPLOYEE_ENTITY_TYPE_GUID) {
        return [
            'IsEqual', 'IsNotEqual', 'IsNull', 'IsNotNull', 'IncludedIn', 'NotIncludedIn', 'IncludedInRole'
        ];
    }

    if (propertyType === 'Integer' || propertyType === 'LongInteger' || propertyType === 'DoubleType') {
        return [
            'IsEqual', 'IsNotEqual', 'GreaterThan', 'LessThan', 'IsNull', 'IsNotNull'
        ];
    }

    if (propertyType === 'DateTime') {
        return [
            'IsEqual', 'IsNotEqual', 'GreaterThan', 'LessThan', 'IsNull', 'IsNotNull'
        ];
    }

    if (propertyType === 'String') {
        return [
            'IsEqual', 'IsNotEqual', 'Contains', 'NotContains', 'IsNull', 'IsNotNull'
        ];
    }

    if (propertyType === 'Boolean') {
        return [
            'IsEqual', 'IsNotEqual', 'IsNull', 'IsNotNull'
        ];
    }

    if (propertyType === 'Navigation') {
        return [
            'IsEqual', 'IsNotEqual', 'IsNull', 'IsNotNull', 'IncludedIn', 'NotIncludedIn'
        ];
    }

    if (propertyType === 'Collection') {
        return [
            'IsNull', 'IsNotNull'
        ];
    }

    if (propertyType === 'Enumeration') {
        return [
            'IsEqual', 'IsNotEqual', 'IsNull', 'IsNotNull', 'IncludedIn', 'NotIncludedIn'
        ];
    }

    return [
        'IsEqual', 'IsNotEqual', 'IsNull', 'IsNotNull'
    ];
};

// Заголовки столбцов
export const TableHeader = React.memo(() => (
    <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 8,
        padding: '8px 0',
        backgroundColor: '#f5f5f5',
        borderRadius: 4
    }}>
        <div style={{ width: 80, paddingLeft: 8, flexShrink: 0, fontWeight: 'normal' }}>
            Логика
        </div>
        <div style={{ flex: 2, fontWeight: 'normal' }}>
            Свойство
        </div>
        <div style={{ flex: 1, fontWeight: 'normal' }}>
            Оператор
        </div>
        <div style={{ flex: 2, fontWeight: 'normal' }}>
            Значение
        </div>
        <div style={{ width: 80, textAlign: 'center', flexShrink: 0, fontWeight: 'normal' }} />
        <div style={{ width: 32, textAlign: 'center', flexShrink: 0, fontWeight: 'normal' }}>

        </div>
    </div>
));

// Компонент логического оператора для отдельной строки
export const LogicalOperatorSelect = React.memo(({
    index,
    value,
    onChange
}: {
    index: number;
    value?: 'And' | 'Or';
    onChange: (value: 'And' | 'Or') => void;
}) => {
    if (index === 0) {
        return <div style={{ width: 80, paddingLeft: 8, flexShrink: 0 }} />;
    }

    return (
        <div style={{ width: 80, paddingLeft: 8, flexShrink: 0 }}>
            <Select
                value={value || 'And'}
                onChange={onChange}
                style={{ width: 70 }}
                size="small"
                options={[
                    { value: 'And', label: 'И' },
                    { value: 'Or', label: 'ИЛИ' },
                ]}
            />
        </div>
    );
});

// Компонент переключателя типа значения
export const ValueTypeSwitch = React.memo(({
    value,
    onChange
}: {
    value: RightValueType;
    onChange: (value: RightValueType) => void;
}) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#666' }} />
            <Switch
                checked={value === 'expression'}
                checkedChildren="Выр"
                unCheckedChildren="Знч"
                onChange={(checked) => onChange(checked ? 'expression' : 'value')}
                size="small"
            />
            <span style={{ fontSize: '12px', color: '#666' }} />
        </div>
    );
});