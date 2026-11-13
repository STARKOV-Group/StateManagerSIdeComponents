import { ControlCleanupCallback, ILoaderArgs, IRemoteComponentCardApi, IRemoteComponentCoverApi } from "@directum/sungero-remote-component-types";
import { createRoot } from "react-dom/client";
import React from 'react';
import { NavigationCacheProvider } from "../context/NavigationCacheContext";
import { SettingsProvider } from "../context/SettingsContext";
import DisplayNameControl from "../controls/RenameProperty/DisplayNameControl";

export default (args: ILoaderArgs): Promise<ControlCleanupCallback> => {
  const root = createRoot(args.container);
  root.render(
    <NavigationCacheProvider>
      <SettingsProvider>
        <DisplayNameControl api={args.api as IRemoteComponentCardApi} />
      </SettingsProvider>
    </NavigationCacheProvider>
  );
  return Promise.resolve(() => root.unmount());
};