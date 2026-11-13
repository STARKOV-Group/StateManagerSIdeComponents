import { useCallback } from 'react';

export interface GridRowData {
    index: number;
    rowNumber: number;
    propertyName: string;
}

export const useGridSelection = () => {
    // Извлечение данных из DOM-строки
    const extractRowData = useCallback((rowElement: HTMLElement): GridRowData | null => {
        const indexAttr = rowElement.getAttribute('index');
        if (indexAttr == null) return null;

        const index = parseInt(indexAttr, 10);
        if (isNaN(index)) return null;

        return {
            index,
            rowNumber: index + 1, 
            propertyName: ''
        };
    }, []);

    // Получение текущей выбранной строки
    const getSelectedRow = useCallback((): GridRowData | null => {
        const selectedRow = document.querySelector('.rx-grid-editor__row_selected') as HTMLElement;
        if (!selectedRow) {
            console.warn('Нет выбранной строки');
            return null;
        }
        return extractRowData(selectedRow);
    }, [extractRowData]);

    return {
        getSelectedRow,
    };
};