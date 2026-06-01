import React from 'react';
import { NavLink, Navigate, useParams, useNavigate } from 'react-router-dom';
import CustomIcon, { CustomIconName } from '@atoms/CustomIcon';
import CustomSelect from '@atoms/CustomSelect';
import {
  SettingsScopeProvider,
  useSettingsScope,
} from '@providers/SettingsScopeProvider';
import AssistantsPage from './AssistantsPage';
import ToolsPage from './ToolsPage';
import AuthProfilesPage from './AuthProfilesPage';
import SkillsPage from './SkillsPage';
import DocumentsPage from './DocumentsPage';
import ResponseStylesPage from './ResponseStylesPage';
import McpServersPage from './McpServersPage';
import * as styles from '@styles/settings.module.scss';

type SectionKey =
  | 'assistants'
  | 'tools'
  | 'auth-profiles'
  | 'skills'
  | 'documents'
  | 'response-styles'
  | 'mcp-servers';

type ScopeGroup = 'Assistant';

interface SectionDef {
  key: SectionKey;
  label: string;
  icon: CustomIconName;
  group: ScopeGroup;
  Component: React.ComponentType;
}

const SECTIONS: SectionDef[] = [
  {
    key: 'assistants',
    label: 'General',
    icon: 'robot',
    group: 'Assistant',
    Component: AssistantsPage,
  },
  {
    key: 'tools',
    label: 'HTTP tools',
    icon: 'tool',
    group: 'Assistant',
    Component: ToolsPage,
  },
  {
    key: 'skills',
    label: 'Skills',
    icon: 'skill',
    group: 'Assistant',
    Component: SkillsPage,
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: 'document',
    group: 'Assistant',
    Component: DocumentsPage,
  },
  {
    key: 'mcp-servers',
    label: 'MCP servers',
    icon: 'mcp',
    group: 'Assistant',
    Component: McpServersPage,
  },
  {
    key: 'response-styles',
    label: 'Response styles',
    icon: 'style',
    group: 'Assistant',
    Component: ResponseStylesPage,
  },
  {
    key: 'auth-profiles',
    label: 'Auth profiles',
    icon: 'key',
    group: 'Assistant',
    Component: AuthProfilesPage,
  },
];

const GROUP_ORDER: ScopeGroup[] = ['Assistant'];

const SettingsInner: React.FC<{ section: SectionKey }> = ({ section }) => {
  const navigate = useNavigate();
  const { assistants, assistantId, setAssistantId, loading } =
    useSettingsScope();
  const active = SECTIONS.find((s) => s.key === section)!;
  const ActiveComponent = active.Component;

  const assistantOptions =
    assistants.length === 0
      ? [{ value: '', label: 'No assistants yet' }]
      : assistants.map((a) => ({ value: a.id, label: a.name }));

  return (
    <div className={styles.page}>
      <aside className={styles.nav}>
        <div className={styles.navHeader} onClick={() => navigate('/')}>
          <CustomIcon name="arrowLeft" size={13} />
          Back to chat
        </div>

        <div className={styles.scopePicker}>
          <label className={styles.scopeLabel}>Assistant</label>
          <CustomSelect
            options={assistantOptions}
            value={assistantId}
            onChange={(v) => setAssistantId(v as string)}
            placeholder={loading ? 'Loading…' : 'Pick an assistant'}
            fullWidth
            disabled={loading || assistants.length === 0}
          />
        </div>

        {GROUP_ORDER.map((group) => {
          const items = SECTIONS.filter((s) => s.group === group);
          if (items.length === 0) return null;
          return (
            <React.Fragment key={group}>
              <div className={styles.navTitle}>For this assistant</div>
              {items.map((it) => {
                const scopedDisabled =
                  it.group === 'Assistant' && !assistantId && !loading;
                return (
                  <NavLink
                    key={it.key}
                    to={`/settings/${it.key}`}
                    className={({ isActive }) =>
                      [
                        styles.navItem,
                        isActive ? styles.navItemActive : '',
                        scopedDisabled ? styles.navItemDisabled : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }
                    onClick={(e) => {
                      if (scopedDisabled) e.preventDefault();
                    }}
                  >
                    <span className={styles.navIcon}>
                      <CustomIcon name={it.icon} size={15} />
                    </span>
                    {it.label}
                  </NavLink>
                );
              })}
            </React.Fragment>
          );
        })}
      </aside>

      <main className={styles.content}>
        <div className={styles.contentInner}>
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const { section } = useParams<{ section?: string }>();
  if (!section) return <Navigate to="/settings/assistants" replace />;
  const active = SECTIONS.find((s) => s.key === section);
  if (!active) return <Navigate to="/settings/assistants" replace />;
  return (
    <SettingsScopeProvider>
      <SettingsInner section={active.key} />
    </SettingsScopeProvider>
  );
};

export default SettingsPage;
