import { Button, Select } from "antd";
import React, { useState, useRef, useEffect, useMemo, useCallback, KeyboardEvent } from "react";
import { CalculateFrom, IPropertyDto, IPropertySelection } from "./types";
import { CloseOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigationCache } from "../../context/NavigationCacheContext";

interface PropertySelectorProps {
  label?: string
  record: IPropertySelection;
  onSelect: (property: IPropertyDto, changedIndex: number) => void;
  onRemove: (changedIndex?: number) => void;
}

interface SelectedPropertyItem {
  Name: string;
  PropertyGuid: string;
  PropertyNameGuid: string;
  ChildProperties?: IPropertyDto[]
}

const PropertySelector: React.FC<PropertySelectorProps> = React.memo(({
  label,
  record,
  onSelect,
  onRemove,
}) => {
  const { getCachedProperties } = useNavigationCache();
  const [selectedProperties, setSelectedProperties] = useState<SelectedPropertyItem[]>([]);
  const selectedPropertiesRef = useRef<SelectedPropertyItem[]>([]);
  selectedPropertiesRef.current = selectedProperties;

  // Функция для получения цепочки свойств до коллекции
  const getPropertyChainToShow = useCallback((): IPropertyDto[] => {
    if (!record.PropertyChain || record.PropertyChain.length === 0) {
      return [];
    }

    if (record.IsCollectionItem) {
      const parentGuidsChain = record.ParentPropertyGuid?.split('|') || [];
      let skipCollectionGuids: string[] = [];
      if (record.ParentId > 0 && parentGuidsChain.length > 0)
        skipCollectionGuids = record.SelectedProperties.slice(0, parentGuidsChain?.length);
      return record.PropertyChain.filter(s => !skipCollectionGuids.includes(s.PropertyGuid))
    }

    return record.PropertyChain;
  }, [record.PropertyChain, record.IsCollectionItem]);

  const initProperties = useCallback(() => {

    const parentGuidsChain = record.ParentPropertyGuid?.split('|') || [];
    const propertyChain = getPropertyChainToShow();

    if (propertyChain.length > 0) {
      const propertyNames = propertyChain.map(p => {
        return {
          Name: p.LocalisedName || p.Name || '',
          PropertyGuid: p.PropertyGuid || '',
          PropertyNameGuid: p.PropertyNameGuid || '',
          ChildProperties: getCachedProperties(p.ParentGuid || '') || []
        };
      });

      if (record.CalculateFrom === CalculateFrom.Function) {
        setSelectedProperties(propertyNames);
      } else if (canSelectMoreProperties(record.PropertyChain.length - 1)) {
        const lastPropGuid = propertyChain[propertyChain.length - 1]?.PropertyGuid || '';
        setSelectedProperties([...propertyNames, {
          Name: '',
          PropertyGuid: '',
          PropertyNameGuid: '',
          ChildProperties: getCachedProperties(lastPropGuid)
        }]);
      } else {
        setSelectedProperties(propertyNames);
      }
    } else if (record.ParentId > 0 && parentGuidsChain.length > 0) {
      const collectionKey = parentGuidsChain[parentGuidsChain.length - 1];
      setSelectedProperties([{
        Name: '',
        PropertyGuid: '',
        PropertyNameGuid: '',
        ChildProperties: getCachedProperties(collectionKey) || []
      }]);
    }
    else {
      setSelectedProperties([{
        Name: '',
        PropertyGuid: '',
        PropertyNameGuid: '',
        ChildProperties: getCachedProperties('') || []
      }]);
    }
  }, [record.IsLoad, record.PropertyChain.length, record.CalculateFrom, record.ParentPropertyGuid, getCachedProperties, getPropertyChainToShow]);

  useEffect(() => {
    initProperties();
  }, [record.IsLoad, record.CalculateFrom,
  record.PropertyChain.map(p => p.PropertyNameGuid || `${p.PropertyGuid}|${p.Name}`).join(','),
  record.ParentPropertyGuid]);

  // Проверка возможности выбора дополнительных свойств
  const canSelectMoreProperties = useCallback((index: number) => {
    if (record.SelectedProperties.length === 0)
      return true;

    const lastProp = record.PropertyChain[index];
    return lastProp?.PropertyType === 'Navigation' ||
      lastProp?.PropertyType === 'Collection' && record.IsCollectionItem && record.PropertyChain.filter(m => m.PropertyType == 'Collection').length == 1;
  }, [record.PropertyChain, record.SelectedProperties.length, record.IsCollectionItem]);

  const canDeleteItem = useMemo(() => {
    // Для элементов коллекций
    if (record.IsCollectionItem) {
      const collectionIndex = record.PropertyChain.findIndex(s => s.PropertyType === 'Collection');
      return record.PropertyChain.length > collectionIndex + 1;
    }

    // Для функций
    if (record.CalculateFrom === CalculateFrom.Function) {
      return record.PropertyChain?.length > 0;
    }

    // Для свойств: можно удалять если есть выбранные свойства и нет дочерних элементов
    return (
      record.PropertyChain?.length > 0 &&
      !(record.ChildSelections && record.ChildSelections.length > 0)
    );
  }, [record.IsCollectionItem,
  record.PropertyChain,
  record.ChildSelections,
  record.CalculateFrom,
  record.SelectedProperties
  ]);

  const handleSelect = useCallback(async (propertyNameGuid: string, label: string, index: number) => {
    if (!propertyNameGuid)
      return;

    const currentProperties = selectedPropertiesRef.current;
    const currentItem = currentProperties[index];
    if (!currentItem) {
      console.error(`Элемент на позиции ${index} не найден`);
      return;
    }

    const availableForLevel = currentItem?.ChildProperties || [];
    const property = availableForLevel.find(s => s.PropertyNameGuid === propertyNameGuid && s.LocalisedName == label);
    if (!property) {
      const parentGuid = selectedProperties[index - 1]?.PropertyGuid || '';
      const cachedProperties = getCachedProperties(parentGuid) || [];
      const propertyFromCache = cachedProperties.find(s => s.PropertyNameGuid === propertyNameGuid && s.LocalisedName == label);

      if (propertyFromCache) {
        onSelect(propertyFromCache, index);
        return;
      }
    }

    if (!property) {
      console.error('Свойство не найдено в доступных для уровня:', propertyNameGuid);
      return;
    }

    onSelect(property, index);
  }, [onSelect, record.CalculateFrom, record.IsCollectionItem]);

  const getOptionsForSelect = useCallback((index: number) => {
    const childProperties = selectedProperties[index]?.ChildProperties || [];
    return childProperties.map(prop => ({
      value: prop.PropertyNameGuid ?? "",
      label: prop.LocalisedName || prop.Name || 'Неизвестно',
      title: prop.LocalisedName || prop.Name || 'Неизвестно'
    }));
  }, [record.IsLoad, selectedProperties]);

  const renderLabel = () => {
    if (!label)
      return null;

    return (
      <div
        className="control-label control-label_required-hidden control-label_position_left-center"
        style={{ minWidth: '168px' }}
      >
        <label className="control-label__label control-label__label_required-hidden control-label__label_position_left-center">
          <span className="control-label__label-text headered-property-editor__label-text">
            {label}
          </span>
        </label>
      </div>
    );
  };

  const handleRemove = useCallback(async (event: KeyboardEvent, index: number) => {
    if (event.key === 'Backspace') {
      onRemove(index);
    }
  }, [onRemove]);

  return (
    <div style={{ width: '100%', margin: 0, padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        {renderLabel()}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lookup navigation-property-editor" style={{ width: '100%' }}>
            <div className="lookup-input-textbox lookup-textbox lookup_bordered-bottom" style={{ padding: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                overflowX: 'auto',
                overflowY: 'hidden',
                paddingBottom: '4px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                  minWidth: 'min-content',
                }}>
                  {selectedProperties.map((selectedValue, index) => {
                    return (
                      <React.Fragment key={index}>
                        <Select
                          onKeyDown={(event) => handleRemove(event, index)}
                          variant="borderless"
                          showSearch
                          labelInValue
                          value={{
                            value: selectedValue.PropertyNameGuid,
                            label: selectedValue.Name
                          }}
                          filterOption={(input: string, option?: { label: string; value: string }) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          pointer-events={'none'}
                          placement="topLeft"

                          suffixIcon={null}
                          prefix={<RightOutlined style={{
                            fontSize: '12px',
                            color: '#666',
                            transition: 'transform 0.3s'
                          }} />}
                          placeholder={index === 0 ? "Свойство" : "Далее"}
                          options={getOptionsForSelect(index)}
                          onChange={(value) => handleSelect(value.value, value.label, index)}
                          disabled={record.ChildSelections && record.ChildSelections.length > 0}
                          style={{
                            minWidth: '140px',
                            flexShrink: 0,
                          }}
                          getPopupContainer={(trigger) => document.querySelector('.modal-view__content') || document.body}
                        />
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {canDeleteItem && (
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => onRemove()}
            danger
          />
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  const prevPropertyChainKey = prevProps.record.PropertyChain
    .map(p => p.PropertyNameGuid || `${p.PropertyGuid}|${p.Name}`)
    .join(',');

  const nextPropertyChainKey = nextProps.record.PropertyChain
    .map(p => p.PropertyNameGuid || `${p.PropertyGuid}|${p.Name}`)
    .join(',');

  const prevKey = `${prevProps.record.Id}-${prevProps.record.CalculateFrom}-${prevPropertyChainKey}-${prevProps.record.IsLoad}`;
  const nextKey = `${nextProps.record.Id}-${nextProps.record.CalculateFrom}-${nextPropertyChainKey}-${nextProps.record.IsLoad}`;

  const isEqual = prevKey === nextKey;
  return isEqual;
});

export default PropertySelector;