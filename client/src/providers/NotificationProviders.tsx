import React, { createContext, useContext } from 'react';
import setNotifications, {
  NotificationTitle,
} from '@utils/openNotification';

type OpenNotification = (message: string, title: NotificationTitle) => void;

const NotificationContext = createContext<OpenNotification | null>(null);

export const useNotification = (): OpenNotification => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotification must be used inside <NotificationProvider />'
    );
  }
  return ctx;
};

interface NotificationProviderProps {
  api: Parameters<typeof setNotifications>[0];
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  api,
  children,
}) => {
  const openNotification = setNotifications(api);
  return (
    <NotificationContext.Provider value={openNotification}>
      {children}
    </NotificationContext.Provider>
  );
};
