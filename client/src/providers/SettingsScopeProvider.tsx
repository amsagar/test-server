import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { assistantsApi } from '@apiCalls/services';
import { useNotification } from '@providers/NotificationProviders';
import type { AssistantDto } from '@interfaces/assistant.interface';

interface SettingsScopeValue {
  assistants: AssistantDto[];
  assistantId: string;
  assistant: AssistantDto | null;
  setAssistantId: (id: string) => void;
  refreshAssistants: () => Promise<void>;
  loading: boolean;
}

const SettingsScopeContext = createContext<SettingsScopeValue | null>(null);

const STORAGE_KEY = 'ca:settingsAssistantId';

export const SettingsScopeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const openNotification = useNotification();
  const [assistants, setAssistants] = useState<AssistantDto[]>([]);
  const [assistantId, setAssistantIdState] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(true);

  const setAssistantId = useCallback((id: string) => {
    setAssistantIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const refreshAssistants = useCallback(async () => {
    try {
      const list = await assistantsApi.list();
      setAssistants(list);
      setAssistantIdState((curr) =>
        curr && list.some((a) => a.id === curr)
          ? curr
          : list[0]?.id || ''
      );
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to load assistants',
        'Error'
      );
    } finally {
      setLoading(false);
    }
  }, [openNotification]);

  useEffect(() => {
    void refreshAssistants();
  }, [refreshAssistants]);

  const value = useMemo<SettingsScopeValue>(
    () => ({
      assistants,
      assistantId,
      assistant: assistants.find((a) => a.id === assistantId) || null,
      setAssistantId,
      refreshAssistants,
      loading,
    }),
    [assistants, assistantId, setAssistantId, refreshAssistants, loading]
  );

  return (
    <SettingsScopeContext.Provider value={value}>
      {children}
    </SettingsScopeContext.Provider>
  );
};

export const useSettingsScope = (): SettingsScopeValue => {
  const ctx = useContext(SettingsScopeContext);
  if (!ctx) {
    throw new Error(
      'useSettingsScope must be used inside <SettingsScopeProvider />'
    );
  }
  return ctx;
};
