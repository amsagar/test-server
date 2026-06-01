import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { notification } from 'antd';
import CustomRoutes from '@routes/Routes';
import { NotificationProvider } from '@providers/NotificationProviders';
import AntdConfigProvider from '@providers/AntdConfigProvider';
import { ConfirmHost } from '@atoms/CustomConfirm';
import * as styles from '@styles/app.module.scss';
import 'antd/dist/reset.css';
import '@styles/global.scss';

const App: React.FC = () => {
  const [api, contextHolder] = notification.useNotification();

  return (
    <AntdConfigProvider>
      <NotificationProvider api={api}>
        <section className={styles.body}>
          {contextHolder}
          <ConfirmHost />
          <BrowserRouter>
            <CustomRoutes />
          </BrowserRouter>
        </section>
      </NotificationProvider>
    </AntdConfigProvider>
  );
};

export default App;
