import { IRemoteComponentCardApi, IRemoteControlInfo } from "@directum/sungero-remote-component-types";
import { CalculateFrom, IPropertySelection } from "../CommonComponents/types";
import { useCallback, useEffect, useState, useMemo } from "react";
import React from "react";
import { Button, message, Modal, Spin } from "antd";
import { PlusOutlined } from '@ant-design/icons';
import { useApi } from "../../functions/fetchMetadata";
import { useSettings } from "../../context/SettingsContext";
import { useNavigationCache } from "../../context/NavigationCacheContext";
import { IRootEntitySetting, ICriteriaExpression, ICondition, StateName } from "./types";
import { OFFICIALDOCUMENT_ENTITY_TYPE_GUID, TableHeader } from "./Constants";
import { useStateEditor } from "../../functions/UseStateEditor";
import { generateUUID } from "../../functions/CommonFunctions";
import ConditionRow from "./ConditionRow";

interface Props {
    api: IRemoteComponentCardApi,
    controlInfo: IRemoteControlInfo,
}

export const Criteria: React.FC<Props> = ({ api, controlInfo }) => {
    const { state: settingsState, loadSettings } = useSettings();
    const { fetchEntityMetadata } = useApi();
    const { setCachedProperties } = useNavigationCache();

    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    const [entityTypeId, setEntityTypeId] = useState('');
    const [rootDocTypeGuid, setRootDocTypeGuid] = useState<string>(OFFICIALDOCUMENT_ENTITY_TYPE_GUID);
    const [isRootPropertiesLoaded, setIsRootPropertiesLoaded] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const [isValidateExpression, setIsValidateExpression] = useState(false);
    const [isEnabled, setIsEnabled] = useState(true);


    const createEmptySelection = useCallback((): IPropertySelection => ({
        Id: '',
        SelectedProperties: [],
        MappingName: '',
        ParentId: 0,
        PropertyChain: [],
        CalculateFrom: CalculateFrom.Property,
        IsCollectionItem: false,
        ChildSelections: [],
        IsLoad: true,
        ParentPropertyGuid: rootDocTypeGuid
    }), [rootDocTypeGuid]);

    const createEmptyCondition = useCallback((): ICondition => {
        return {
            id: generateUUID(),
            leftProperty: createEmptySelection(),
            operator: 'IsEqual',
            rightValue: '',
            rightType: 'value',
            rightPropertyType: '',
            rightPropertyGuid: '',
            rightExpression: createEmptySelection()
        };
    }, [createEmptySelection]);

    const {
        selectedRowName,
        isModalVisible,
        expression,
        setExpression,
        openEditor,
        closeEditor,
        saveEditor
    } = useStateEditor(createEmptyCondition, api, controlInfo, setIsValidateExpression);

    const openVisibility = useCallback(() => openEditor(StateName.Visability), [openEditor]);
    const openRequired = useCallback(() => openEditor(StateName.Required), [openEditor]);
    const openEnabled = useCallback(() => openEditor(StateName.Enabled), [openEditor]);

    const successMessage = (message: string) => {
        messageApi.open({
            type: 'success',
            content: message,
        });
    };

    const errorMessage = (message: string) => {
        messageApi.open({
            type: 'error',
            content: message,
        });
    };

    const warningMessage = (message: string) => {
        messageApi.open({
            type: 'warning',
            content: message,
        });
    };


    const handleControlUpdate = useCallback(() => {
        const curentEntity = api.getEntity<IRootEntitySetting>();
        setEntityTypeId(curentEntity[controlInfo.propertyName ?? ""]);
        setIsEnabled(curentEntity.State.IsEnabled);
    }, [api]);

    useEffect(() => {
        const initializeData = async () => {
            try {
                const initialEntity = api.getEntity<IRootEntitySetting>();
                const initialDocTypeId = initialEntity[controlInfo.propertyName ?? ""];

                api.onControlUpdate = handleControlUpdate;
                setEntityTypeId(initialDocTypeId);
                setIsEnabled(initialEntity.State.IsEnabled);

                await loadSettings(api);

                setIsSettingsLoaded(true);
            } catch (error) {
                console.error('Ошибка инициализации:', error);
            }
        };

        initializeData();

        return () => {
            api.onControlUpdate = undefined;
        };
    }, [api, handleControlUpdate, loadSettings]);

    // Загрузка корневых свойств.
    const loadRootProperties = useCallback(async () => {
        if (!entityTypeId) {
            console.warn('Не указан тип документа для загрузки свойств');
            return;
        }
        setIsRootPropertiesLoaded(false);
        try {
            const metadata = await fetchEntityMetadata(entityTypeId);

            if (metadata.EntityGuid.length > 0) {
                setRootDocTypeGuid(metadata.EntityGuid);
            }

            setCachedProperties('', metadata?.Properties || []);
            setIsRootPropertiesLoaded(true);
        } catch (error) {
            console.error('Ошибка загрузки корневых свойств:', error);
            errorMessage("Не удалось загрузить свойства документа. Перезагрузите карточку.");
        }
    }, [fetchEntityMetadata, setCachedProperties, entityTypeId]);

    useEffect(() => {
        if (isSettingsLoaded && settingsState.settings?.Url) {
            loadRootProperties();
        }
    }, [isSettingsLoaded, settingsState.settings?.Url, entityTypeId, loadRootProperties]);

    const addCondition = () => {
        setExpression(prev => {
            const conditions = [...prev.conditions, createEmptyCondition()];
            const conditionsWithOperators: ICondition[] = conditions.map((condition, idx) => {
                if (idx === 0) {
                    const { logicalOperator, ...rest } = condition;
                    return rest as ICondition;
                } else if (condition.logicalOperator === undefined) {
                    return { ...condition, logicalOperator: 'And' as const };
                }
                return condition;
            });

            const newExpression: ICriteriaExpression = { conditions: conditionsWithOperators };
            return newExpression;
        });
    };

    const handleSave = () => {
        setIsValidateExpression(true);
        const errors = validationErrors;
        if (errors.size == 0)
            saveEditor();
    };

    const copyExpressionHandler = async () => {
        if (!navigator.clipboard?.writeText) {
            errorMessage('Буфер обмена недоступен в этом окружении');
            return;
        }

        if (expression.conditions.length === 0) {
            warningMessage('Нет условий для копирования');
            return;
        }

        try {
            await navigator.clipboard.writeText(JSON.stringify(expression));
            successMessage("Данные скопированы в буфер обмена");
        }
        catch (ex) {
            errorMessage("Ошибка при копировании данных");
            console.error(ex);
        }
    };

    const pasteExpressionHandler = async () => {
        try {
            if (!navigator.clipboard?.readText) {
                errorMessage('Буфер обмена недоступен в этом окружении');
                return;
            }

            const text = await navigator.clipboard.readText();
            if (!text)
                return;

            const parsedExpression = JSON.parse(text) as ICriteriaExpression;
            if (!parsedExpression || !Array.isArray(parsedExpression.conditions)) {
                errorMessage('Некорректный формат данных');
                return;
            }

            const isAnotherDocType = parsedExpression.conditions.some(s =>
                s?.leftProperty?.ParentPropertyGuid &&
                s.leftProperty.ParentPropertyGuid !== rootDocTypeGuid);

            if (isAnotherDocType) {
                errorMessage('Выражение относится к другому типу документа');
                return;
            }

            setExpression(parsedExpression);
            setIsValidateExpression(false);
        }
        catch (ex) {
            errorMessage("Ошибка при заполнении данных");
            console.error(ex);
        }
    };

    const validationErrors = useMemo(() => {
        const errors = new Map<string, string>();
        for (const c of expression.conditions) {
            if (!c.leftProperty?.PropertyChain?.length) {
                errors.set(c.id, 'Не выбрано свойство');
                continue;
            }
            const needsRightValue = !['IsNull', 'IsNotNull'].includes(c.operator);
            if (!needsRightValue)
                continue;

            if (c.rightType === 'value') {
                const valueStr = String(c.rightValue ?? '');
                if (valueStr.length === 0 || valueStr.split('|').filter(v => v).length === 0) {
                    errors.set(c.id, 'Не заполнено значение');
                }
            } else if (c.rightType === 'expression' && !c.rightExpression?.PropertyChain?.length) {
                errors.set(c.id, 'Не выбрано свойство в выражении');
            }
        }
        return errors;
    }, [expression]);

    return (
        <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <Button onClick={() => openVisibility()} disabled={!isEnabled}>
                    Условия видимости
                </Button>
                <Button onClick={() => openRequired()} disabled={!isEnabled}>
                    Условия обязательности
                </Button>
                <Button onClick={() => openEnabled()} disabled={!isEnabled}>
                    Условия доступности
                </Button>
            </div>

            {contextHolder}
            <Modal
                zIndex={9999}
                title={`Задать критерии ${selectedRowName}`}
                centered
                open={isModalVisible}
                onOk={handleSave}
                onCancel={closeEditor}
                footer={[
                    <Button key="copy" onClick={copyExpressionHandler}>
                        Копировать
                    </Button>,
                    <Button key="paste" onClick={pasteExpressionHandler}>
                        Вставить
                    </Button>,
                    <Button key="back" onClick={closeEditor} type="primary">Отмена</Button>,
                    <Button key="submit" onClick={handleSave} type="primary">Ок</Button>
                ]}
                width={1500}
            >
                {isValidateExpression && validationErrors.size > 0 && <div style={{ color: '#ff4d4f', fontSize: 12 }}>{"Заполнены не все поля"}</div>}
                <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: 16, flexShrink: 0 }}>
                        {isRootPropertiesLoaded
                            ? <Button
                                type="dashed"
                                onClick={() => addCondition()}
                                icon={<PlusOutlined />}
                                block
                            >
                                Добавить условие
                            </Button>
                            : <Spin />}
                    </div>

                    <TableHeader />

                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        minHeight: 0,
                        maxHeight: 'calc(100vh - 250px)'
                    }}>
                        {expression.conditions
                            .map((condition, index) =>
                                <ConditionRow
                                    key={condition.id}
                                    condition={condition}
                                    index={index}
                                    showError={isValidateExpression && (validationErrors.get(condition.id)?.length ?? 0) > 0}
                                    rootDocTypeGuid={rootDocTypeGuid}
                                    setExpression={setExpression}
                                    createEmptySelection={createEmptySelection} />)
                        }

                        {expression.conditions.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#999', padding: 40, backgroundColor: '#fafafa', borderRadius: 4 }}>
                                Нет условий. Нажмите "Добавить условие" для создания критерия отбора
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Criteria;