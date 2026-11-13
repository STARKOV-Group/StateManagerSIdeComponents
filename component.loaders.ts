import { IRemoteControlLoader } from '@directum/sungero-remote-component-types';

import * as criteria from './src/loaders/Criteria';
import * as displayNameControl from './src/loaders/DisplayNameControl';

// Загрузчики контролов компонента.
const loaders: Record<string, IRemoteControlLoader> = {
  'Criteria': criteria,
  'DisplayNameControl': displayNameControl,
};

export default loaders;
