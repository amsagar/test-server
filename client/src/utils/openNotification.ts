import type { NotificationArgsProps } from 'antd';

type NotificationPlacement = NotificationArgsProps['placement'];

export type NotificationTitle = 'Success' | 'Error' | 'Warning' | 'Info';

interface SetNotificationsProps {
  success: (args: NotificationArgsProps) => void;
  error: (args: NotificationArgsProps) => void;
  warning: (args: NotificationArgsProps) => void;
  info: (args: NotificationArgsProps) => void;
}

const setNotifications = (api: SetNotificationsProps) => {
  const openNotification = (message: string, title: NotificationTitle) => {
    const placement: NotificationPlacement = 'topRight';
    const args: NotificationArgsProps = {
      message: title,
      description: message,
      placement,
    };
    if (title === 'Success') api.success(args);
    else if (title === 'Error') api.error(args);
    else if (title === 'Warning') api.warning(args);
    else api.info(args);
  };
  return openNotification;
};

export default setNotifications;
