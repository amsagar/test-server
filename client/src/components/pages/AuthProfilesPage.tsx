import React, { useEffect, useMemo, useState } from 'react';
import ResourcePanelTemplate from '@templates/ResourcePanelTemplate';
import FormTemplate from '@templates/FormTemplate';
import CustomInput from '@atoms/CustomInput';
import CustomTextarea from '@atoms/CustomTextarea';
import CustomSelect from '@atoms/CustomSelect';
import CustomButton from '@atoms/CustomButton';
import CustomTag from '@atoms/CustomTag';
import { useSettingsScope } from '@providers/SettingsScopeProvider';
import { authProfilesApi } from '@apiCalls/services';
import { useNotification } from '@providers/NotificationProviders';
import { TOOL_AUTH_TYPES } from '@constants/toolSourceKinds';
import type {
  ToolAuthProfileDto,
  CreateAuthProfileRequest,
} from '@interfaces/auth.interface';
import * as styles from '@styles/resourcePanel.module.scss';

interface AuthProfileFormState {
  name: string;
  description: string;
  authType: string;
  authConfig: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scopes: string;
}

const EMPTY: AuthProfileFormState = {
  name: '',
  description: '',
  authType: 'none',
  authConfig: '',
  clientId: '',
  clientSecret: '',
  tokenUrl: '',
  scopes: '',
};

const parseAuthConfig = (raw?: string | null): Record<string, string> => {
  if (!raw?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, String(v ?? '')])
    );
  } catch {
    return {};
  }
};

const buildAuthConfigForSave = (
  authType: string,
  authConfigRaw: string,
  clientId: string
): string | undefined => {
  if (authType === 'oauth_client_credentials') {
    const next: Record<string, string> = {};
    if (clientId.trim()) next.clientId = clientId.trim();
    return Object.keys(next).length > 0 ? JSON.stringify(next) : undefined;
  }
  const trimmed = authConfigRaw.trim();
  return trimmed || undefined;
};

const AuthProfilesPage: React.FC = () => {
  const openNotification = useNotification();
  const { assistantId } = useSettingsScope();
  const [items, setItems] = useState<ToolAuthProfileDto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AuthProfileFormState>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!assistantId) {
      setItems([]);
      return;
    }
    try {
      setItems(await authProfilesApi.list(assistantId));
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to load auth profiles',
        'Error'
      );
    }
  };

  useEffect(() => {
    void refresh();
    setEditingId(null);
  }, [assistantId]);

  const startNew = () => {
    if (!assistantId) {
      openNotification('Pick an assistant first', 'Warning');
      return;
    }
    setEditingId('new');
    setForm(EMPTY);
    setError('');
  };

  const startEdit = (p: ToolAuthProfileDto) => {
    const cfg = parseAuthConfig(p.authConfig);
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      authType: p.authType,
      authConfig: p.authConfig || '',
      clientId: cfg.clientId || '',
      clientSecret: '',
      tokenUrl: p.tokenUrl || '',
      scopes: p.scopes || '',
    });
    setError('');
  };

  const cancel = () => {
    setEditingId(null);
    setForm(EMPTY);
    setError('');
  };

  const save = async () => {
    if (!form.name.trim() || !form.authType) {
      setError('Name and auth type are required.');
      return;
    }
    if (
      form.authType === 'oauth_client_credentials' &&
      !form.clientId.trim()
    ) {
      setError('Client ID is required for OAuth client credentials.');
      return;
    }
    setSaving(true);
    try {
      const body: CreateAuthProfileRequest = {
        name: form.name.trim(),
        description: form.description?.trim() || '',
        authType: form.authType,
        authConfig: buildAuthConfigForSave(
          form.authType,
          form.authConfig,
          form.clientId
        ),
        clientSecret: form.clientSecret?.trim() || undefined,
        tokenUrl: form.tokenUrl?.trim() || undefined,
        scopes: form.scopes?.trim() || undefined,
      };
      if (editingId === 'new') {
        const created = await authProfilesApi.create(assistantId, body);
        openNotification(`Profile "${created.name}" created`, 'Success');
      } else if (editingId) {
        const updated = await authProfilesApi.update(editingId, body);
        openNotification(`Profile "${updated.name}" updated`, 'Success');
      }
      cancel();
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: ToolAuthProfileDto) => {
    try {
      await authProfilesApi.delete(p.id);
      if (editingId === p.id) cancel();
      await refresh();
      openNotification(`Profile "${p.name}" deleted`, 'Success');
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to delete profile',
        'Error'
      );
    }
  };

  const listItems = useMemo(
    () =>
      items.map((p) => ({
        id: p.id,
        name: p.name,
        meta: p.authType,
      })),
    [items]
  );

  const showOAuth = form.authType === 'oauth_client_credentials';
  const showAnySecret = form.authType !== 'none';
  const currentEditing = editingId && editingId !== 'new'
    ? items.find((i) => i.id === editingId)
    : null;

  return (
    <ResourcePanelTemplate
      title="Auth Profiles"
      subtitle="Reusable HTTP auth configurations referenced by tools."
      items={listItems}
      selectedId={editingId}
      onSelect={(it) => {
        const found = items.find((x) => x.id === it.id);
        if (found) startEdit(found);
      }}
      onNew={startNew}
      onDelete={(it) => {
        const found = items.find((x) => x.id === it.id);
        if (found) return remove(found);
      }}
      newLabel="+ New profile"
      emptyListLabel="No auth profiles yet"
    >
      <FormTemplate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className={styles.fieldLabel}>Name</label>
        <CustomInput
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. GitHub API"
          fullWidth
        />

        <label className={styles.fieldLabel}>Description</label>
        <CustomInput
          value={form.description || ''}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          placeholder="Optional short summary"
          fullWidth
        />

        <label className={styles.fieldLabel}>Auth type</label>
        <CustomSelect
          options={TOOL_AUTH_TYPES.map((t) => ({
            value: t.value,
            label: t.label,
          }))}
          value={form.authType}
          onChange={(v) =>
            setForm((f) => ({ ...f, authType: v as string }))
          }
          fullWidth
        />

        {!showOAuth && (
          <>
            <label className={styles.fieldLabel}>
              Auth config (JSON, non-secret fields)
            </label>
            <CustomTextarea
              value={form.authConfig || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, authConfig: e.target.value }))
              }
              placeholder='e.g. {"name":"X-Api-Key"} or {"username":"..."}'
              autoSize={{ minRows: 3, maxRows: 10 }}
              fullWidth
            />
          </>
        )}

        {showOAuth && (
          <>
            <label className={styles.fieldLabel}>Token URL</label>
            <CustomInput
              value={form.tokenUrl || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, tokenUrl: e.target.value }))
              }
              placeholder="https://example.com/oauth/token"
              fullWidth
            />
            <label className={styles.fieldLabel}>Client ID</label>
            <CustomInput
              value={form.clientId}
              onChange={(e) =>
                setForm((f) => ({ ...f, clientId: e.target.value }))
              }
              placeholder="OAuth client ID"
              fullWidth
            />
            <label className={styles.fieldLabel}>
              Client secret
              {currentEditing?.hasClientSecret && (
                <>
                  {' '}
                  <CustomTag tone="info">stored</CustomTag>
                </>
              )}
            </label>
            <CustomInput
              type="password"
              value={form.clientSecret || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, clientSecret: e.target.value }))
              }
              placeholder={
                currentEditing?.hasClientSecret
                  ? 'Leave blank to keep current secret'
                  : 'Plaintext secret (encrypted server-side)'
              }
              fullWidth
            />
            <label className={styles.fieldLabel}>Scopes (space-separated)</label>
            <CustomInput
              value={form.scopes || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, scopes: e.target.value }))
              }
              placeholder="read write"
              fullWidth
            />
          </>
        )}

        {showAnySecret && !showOAuth && (
          <>
            <label className={styles.fieldLabel}>
              Secret
              {currentEditing?.hasClientSecret && (
                <>
                  {' '}
                  <CustomTag tone="info">stored</CustomTag>
                </>
              )}
            </label>
            <CustomInput
              type="password"
              value={form.clientSecret || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, clientSecret: e.target.value }))
              }
              placeholder={
                currentEditing?.hasClientSecret
                  ? 'Leave blank to keep current secret'
                  : 'Plaintext secret (encrypted server-side)'
              }
              fullWidth
            />
          </>
        )}

        {currentEditing && (
          <div className={styles.fieldHelp}>
            Access token {currentEditing.hasAccessToken ? 'cached' : 'not cached'}
            {currentEditing.tokenExpiresAt
              ? ` until ${new Date(
                  currentEditing.tokenExpiresAt * 1000
                ).toLocaleString()}`
              : ''}
          </div>
        )}

        {error && <div className={styles.formError}>{error}</div>}

        <div className={styles.formActions}>
          <CustomButton variant="primary" htmlType="submit" loading={saving}>
            Save
          </CustomButton>
          <CustomButton variant="secondary" onClick={cancel} disabled={saving}>
            Cancel
          </CustomButton>
        </div>
      </FormTemplate>
    </ResourcePanelTemplate>
  );
};

export default AuthProfilesPage;
