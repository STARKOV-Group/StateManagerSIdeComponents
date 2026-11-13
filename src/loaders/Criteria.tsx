import * as React from 'react'
import { createRoot } from 'react-dom/client';
import { ControlCleanupCallback, ILoaderArgs, IRemoteComponentCardApi, IRemoteControlInfo } from '@directum/sungero-remote-component-types';

import { SettingsProvider } from '../context/SettingsContext';
import { NavigationCacheProvider } from '../context/NavigationCacheContext';
import Criteria from '../controls/CriteriasControl/Criteria';

/**
 * Загрузчик контрола для контекста карточки.
 * @param args Аргументы загрузчика.
 */
export default (args: ILoaderArgs): Promise<ControlCleanupCallback> => {
  const root = createRoot(args.container);
  root.render(
    <NavigationCacheProvider>
      <SettingsProvider>
        <Criteria api={args.api as IRemoteComponentCardApi} controlInfo={args.controlInfo}/>
      </SettingsProvider>
    </NavigationCacheProvider>
  );
  return Promise.resolve(() => root.unmount());
};