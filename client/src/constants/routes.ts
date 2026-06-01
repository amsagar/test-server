import React from 'react';
import { ROUTE_PATHS } from '@constants/routePaths';

import ChatWorkspace from '@pages/ChatWorkspace';
import SettingsPage from '@pages/SettingsPage';
import NotFoundPage from '@pages/NotFoundPage';

export interface RouteDefinition {
  key: string;
  path: string;
  element: React.ComponentType;
  title: string;
}

export const ROUTES: RouteDefinition[] = [
  {
    key: 'chat',
    path: ROUTE_PATHS.CHAT,
    element: ChatWorkspace,
    title: 'PODS Agents',
  },
  {
    key: 'settings-root',
    path: ROUTE_PATHS.SETTINGS,
    element: SettingsPage,
    title: 'Settings · PODS Agents',
  },
  {
    key: 'settings-section',
    path: ROUTE_PATHS.SETTINGS_SECTION,
    element: SettingsPage,
    title: 'Settings · PODS Agents',
  },
  {
    key: 'not-found',
    path: ROUTE_PATHS.NOT_FOUND,
    element: NotFoundPage,
    title: 'Not Found',
  },
];
