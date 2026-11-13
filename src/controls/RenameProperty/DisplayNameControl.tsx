import { ControlUpdateHandler, IRemoteComponentCardApi, IRemoteComponentContext, IRemoteControlInfo } from "@directum/sungero-remote-component-types";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import React from 'react';
import axios from 'axios';
import { useSettings } from "../../context/SettingsContext";
import { IExtendetEntity, IPropertyDisplayNameDto } from "../CommonComponents/types";
import { useApi } from "../../functions/fetchMetadata";

const DisplayNameControl: React.FC<{ api: IRemoteComponentCardApi }> = ({ api }) => {
    const { state: settingsState, loadSettings } = useSettings();
    const { fetchPropertyDisplayNames } = useApi();
    const [propertySettings, setPropertySettings] = useState<IPropertyDisplayNameDto[]>([]);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    const [docKind, setDockKind] = useState(0);

    const settingsUrlRef = useRef(settingsState.settings.Url);
    const documentKindIdRef = useRef<number>(0);
    const prevCustomNamesRef = useRef<Map<string, string>>(new Map());
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        settingsUrlRef.current = settingsState.settings.Url;
    }, [settingsState.settings.Url]);

    useEffect(() => {
        documentKindIdRef.current = docKind;
    }, [docKind]);

    useEffect(() => {
        let cancel = false;
        const initializeSettings = async () => {
            await loadSettings(api);

            if (!cancel)
                setIsSettingsLoaded(true);
        };

        initializeSettings();
        return () => { cancel = true };
    }, [api, loadSettings]);

    // Функция для применения изменений
    const applyPropertyChanges = useCallback((settings: IPropertyDisplayNameDto[]) => {
        // Актуальные настройки: те, что в settings + те, что были применены ранее и не попали в новый набор
        const newNamesMap = new Map(settings.map(s => [s.LocalisedName, s.CustomName || s.LocalisedName]));

        const labels = document.querySelectorAll('.control-label__label-text');
        const labelsByCurrentText = new Map<string, Element>();
        labels.forEach(label => labelsByCurrentText.set(label.textContent.trim(), label));

        // 1. Сброс того что было изменено ранее, но не входит в новые настройки
        prevCustomNamesRef.current.forEach((customName, originalName) => {
            if (!newNamesMap.has(originalName)) {
                const label = labelsByCurrentText.get(customName);
                if (label) {
                    label.textContent = originalName;
                    console.debug(`Сброс: "${customName}" → "${originalName}"`);
                }
                prevCustomNamesRef.current.delete(originalName);
            }
        });

        // 2. Применить новые настройки
        settings.forEach(setting => {
            if (!setting.CustomName) return;

            const label = labelsByCurrentText.get(setting.LocalisedName)
                || labelsByCurrentText.get(prevCustomNamesRef.current.get(setting.LocalisedName) || '');
            if (!label) {
                console.debug(`Лейбл для "${setting.LocalisedName}" не найден`);
                return;
            }
            if (label.textContent.trim() !== setting.CustomName) {
                label.textContent = setting.CustomName;
                console.debug(`"${setting.LocalisedName}" → "${setting.CustomName}"`);
            }
            prevCustomNamesRef.current.set(setting.LocalisedName, setting.CustomName);
        });
    }, []);

    // Эффект для применения настроек
    useLayoutEffect(() => {
        applyPropertyChanges(propertySettings);
    }, [propertySettings, applyPropertyChanges]);

    // Обработчик обновлений контрола
    const handleControlUpdate: ControlUpdateHandler = useCallback(() => {
        const updatedEntity = api.getEntity<IExtendetEntity>();
        const newDocKindId = updatedEntity['DocumentKind']?.Value as number || 0;

        console.debug('Контрол обновлен, новый DocumentKind:', newDocKindId);

        if (newDocKindId === documentKindIdRef.current) {
            console.debug('DocumentKind не изменился, пропускаем');
            return;
        }

        setDockKind(newDocKindId);
    }, [api]);

    useEffect(() => {
        if (docKind === 0 || !settingsUrlRef.current) {
            setPropertySettings([]);
            return;
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        (async () => {
            try {
                const result = await fetchPropertyDisplayNames(docKind, controller.signal);
                if (controller.signal.aborted) {
                    console.debug('Запрос отменён, результат игнорируется');
                    return;
                }

                setPropertySettings(result.length > 0 ? result : []);
            } catch (error) {
                if (!axios.isCancel(error)) console.error('Ошибка загрузки:', error);
            }
        })();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, [docKind, fetchPropertyDisplayNames]);

    useEffect(() => {
        api.onControlUpdate = handleControlUpdate;
        if (isSettingsLoaded && settingsUrlRef.current) {
            const entity = api.getEntity() as IExtendetEntity;
            setDockKind(entity['DocumentKind']?.Value as number || 0);
        }

        return () => {
            api.onControlUpdate = undefined;
        };
    }, [isSettingsLoaded, api, handleControlUpdate]);

    return <div></div>;
};

export default DisplayNameControl;