import { useCallback, useState } from 'react';
import { message } from 'antd';
import { ICondition, ICriteriaExpression, IRootEntitySetting, IRowSetting, StateName } from '../controls/CriteriasControl/types';
import { useGridSelection } from './UseGridSelection';
import { IChildEntityCollection, IRemoteComponentCardApi, IRemoteControlInfo } from '@directum/sungero-remote-component-types';



export const useStateEditor = (
createEmptyCondition: () => ICondition, 
api: IRemoteComponentCardApi, 
controlInfo: IRemoteControlInfo, 
setIsValidateExpression: React.Dispatch<React.SetStateAction<boolean>>
) => {
    const { getSelectedRow } = useGridSelection();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [expression, setExpression] = useState<ICriteriaExpression>({ conditions: [] });
    const [selectedRow, setSelectedRow] = useState<number>(0);
    const [selectedRowName, setSelectedRowName] = useState<string>("");
    const [stateName, setStateName] = useState<StateName | null>();

    const openEditor = useCallback((stateName: StateName,) => {
        const selectedRow = getSelectedRow();

        if (!selectedRow || selectedRow.rowNumber == 0) {
            console.warn('Нет выбранной строки');
            message.warning('Выберите строку в коллекции');
            return;
        }

        setIsValidateExpression(false);
        setSelectedRow(selectedRow.rowNumber);
        setStateName(stateName);

        const currentEntity = api.getEntity<IRootEntitySetting>();
        const collectionName = "PropertySettings";
        const collection = currentEntity[collectionName as keyof IRootEntitySetting];

        if (!collection)
            console.warn(`не удалось получить коллекцию ${collectionName}`);

        let rows: IRowSetting[] = [];
        collection?.forEach((item: IRowSetting) => rows.push(item));

        let parsedConditions: ICriteriaExpression = { conditions: [] };
        const rowData = rows.find(row => row.RowNumber == selectedRow.rowNumber);

        if (!rowData) {
            console.warn('rowData не найден по RowNumber =', selectedRow.rowNumber);
            return;
        }

        setSelectedRowName(rowData.LocalisedName ?? '');

        try {
            let parsed: any;
            if (stateName == StateName.Visability && rowData.VisabilityCriteria) {
                parsed = JSON.parse(rowData.VisabilityCriteria);
            }
            else if (stateName == StateName.Enabled && rowData.EnabledCriteria) {
                parsed = JSON.parse(rowData.EnabledCriteria);
            }
            else if (stateName == StateName.Required && rowData.RequiredCriteria) {
                parsed = JSON.parse(rowData.RequiredCriteria);
            }
            else if (stateName == StateName.DisplayName && rowData.DisplayValueCriteria) {
                parsed = JSON.parse(rowData.DisplayValueCriteria);
            }

            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.conditions)) {
                parsedConditions = parsed as ICriteriaExpression;
            }
        } catch (error) {
            console.error('Ошибка парсинга условий:', error);
        }

        // Если нет условий или они пустые
        if (!parsedConditions.conditions || parsedConditions.conditions.length === 0) {
            parsedConditions = {
                conditions: [createEmptyCondition()]
            };
        }

        setExpression(parsedConditions);
        setIsModalVisible(true);
    }, [getSelectedRow, createEmptyCondition, setIsValidateExpression]);

    const closeEditor = useCallback(() => {
        setIsModalVisible(false);
        setSelectedRow(0);
        setStateName(null);
        setExpression({ conditions: [] });
        setIsValidateExpression(false);
    }, [setIsModalVisible, setSelectedRow, setStateName, setExpression, setIsValidateExpression]);

    const saveEditor = useCallback(async () => {
        try {

            const conditionsJson = JSON.stringify(expression);

            const currentEntity = api.getEntity<IRootEntitySetting>();
            const collectionName = "PropertySettings";
            const collection = currentEntity[collectionName as keyof IRootEntitySetting];

            if (!collection) {
                console.error('Коллекция не найдена');
                return;
            }

            let PropertySettings = currentEntity[collectionName as keyof IRootEntitySetting] as IChildEntityCollection<IRootEntitySetting, IRowSetting>;
            if (stateName == StateName.Visability)
                PropertySettings.find(s => s.RowNumber == selectedRow)?.changeProperty("VisabilityCriteria", conditionsJson);
            if (stateName == StateName.Enabled)
                PropertySettings.find(s => s.RowNumber == selectedRow)?.changeProperty("EnabledCriteria", conditionsJson);
            if (stateName == StateName.Required)
                PropertySettings.find(s => s.RowNumber == selectedRow)?.changeProperty("RequiredCriteria", conditionsJson);
            if (stateName == StateName.DisplayName)
                PropertySettings.find(s => s.RowNumber == selectedRow)?.changeProperty("DisplayNameCriteria", conditionsJson);

            closeEditor();
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            message.error('Ошибка сохранения условий');
        }
    }, [expression, closeEditor, selectedRow, stateName]);

    return {
        selectedRowName,
        isModalVisible,
        expression,
        setExpression,
        openEditor,
        closeEditor,
        saveEditor
    };
};