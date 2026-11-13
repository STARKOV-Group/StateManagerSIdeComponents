import { Select, Button } from "antd";
import React, { useCallback, useMemo } from "react";
import PropertySelector from "../CommonComponents/PropertySelector";
import { USER_ENTITY_TYPE_GUID, EMPLOYEE_ENTITY_TYPE_GUID, ROLE_OPERATOR_NAVIGATION_GUID, LogicalOperatorSelect, ValueTypeSwitch, ALL_OPERATORS, getAvailableOperators } from "./Constants";
import { CriteriaValueEditor } from "./CriteriaValueEditor";
import { ComparisonOperator, ICondition, ICriteriaExpression, RightValueType } from "./types";
import { IPropertySelection, IPropertyDto } from "../CommonComponents/types";
import { useNavigationCache } from "../../context/NavigationCacheContext";
import { useApi } from "../../functions/fetchMetadata";
import { DeleteOutlined } from '@ant-design/icons';

interface Props {
    condition: ICondition;
    index: number;
    showError: boolean;
    rootDocTypeGuid: string;
    setExpression: React.Dispatch<React.SetStateAction<ICriteriaExpression>>;
    createEmptySelection: () => IPropertySelection
};

const getAvailableOperatorsForCondition = (condition: ICondition) => {
    const lastProperty = condition.leftProperty.PropertyChain[condition.leftProperty.PropertyChain.length - 1];
    if (!lastProperty)
        return ALL_OPERATORS;

    const availableOps = getAvailableOperators(lastProperty.PropertyType, lastProperty.PropertyGuid);
    return ALL_OPERATORS.filter(op => availableOps.includes(op.value));
};

const truncateSelection = (selection: IPropertySelection, index?: number): { selected: string[], chain: IPropertyDto[] } => {
    const selected = [...selection.SelectedProperties];
    const chain = [...selection.PropertyChain];

    if (index === undefined || selected.length === index) {
        selected.pop();
        chain.pop();
    } else {
        selected.splice(index);
        chain.splice(index);
    }

    return { selected, chain };
};

export const ConditionRow = React.memo<Props>(({ condition, index, showError, rootDocTypeGuid, setExpression, createEmptySelection }) => {
    const { getCachedProperties, setCachedProperties, hasCachedProperties } = useNavigationCache();
    const { fetchEntityMetadata } = useApi();

    const lastProperty = condition.leftProperty.PropertyChain[condition.leftProperty.PropertyChain.length - 1];
    const needsRightValue = !['IsNull', 'IsNotNull'].includes(condition.operator);
    const isMultiSelect = condition.operator === 'IncludedIn' || condition.operator === 'NotIncludedIn';
    const availableOperators = useMemo(() => getAvailableOperatorsForCondition(condition), [condition.leftProperty.PropertyChain]);
    const isExpressionMode = condition.rightType === 'expression';

    let navigationGuid = lastProperty?.PropertyGuid;
    if (condition.operator === 'IncludedInRole' &&
        (lastProperty?.PropertyGuid === USER_ENTITY_TYPE_GUID ||
            lastProperty?.PropertyGuid === EMPLOYEE_ENTITY_TYPE_GUID)) {
        navigationGuid = ROLE_OPERATOR_NAVIGATION_GUID;
    }

    //#region Хуки для обработки контролов строки. 

    // Закгрузка вложенных свойств.
    const loadChildProperties = useCallback(async (guid: string) => {
        if (hasCachedProperties(guid)) {
            return getCachedProperties(guid)!;
        }

        try {
            const metadata = await fetchEntityMetadata(guid);
            const properties = metadata.Properties || [];
            setCachedProperties(guid, properties);
            return properties;
        } catch (error) {
            console.error(`Ошибка загрузки свойств Navigation для ${guid}:`, error);
            return [];
        }
    }, [fetchEntityMetadata, getCachedProperties, hasCachedProperties, setCachedProperties]);

    const updateLogicalOperator = useCallback((conditionId: string, operator: 'And' | 'Or') => {
        setExpression(prev => {
            const newExpression: ICriteriaExpression = {
                ...prev,
                conditions: prev.conditions.map(c =>
                    c.id === conditionId
                        ? { ...c, logicalOperator: operator }
                        : c
                )
            };

            return newExpression;
        });
    }, [setExpression]);

    // Обновление левой части
    const handleLeftPropertySelect = useCallback(async (conditionId: string, selection: IPropertySelection, property: IPropertyDto, index: number) => {
        const newSelected = selection.SelectedProperties.slice(0, index);
        const newPropertyChain = selection.PropertyChain.slice(0, index);

        newSelected.push(property.PropertyGuid ?? property.Name);
        newPropertyChain.push(property);

        if (property.PropertyGuid && (property.PropertyType === 'Navigation' || property.PropertyType === 'Collection')) {
            await loadChildProperties(property.PropertyGuid);
        }

        setExpression(prev => {
            const newExpression: ICriteriaExpression = {
                ...prev,
                conditions: prev.conditions.map(c =>
                    c.id === conditionId
                        ? {
                            ...c,
                            leftProperty: {
                                ...c.leftProperty,
                                SelectedProperties: newSelected,
                                PropertyChain: newPropertyChain,
                                IsLoad: true
                            },
                            operator: 'IsEqual' as ComparisonOperator,
                            rightValue: '',
                            rightType: 'value' as const,
                            rightPropertyType: '',
                            rightPropertyGuid: ''
                        }
                        : c
                )
            };

            return newExpression;
        });
    }, [setExpression, loadChildProperties]);

    // Удаление свойства
    const handleRemoveProperty = useCallback((conditionId: string, selection: IPropertySelection, index?: number) => {
        if (!selection)
            return;

        const { selected, chain } = truncateSelection(selection, index);

        setExpression(prev => ({
            ...prev,
            conditions: prev.conditions.map(c =>
                c.id === conditionId
                    ? {
                        ...c,
                        leftProperty: {
                            ...c.leftProperty,
                            SelectedProperties: selected,
                            PropertyChain: chain,
                            IsLoad: true
                        },
                        operator: 'IsEqual' as ComparisonOperator,
                        rightValue: '',
                        rightType: 'value' as const,
                        rightPropertyType: '',
                        rightPropertyGuid: ''
                    }
                    : c
            )
        }));
    }, [setExpression]);

    // Обновление оператора
    const updateOperator = useCallback((conditionId: string, operator: ComparisonOperator) => {
        setExpression(prev => {
            const newExpression: ICriteriaExpression = {
                ...prev,
                conditions: prev.conditions.map(c =>
                    c.id === conditionId
                        ? {
                            ...c,
                            operator,
                            rightValue: '',
                            rightType: 'value' as const,
                            rightPropertyType: '',
                            rightPropertyGuid: '',
                            rightExpression: undefined
                        }
                        : c
                )
            };

            return newExpression;
        });
    }, [setExpression]);

    // Обновление правой части (выражение)
    const updateRightExpression = useCallback(async (conditionId: string, selection: IPropertySelection, property: IPropertyDto, index: number) => {
        const newSelected = selection.SelectedProperties.slice(0, index);
        const newPropertyChain = selection.PropertyChain.slice(0, index);

        newSelected.push(property.PropertyGuid ?? property.Name);
        newPropertyChain.push(property);

        if (property.PropertyGuid && (property.PropertyType === 'Navigation' || property.PropertyType === 'Collection')) {
            await loadChildProperties(property.PropertyGuid);
        }

        setExpression(prev => {
            const newExpression: ICriteriaExpression = {
                ...prev,
                conditions: prev.conditions.map(c => {
                    if (c.id !== conditionId) return c;

                    const currentRightExpression = c.rightExpression || createEmptySelection();

                    return {
                        ...c,
                        rightExpression: {
                            ...currentRightExpression,
                            SelectedProperties: newSelected,
                            PropertyChain: newPropertyChain,
                            IsLoad: true
                        },
                        rightValue: '',
                        rightType: c.rightType,
                        rightPropertyType: property.PropertyType,
                        rightPropertyGuid: property.PropertyGuid
                    };
                })
            };

            return newExpression;
        });
    }, [loadChildProperties, createEmptySelection, setExpression]);

    // Удаление свойства из выражения
    const handleRemoveRightExpression = useCallback((conditionId: string, selection: IPropertySelection, index?: number) => {
        if (!selection)
            return;

        const { selected, chain } = truncateSelection(selection, index);

        setExpression(prev => ({
            ...prev,
            conditions: prev.conditions.map(c => {
                if (c.id !== conditionId)
                    return c;

                const currentRightExpression = c.rightExpression || createEmptySelection();
                return {
                    ...c,
                    rightExpression: {
                        ...currentRightExpression,
                        SelectedProperties: selected,
                        PropertyChain: chain,
                        IsLoad: true
                    }
                };
            })
        }));
    }, [createEmptySelection, setExpression]);

    // Обновление типа значения (значение / выражение)
    const updateRightType = useCallback((conditionId: string, rightType: RightValueType) => {
        setExpression(prev => {
            const newExpression: ICriteriaExpression = {
                ...prev,
                conditions: prev.conditions.map(c =>
                    c.id === conditionId
                        ? { ...c, rightType, rightValue: '' }
                        : c
                )
            };

            return newExpression;
        });
    }, [setExpression])

    // Обновление правой части (значение)
    const updateRightValue = useCallback((conditionId: string, value: string, propertyType?: string, propertyGuid?: string) => {
        setExpression(prev => {
            const newExpression: ICriteriaExpression = {
                ...prev,
                conditions: prev.conditions.map(c =>
                    c.id === conditionId ? {
                        ...c,
                        rightValue: value,
                        rightType: c.rightType,
                        rightPropertyType: propertyType || c.rightPropertyType,
                        rightPropertyGuid: propertyGuid || c.rightPropertyGuid
                    } : c
                )
            };

            return newExpression;
        });
    }, [setExpression]);

    const removeCondition = useCallback((id: string) => {
        setExpression(prev => {
            const newConditions = prev.conditions.filter(c => c.id !== id);

            const conditionsWithOperators: ICondition[] = newConditions.map((condition, idx) => {
                if (idx === 0) {
                    const { logicalOperator, ...rest } = condition;
                    return rest as ICondition;
                }
                return condition;
            });

            const newExpression: ICriteriaExpression = { conditions: conditionsWithOperators };
            return newExpression;
        });
    }, [setExpression]);

  

    //#endregion

    const handleLogicalOperatorChange = useCallback((operator: 'And' | 'Or') => {
        updateLogicalOperator(condition.id, operator)
    }, [condition.id, updateLogicalOperator]);

      const handleValueTypeChange = useCallback((newType: RightValueType) => {
        updateRightType(condition.id, newType)
      },[condition.id, updateRightType]);

    if (!condition || !condition.leftProperty || !condition.leftProperty.PropertyChain || !Array.isArray(condition.leftProperty.PropertyChain)) {
        return null;
    }

    return (
        <div
            style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                marginBottom: 8,
                padding: '12px 8px',
                backgroundColor: '#fafafa',
                borderRadius: 4,
                border: '1px solid #e8e8e8'
            }}
        >

            <LogicalOperatorSelect
                index={index}
                value={condition.logicalOperator}
                onChange={handleLogicalOperatorChange}
            />

            <div style={{ flex: 2, border: showError && condition.leftProperty?.PropertyChain?.length === 0 ? '1px solid #ff4d4f' : undefined }}>
                <PropertySelector
                    label=""
                    record={condition.leftProperty}
                    onSelect={(prop, idx) => handleLeftPropertySelect(condition.id, condition.leftProperty, prop, idx)}
                    onRemove={(idx) => handleRemoveProperty(condition.id, condition.leftProperty || createEmptySelection(), idx)}
                />
            </div>

            <div style={{ flex: 1 }}>
                <Select
                    value={condition.operator}
                    onChange={(value) => updateOperator(condition.id, value)}
                    style={{ width: '100%' }}
                    options={availableOperators}
                />
            </div>

            {needsRightValue && (
                <div style={{ flex: 2 }}>
                    {isExpressionMode ? (
                        <div style={{ flex: 2, border: showError && !condition.rightExpression?.PropertyChain?.length ? '1px solid #ff4d4f' : undefined }}>
                            <PropertySelector
                                label=""
                                record={condition.rightExpression || createEmptySelection()}
                                onSelect={(prop, idx) => updateRightExpression(
                                    condition.id,
                                    condition.rightExpression || createEmptySelection(),
                                    prop,
                                    idx
                                )}
                                onRemove={(idx) => handleRemoveRightExpression(condition.id, condition.rightExpression || createEmptySelection(), idx)}
                            />
                        </div>
                    ) : (
                        <div style={{
                            border: showError && !condition.rightValue ? '1px solid #ff4d4f' : '1px solid #e8e8e8',
                            borderRadius: '4px',
                            padding: '0 8px',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <CriteriaValueEditor
                                rootDocTypeGuid={rootDocTypeGuid}
                                property={lastProperty}
                                propertyGuid={navigationGuid}
                                value={condition.rightValue}
                                onChange={(newValue, propertyType, propertyGuid) =>
                                    updateRightValue(condition.id, newValue, propertyType, propertyGuid)
                                }
                                enabled={true}
                                isMultiSelect={isMultiSelect}
                            />
                        </div>
                    )}
                </div>
            )}

            {needsRightValue && (
                <div style={{ width: 80, display: 'flex', justifyContent: 'center' }}>
                    <ValueTypeSwitch
                        value={condition.rightType}
                        onChange={handleValueTypeChange}
                    />
                </div>
            )}

            {!needsRightValue && <div style={{ width: 80 }} />}

            <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeCondition(condition.id)}
                style={{ width: 32, flexShrink: 0 }}
            />
        </div>
    );
});

export default ConditionRow;
