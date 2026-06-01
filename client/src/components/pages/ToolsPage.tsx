import React, { useEffect, useMemo, useState } from 'react';
import ResourcePanelTemplate from '@templates/ResourcePanelTemplate';
import FormTemplate from '@templates/FormTemplate';
import CustomInput from '@atoms/CustomInput';
import CustomTextarea from '@atoms/CustomTextarea';
import CustomSelect from '@atoms/CustomSelect';
import CustomButton from '@atoms/CustomButton';
import CustomTag from '@atoms/CustomTag';
import CustomDivider from '@atoms/CustomDivider';
import ImportToolsDialog from '@molecules/ImportToolsDialog';
import { useSettingsScope } from '@providers/SettingsScopeProvider';
import { toolsApi, authProfilesApi } from '@apiCalls/services';
import { useNotification } from '@providers/NotificationProviders';
import { HTTP_METHODS, TOOL_AUTH_TYPES } from '@constants/toolSourceKinds';
import { formatJson } from '@utils/formatJson';
import type {
  AgentToolDto,
  CreateToolRequest,
  HttpToolMethod,
} from '@interfaces/tool.interface';
import type { ToolAuthProfileDto } from '@interfaces/auth.interface';
import * as styles from '@styles/resourcePanel.module.scss';

const EMPTY: CreateToolRequest = {
  name: '',
  description: '',
  method: 'GET',
  host: '',
  endpoint: '',
  requestSchema: '',
  authProfileId: '',
  authType: 'none',
  authConfig: '',
  enabled: true,
};

const PROFILE_NONE = '__none__';

const ToolsPage: React.FC = () => {
  const openNotification = useNotification();
  const { assistant, assistantId } = useSettingsScope();
  const [items, setItems] = useState<AgentToolDto[]>([]);
  const [profiles, setProfiles] = useState<ToolAuthProfileDto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateToolRequest>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testError, setTestError] = useState('');
  const [testing, setTesting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const refresh = async () => {
    if (!assistantId) {
      setItems([]);
      return;
    }
    try {
      setItems(await toolsApi.list(assistantId));
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to load tools',
        'Error'
      );
    }
  };

  useEffect(() => {
    void refresh();
    setEditingId(null);
  }, [assistantId]);

  useEffect(() => {
    if (!assistantId) {
      setProfiles([]);
      return;
    }
    authProfilesApi.list(assistantId).then(setProfiles).catch(() => setProfiles([]));
  }, [assistantId]);

  const startNew = () => {
    if (!assistantId) {
      openNotification('Pick an assistant first', 'Warning');
      return;
    }
    setEditingId('new');
    setForm(EMPTY);
    setError('');
    setTestOutput(null);
    setTestError('');
  };

  const startEdit = (t: AgentToolDto) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description,
      method: t.method,
      host: t.host,
      endpoint: t.endpoint,
      requestSchema: t.requestSchema,
      authProfileId: t.authProfileId || '',
      authType: t.authType || 'none',
      authConfig: t.authConfig || '',
      enabled: t.enabled,
    });
    setError('');
    setTestOutput(null);
    setTestError('');
  };

  const cancel = () => {
    setEditingId(null);
    setForm(EMPTY);
    setError('');
  };

  const save = async () => {
    if (!form.name.trim() || !form.host.trim() || !form.endpoint.trim()) {
      setError('Name, host, and endpoint are required.');
      return;
    }
    setSaving(true);
    try {
      const body: CreateToolRequest = {
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() || '',
        host: form.host.trim(),
        endpoint: form.endpoint.trim(),
        requestSchema: form.requestSchema?.trim() || '',
        authProfileId: form.authProfileId || null,
        authType: form.authType || null,
        authConfig: form.authConfig?.trim() || null,
      };
      if (editingId === 'new') {
        const created = await toolsApi.create(assistantId, body);
        openNotification(`Tool "${created.name}" created`, 'Success');
      } else if (editingId) {
        const updated = await toolsApi.update(editingId, body);
        openNotification(`Tool "${updated.name}" updated`, 'Success');
      }
      cancel();
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: AgentToolDto) => {
    try {
      await toolsApi.delete(t.id);
      if (editingId === t.id) cancel();
      await refresh();
      openNotification(`Tool "${t.name}" deleted`, 'Success');
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to delete tool',
        'Error'
      );
    }
  };

  const runTest = async () => {
    if (!editingId || editingId === 'new') return;
    setTesting(true);
    setTestError('');
    setTestOutput(null);
    try {
      const out = await toolsApi.test(editingId, { input: testInput });
      setTestOutput(typeof out === 'string' ? out : JSON.stringify(out));
    } catch (e) {
      setTestError((e as Error)?.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const listItems = useMemo(
    () =>
      items.map((t) => ({
        id: t.id,
        name: t.name,
        meta: `${t.method} · ${t.endpoint}`,
      })),
    [items]
  );

  const profileOptions = [
    { value: '', label: 'None (use inline auth)' },
    ...profiles.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <>
      <ResourcePanelTemplate
        title="HTTP Tools"
        subtitle={
          assistant
            ? `Endpoints ${assistant.name} can call as tools.`
            : 'Register HTTP endpoints the assistant can call as tools.'
        }
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
        newLabel="+ New tool"
        emptyListLabel={
          assistantId ? 'No tools yet' : 'Pick an assistant in the left rail'
        }
        scopeBar={
          <>
            <div style={{ flex: 1 }} />
            <CustomButton
              variant="ghost"
              onClick={() => setImportOpen(true)}
              disabled={!assistantId}
            >
              Import
            </CustomButton>
          </>
        }
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
            placeholder="e.g. listIssues"
            fullWidth
          />

          <label className={styles.fieldLabel}>Description</label>
          <CustomInput
            value={form.description || ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="What does this tool do?"
            fullWidth
          />

          <div className={styles.row2}>
            <div>
              <label className={styles.fieldLabel}>Method</label>
              <CustomSelect
                options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
                value={form.method}
                onChange={(v) =>
                  setForm((f) => ({ ...f, method: v as HttpToolMethod }))
                }
                fullWidth
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>Enabled</label>
              <CustomSelect
                options={[
                  { value: 'true', label: 'Enabled' },
                  { value: 'false', label: 'Disabled' },
                ]}
                value={String(form.enabled ?? true)}
                onChange={(v) =>
                  setForm((f) => ({ ...f, enabled: v === 'true' }))
                }
                fullWidth
              />
            </div>
          </div>

          <label className={styles.fieldLabel}>Host</label>
          <CustomInput
            value={form.host}
            onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
            placeholder="https://api.example.com"
            fullWidth
          />

          <label className={styles.fieldLabel}>Endpoint</label>
          <CustomInput
            value={form.endpoint}
            onChange={(e) =>
              setForm((f) => ({ ...f, endpoint: e.target.value }))
            }
            placeholder="/v1/things/{id}"
            fullWidth
          />

          <label className={styles.fieldLabel}>Request schema (JSON)</label>
          <CustomTextarea
            value={form.requestSchema || ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, requestSchema: e.target.value }))
            }
            placeholder='{"type":"object","properties":{...}}'
            autoSize={{ minRows: 5, maxRows: 16 }}
            fullWidth
          />

          <CustomDivider margin={4}>Authentication</CustomDivider>

          <label className={styles.fieldLabel}>Auth profile</label>
          <CustomSelect
            options={profileOptions}
            value={form.authProfileId || ''}
            onChange={(v) =>
              setForm((f) => ({ ...f, authProfileId: (v as string) || '' }))
            }
            fullWidth
          />

          {!form.authProfileId && (
            <>
              <label className={styles.fieldLabel}>Inline auth type</label>
              <CustomSelect
                options={TOOL_AUTH_TYPES.map((t) => ({
                  value: t.value,
                  label: t.label,
                }))}
                value={form.authType || 'none'}
                onChange={(v) =>
                  setForm((f) => ({ ...f, authType: v as string }))
                }
                fullWidth
              />
              <label className={styles.fieldLabel}>Inline auth config</label>
              <CustomTextarea
                value={form.authConfig || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, authConfig: e.target.value }))
                }
                placeholder='JSON (e.g. {"name":"X-Api-Key","value":"..."})'
                autoSize={{ minRows: 3, maxRows: 10 }}
                fullWidth
              />
            </>
          )}

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formActions}>
            <CustomButton variant="primary" htmlType="submit" loading={saving}>
              Save
            </CustomButton>
            <CustomButton
              variant="secondary"
              onClick={cancel}
              disabled={saving}
            >
              Cancel
            </CustomButton>
          </div>

          {editingId && editingId !== 'new' && (
            <div className={styles.testBox}>
              <CustomDivider margin={4}>Test this tool</CustomDivider>
              <label className={styles.fieldLabel}>Input (JSON)</label>
              <CustomTextarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder='{"id":"123"}'
                autoSize={{ minRows: 3, maxRows: 8 }}
                fullWidth
              />
              <div className={styles.formActions}>
                <CustomButton
                  variant="ghost"
                  onClick={runTest}
                  loading={testing}
                >
                  Run test
                </CustomButton>
              </div>
              {testError && (
                <div className={styles.formError}>
                  <CustomTag tone="error">Error</CustomTag> {testError}
                </div>
              )}
              {testOutput != null && (
                <>
                  <label className={styles.fieldLabel}>Output</label>
                  <pre
                    style={{
                      margin: 0,
                      background: '#f6f8fa',
                      border: '1px solid #dcdee5',
                      borderRadius: 6,
                      padding: 10,
                      maxHeight: 280,
                      overflow: 'auto',
                      fontSize: 12,
                    }}
                  >
                    {formatJson(testOutput)}
                  </pre>
                </>
              )}
            </div>
          )}
        </FormTemplate>
      </ResourcePanelTemplate>

      <ImportToolsDialog
        open={importOpen}
        assistantId={assistantId}
        onClose={() => setImportOpen(false)}
        onImported={refresh}
      />
    </>
  );
};

export default ToolsPage;
