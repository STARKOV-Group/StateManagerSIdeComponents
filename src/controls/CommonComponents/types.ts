import { IChildEntity, IChildEntityCollection, IEntity, INavigationPropertyValue } from '@directum/sungero-remote-component-types';

// Интерфейс для элемента коллекции свойств
export interface IPropertyCollection extends IChildEntity<IMappingSetting> {
  FullNamePath: string;
  PropertyType: string;
  PropertyGuid: string;
  LocalisedName: string;
  Mapping: string;
  CalculateFrom: CalculateFrom;
  IsCollectionItem: boolean;
  ParentMappingId: number;
}

// Интерфейс для типа документа
export interface IDocumentType {
  Value?: number;
}

export interface IExtendetEntity extends IEntity {
  [property: string]: any
}

// Основной интерфейс сущности маппинга
export interface IMappingSetting extends IExtendetEntity {
  IntegrationUrl: string
  User: string
  Password: string
  DocumentType?: IDocumentType
  PropertyCollection: IChildEntityCollection<IMappingSetting, IPropertyCollection>;
}

export interface IPropertyDisplayNameDto {
    Id: number,
    LocalisedName: string,
    CustomName: string,
}

// Метаданные свойства
export interface IPropertyMetadata {
  EntityId: number;
  EntityGuid: string;
  Properties: IPropertyDto[];
}

// DTO для свойства
export interface IPropertyDto {
  ParentGuid: string | null;
  PropertyGuid: string;
  PropertyNameGuid: string;
  Name: string;
  LocalisedName: string;
  PropertyType: string;
  CalculateFrom: CalculateFrom;
  ChildPropeties: IPropertyDto[],
  CalledFromEntityType: string
}

// Выбор свойства для отображения в UI
export interface IPropertySelection {
  Id: React.Key;
  SelectedProperties: string[];
  MappingName: string;
  PropertyChain: IPropertyDto[];
  CalculateFrom: CalculateFrom;
  IsCollectionItem?: boolean;
  ParentId: number;
  ParentPropertyGuid?: string;
  ChildSelections?: IPropertySelection[];
  IsLoad?: boolean;
}

// Параметры сервиса интеграции.
export interface IIntegrationSetting {
  Url: string;
  User: string;
  Password: string;
}

export interface ITaskParams extends IExtendetEntity {
  Id: number,
  Name: string,
  Parameter: INavigationPropertyValue,
  Description: string,
  IsCollection: boolean,
  IsRequeired: boolean,
  Unavailable: boolean,
  ExpressionPropertyGuid: string,
  ExpressionLocalName: string,
  ExpressionPropertyType: string,
  SelectedValue: string
}

export interface ITaskParamRow extends IChildEntity<IApprovalTask> {
  Id: number,
  Name: string,
  Parameter: INavigationPropertyValue,
  Description: string,
  IsCollection: boolean,
  IsRequeired: boolean,
  Disabled: boolean,
  Unavailable: boolean,
  NavigationTypeGuid: string,
  PropertyType: string,
  SelectedValue: string,
  NavigationView: string,
}

export interface IApprovalTask extends IExtendetEntity {
   TaskParameters: IChildEntityCollection<IApprovalTask, ITaskParamRow>;
   ParametersStarkov: IChildEntityCollection<IApprovalTask, ITaskParamRow>;
}

export enum CalculateFrom {
  Property = 'Property',
  Function = 'Function'
}

export interface NavigationData {
    label: string;
    value: string;
}

export interface EnumerationData {
    Value: string;
    Label: string;
}