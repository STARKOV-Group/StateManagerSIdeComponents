import { IChildEntityCollection, IChildEntity, INavigationPropertyValue } from "@directum/sungero-remote-component-types";
import { IExtendetEntity, IPropertySelection } from "../CommonComponents/types";

export type ComparisonOperator = 'IsEqual' | 'IsNotEqual' | 'Contains' | 'NotContains' | 'GreaterThan' | 'LessThan' | 'IncludedIn' | 'NotIncludedIn' | 'IncludedInRole' | 'IsNull' | 'IsNotNull';
export type RightValueType = 'value' | 'expression';

export interface IRootEntitySetting extends IExtendetEntity {
    DocType: INavigationPropertyValue;
    SelectedRowId: number;
    PropertySettings: IChildEntityCollection<IRootEntitySetting, IRowSetting>;
}

export interface IRowSetting extends IChildEntity<IRootEntitySetting> {
    RowNumber: number;
    LocalisedName?: string;
    VisabilityCriteria: string;
    EnabledCriteria?: string;
    RequiredCriteria?: string;
    DisplayValueCriteria?: string;
}

export interface ICondition {
    id: string;
    leftProperty: IPropertySelection;
    operator: ComparisonOperator;
    rightValue: string;
    rightType: RightValueType;
    rightPropertyType?: string;
    rightPropertyGuid?: string;
    rightExpression?: IPropertySelection; // Вычисляемое выражение для правой части
    logicalOperator?: 'And' | 'Or';
}

export interface ICriteriaExpression {
    conditions: ICondition[];
}

export enum StateName {
    Visability,
    Enabled,
    Required,
    DisplayName
}