import React from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';

/**
 * Brand tokens for AntD. The page tree only ever sees AntD via our custom
 * atoms, but those atoms still render AntD underneath, so this provider sets
 * the global tokens to the PODS palette on a warm cream canvas:
 *  - PODS red accent (#E1251B) for primary actions and links
 *  - Warm cream surfaces (#FAF9F5 app / #F4F1E9 cards)
 *  - Ink text (#2B2A26) and softer secondary (#5C5B52)
 *  - Inter / system font, generous 10–14px radii
 */
const themeConfig = {
  token: {
    colorPrimary: '#e1251b',
    colorInfo: '#e1251b',
    colorSuccess: '#5f8b54',
    colorWarning: '#b58a3c',
    colorError: '#c81b13',
    colorLink: '#e1251b',
    colorTextBase: '#2b2a26',
    colorBgBase: '#ffffff',
    colorBorder: '#ebe7d9',
    colorBorderSecondary: '#f4f1e9',
    fontFamily:
      "'InterVariable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 6,
    wireframe: false,
  },
  algorithm: antdTheme.defaultAlgorithm,
  components: {
    Button: { controlHeight: 36, fontWeight: 500, borderRadius: 10 },
    Input: { controlHeight: 36, borderRadius: 10 },
    Select: { controlHeight: 36, borderRadius: 10 },
    Modal: { borderRadiusLG: 16 },
    Drawer: { paddingLG: 0 },
    Tooltip: { colorBgSpotlight: '#2b2a26' },
    Notification: { borderRadiusLG: 14 },
    Tag: { borderRadiusSM: 6 },
  },
};

interface Props {
  children: React.ReactNode;
}

const AntdConfigProvider: React.FC<Props> = ({ children }) => (
  <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>
);

export default AntdConfigProvider;
