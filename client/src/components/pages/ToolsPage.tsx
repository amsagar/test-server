import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FormTemplate from '@templates/FormTemplate';
import CustomInput from '@atoms/CustomInput';
import CustomSelect from '@atoms/CustomSelect';
import CustomButton from '@atoms/CustomButton';
import CustomDropdown from '@atoms/CustomDropdown';
import CustomIcon from '@atoms/CustomIcon';
import CustomModal from '@atoms/CustomModal';
import CustomSwitch from '@atoms/CustomSwitch';
import CustomTag from '@atoms/CustomTag';
import { confirm } from '@atoms/CustomConfirm';
import ImportToolsDialog from '@molecules/ImportToolsDialog';
import JsonEditor from '@molecules/JsonEditor';
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
import * as styles from '@styles/toolsPage.module.scss';

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

const methodBadgeClass = (method: HttpToolMethod): string => {
  switch (method) {
    case 'GET':
      return styles.methodGet;
    case 'POST':
      return styles.methodPost;
    case 'PUT':
    case 'PATCH':
      return styles.methodPut;
    case 'DELETE':
      return styles.methodDelete;
    default:
      return styles.methodGet;
  }
};

const formatToolJson = (raw: string | null | undefined): string =>
  raw?.trim() ? formatJson(raw) || raw : '';

const normalizeForm = (f: CreateToolRequest): CreateToolRequest => ({
  name: f.name.trim(),
  description: (f.description || '').trim(),
  method: f.method,
  host: f.host.trim(),
  endpoint: f.endpoint.trim(),
  requestSchema: (f.requestSchema || '').trim(),
  authProfileId: f.authProfileId || '',
  authType: f.authType || 'none',
  authConfig: (f.authConfig || '').trim(),
  enabled: f.enabled ?? true,
});

const formsEqual = (a: CreateToolRequest, b: CreateToolRequest): boolean => {
  const na = normalizeForm(a);
  const nb = normalizeForm(b);
  return (
    na.name === nb.name &&
    na.description === nb.description &&
    na.method === nb.method &&
    na.host === nb.host &&
    na.endpoint === nb.endpoint &&
    na.requestSchema === nb.requestSchema &&
    na.authProfileId === nb.authProfileId &&
    na.authType === nb.authType &&
    na.authConfig === nb.authConfig &&
    na.enabled === nb.enabled
  );
};

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
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const selectedTool = useMemo(
    () => items.find((t) => t.id === editingId) || null,
    [items, editingId]
  );

  const savedForm = useMemo<CreateToolRequest>(() => {
    if (editingId === 'new') return EMPTY;
    if (!selectedTool) return EMPTY;
    return {
      name: selectedTool.name,
      description: selectedTool.description,
      method: selectedTool.method,
      host: selectedTool.host,
      endpoint: selectedTool.endpoint,
      requestSchema: formatToolJson(selectedTool.requestSchema),
      authProfileId: selectedTool.authProfileId || '',
      authType: selectedTool.authType || 'none',
      authConfig: formatToolJson(selectedTool.authConfig),
      enabled: selectedTool.enabled,
    };
  }, [editingId, selectedTool]);

  const isDirty = useMemo(
    () => editingId !== null && !formsEqual(form, savedForm),
    [form, savedForm, editingId]
  );

  const canSave =
    isDirty &&
    !!form.name.trim() &&
    !!form.host.trim() &&
    !!form.endpoint.trim() &&
    !saving;

  const refresh = useCallback(async () => {
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
  }, [assistantId, openNotification]);

  useEffect(() => {
    void refresh();
    setEditingId(null);
    setForm(EMPTY);
  }, [assistantId, refresh]);

  useEffect(() => {
    if (!assistantId) {
      setProfiles([]);
      return;
    }
    authProfilesApi.list(assistantId).then(setProfiles).catch(() => setProfiles([]));
  }, [assistantId]);

  const discardIfDirty = (action: () => void) => {
    if (!isDirty) {
      action();
      return;
    }
    confirm({
      title: 'Discard unsaved changes?',
      body: 'You have unsaved edits for this tool.',
      danger: true,
      okText: 'Discard',
      onOk: action,
    });
  };

  const startNew = () => {
    if (!assistantId) {
      openNotification('Pick an assistant first', 'Warning');
      return;
    }
    discardIfDirty(() => {
      setEditingId('new');
      setForm(EMPTY);
      setError('');
      setTestOutput(null);
      setTestError('');
      setTestInput('');
      setTestModalOpen(false);
      setAuthModalOpen(false);
    });
  };

  const startEdit = (t: AgentToolDto) => {
    if (editingId === t.id) return;
    discardIfDirty(() => {
      setEditingId(t.id);
      setForm({
        name: t.name,
        description: t.description,
        method: t.method,
        host: t.host,
        endpoint: t.endpoint,
        requestSchema: formatToolJson(t.requestSchema),
        authProfileId: t.authProfileId || '',
        authType: t.authType || 'none',
        authConfig: formatToolJson(t.authConfig),
        enabled: t.enabled,
      });
      setError('');
      setTestOutput(null);
      setTestError('');
      setTestInput('');
      setTestModalOpen(false);
      setAuthModalOpen(false);
    });
  };

  const cancel = () => {
    setEditingId(null);
    setForm(EMPTY);
    setError('');
    setTestOutput(null);
    setTestError('');
    setTestModalOpen(false);
    setAuthModalOpen(false);
  };

  const save = async () => {
    if (!form.name.trim() || !form.host.trim() || !form.endpoint.trim()) {
      setError('Name, host, and endpoint are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body: CreateToolRequest = {
        ...normalizeForm(form),
        authProfileId: form.authProfileId || null,
        authType: form.authType || null,
        authConfig: form.authConfig?.trim() || null,
      };
      if (editingId === 'new') {
        const created = await toolsApi.create(assistantId, body);
        openNotification(`Tool "${created.name}" created`, 'Success');
        setEditingId(created.id);
        setForm({
          name: created.name,
          description: created.description,
          method: created.method,
          host: created.host,
          endpoint: created.endpoint,
          requestSchema: formatToolJson(created.requestSchema),
          authProfileId: created.authProfileId || '',
          authType: created.authType || 'none',
          authConfig: formatToolJson(created.authConfig),
          enabled: created.enabled,
        });
      } else if (editingId) {
        const updated = await toolsApi.update(editingId, body);
        openNotification(`Tool "${updated.name}" updated`, 'Success');
        setForm({
          name: updated.name,
          description: updated.description,
          method: updated.method,
          host: updated.host,
          endpoint: updated.endpoint,
          requestSchema: formatToolJson(updated.requestSchema),
          authProfileId: updated.authProfileId || '',
          authType: updated.authType || 'none',
          authConfig: formatToolJson(updated.authConfig),
          enabled: updated.enabled,
        });
      }
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: AgentToolDto) => {
    confirm({
      title: `Delete "${t.name}"?`,
      body: 'This removes the HTTP tool from this assistant.',
      danger: true,
      okText: 'Delete',
      onOk: async () => {
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
      },
    });
  };

  const toggleEnabled = (checked: boolean) => {
    setForm((f) => ({ ...f, enabled: checked }));
  };

  const authSummary = useMemo(() => {
    if (form.authProfileId) {
      const profile = profiles.find((p) => p.id === form.authProfileId);
      return profile ? `Profile · ${profile.name}` : 'Auth profile';
    }
    if (form.authType && form.authType !== 'none') {
      const typeLabel =
        TOOL_AUTH_TYPES.find((t) => t.value === form.authType)?.label ||
        form.authType;
      return `Inline · ${typeLabel}`;
    }
    return 'None';
  }, [form.authProfileId, form.authType, profiles]);

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

  const profileOptions = [
    { value: '', label: 'None (inline auth)' },
    ...profiles.map((p) => ({ value: p.id, label: p.name })),
  ];

  const headerTitle =
    editingId === 'new' ? 'New tool' : form.name.trim() || 'Untitled tool';

  const headerEndpoint =
    form.host.trim() || form.endpoint.trim()
      ? `${form.method} · ${form.host.trim()}${form.endpoint.trim()}`
      : `${form.method} · configure endpoint`;

  const actionMenuItems = [
    {
      key: 'auth',
      label: (
        <span className={styles.menuItem}>
          <CustomIcon name="key" size={14} />
          Authentication
        </span>
      ),
      onClick: () => setAuthModalOpen(true),
    },
    ...(selectedTool
      ? [
          {
            key: 'delete',
            label: (
              <span className={`${styles.menuItem} ${styles.menuItemDanger}`}>
                <CustomIcon name="delete" size={14} />
                Delete
              </span>
            ),
            danger: true,
            onClick: () => void remove(selectedTool),
          },
        ]
      : []),
  ];

  return (
    <>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderMain}>
            <div className={styles.pageEyebrow}>Tools</div>
            <h1 className={styles.pageTitle}>HTTP tools</h1>
            <p className={styles.pageSubtitle}>
              {assistant
                ? `Endpoints ${assistant.name} can call as tools.`
                : 'Register HTTP endpoints the assistant can call as tools.'}
            </p>
          </div>
          <div className={styles.pageHeaderActions}>
            <CustomButton
              variant="ghost"
              size="small"
              onClick={() => setImportOpen(true)}
              disabled={!assistantId}
            >
              Import
            </CustomButton>
          </div>
        </header>

        <div className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarTitle}>Tools</span>
              <CustomButton
                variant="primary"
                size="small"
                disabled={!assistantId}
                onClick={startNew}
              >
                <CustomIcon name="plus" size={14} />
                New
              </CustomButton>
            </div>
            <div className={styles.toolList}>
              {!assistantId && (
                <div className={styles.emptyList}>
                  Pick an assistant in the left menu
                </div>
              )}
              {assistantId && items.length === 0 && editingId !== 'new' && (
                <div className={styles.emptyList}>No tools yet</div>
              )}
              {editingId === 'new' && (
                <button
                  type="button"
                  className={`${styles.toolRow} ${styles.toolRowActive}`}
                >
                  <div className={styles.toolRowTop}>
                    <span
                      className={`${styles.methodBadge} ${methodBadgeClass('GET')}`}
                    >
                      NEW
                    </span>
                    <span className={styles.toolRowName}>New tool</span>
                  </div>
                </button>
              )}
              {items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.toolRow} ${
                    editingId === t.id ? styles.toolRowActive : ''
                  } ${!t.enabled ? styles.toolRowDisabled : ''}`}
                  onClick={() => startEdit(t)}
                >
                  <div className={styles.toolRowTop}>
                    <span
                      className={`${styles.methodBadge} ${methodBadgeClass(t.method)}`}
                    >
                      {t.method}
                    </span>
                    <span className={styles.toolRowName}>{t.name}</span>
                  </div>
                  <span className={styles.toolRowMeta}>{t.endpoint}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.editorPane}>
            {!editingId ? (
              <div className={styles.editorEmpty}>
                <CustomIcon name="tool" size={28} />
                <p>Select or create a tool</p>
                <span>
                  Pick a tool from the list, or click <strong>New</strong> to
                  register an HTTP endpoint.
                </span>
              </div>
            ) : (
              <>
                <div className={styles.editorHeader}>
                  <div className={styles.editorHeaderMain}>
                    <h2 className={styles.editorTitle}>{headerTitle}</h2>
                    <p className={styles.editorEndpoint}>{headerEndpoint}</p>
                  </div>
                  <div className={styles.editorHeaderActions}>
                    {editingId !== 'new' && (
                      <CustomButton
                        variant="ghost"
                        size="small"
                        onClick={() => setTestModalOpen(true)}
                      >
                        <CustomIcon name="play" size={14} />
                        Test
                      </CustomButton>
                    )}
                    <CustomSwitch
                      checked={!!form.enabled}
                      onChange={toggleEnabled}
                      ariaLabel={
                        form.enabled ? 'Disable tool' : 'Enable tool'
                      }
                    />
                    <CustomDropdown
                      items={actionMenuItems}
                      placement="bottomRight"
                    >
                      <CustomButton
                        variant="text"
                        size="small"
                        aria-label="Tool actions"
                      >
                        <CustomIcon name="more" size={16} />
                      </CustomButton>
                    </CustomDropdown>
                  </div>
                </div>

                <div className={styles.formScroll}>
                  <FormTemplate
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save();
                    }}
                  >
                  <div className={styles.formGrid}>
                    <div>
                      <label className={styles.fieldLabel}>Name</label>
                      <CustomInput
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="e.g. getOrder"
                        fullWidth
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Method</label>
                      <CustomSelect
                        options={HTTP_METHODS.map((m) => ({
                          value: m,
                          label: m,
                        }))}
                        value={form.method}
                        onChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            method: v as HttpToolMethod,
                          }))
                        }
                        fullWidth
                      />
                    </div>
                    <div className={styles.formGridFull}>
                      <label className={styles.fieldLabel}>Description</label>
                      <CustomInput
                        value={form.description || ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                        placeholder="What does this tool do?"
                        fullWidth
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Host</label>
                      <CustomInput
                        value={form.host}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, host: e.target.value }))
                        }
                        placeholder="https://api.example.com"
                        fullWidth
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Endpoint</label>
                      <CustomInput
                        value={form.endpoint}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            endpoint: e.target.value,
                          }))
                        }
                        placeholder="/v1/things/{id}"
                        fullWidth
                      />
                    </div>
                    <div className={styles.formGridFull}>
                      <label className={styles.fieldLabel}>
                        Request schema
                      </label>
                      <JsonEditor
                        value={form.requestSchema || ''}
                        onChange={(next) =>
                          setForm((f) => ({ ...f, requestSchema: next }))
                        }
                        placeholder='{"type":"object","properties":{...}}'
                        minRows={10}
                        maxRows={22}
                        ariaLabel="Request schema JSON"
                      />
                    </div>
                  </div>

                  {error && <div className={styles.formError}>{error}</div>}
                  </FormTemplate>
                </div>

                <div className={styles.formFooter}>
                  <CustomButton
                    variant="primary"
                    onClick={() => void save()}
                    loading={saving}
                    disabled={!canSave}
                  >
                    Save
                  </CustomButton>
                  {editingId === 'new' && (
                    <CustomButton
                      variant="secondary"
                      onClick={cancel}
                      disabled={saving}
                    >
                      Cancel
                    </CustomButton>
                  )}
                  {isDirty && (
                    <span className={styles.dirtyHint}>Unsaved changes</span>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <ImportToolsDialog
        open={importOpen}
        assistantId={assistantId}
        onClose={() => setImportOpen(false)}
        onImported={refresh}
      />

      <CustomModal
        open={testModalOpen}
        title={`Test · ${form.name.trim() || 'Tool'}`}
        onClose={() => setTestModalOpen(false)}
        width="lg"
        footer={
          <>
            <CustomButton
              variant="secondary"
              onClick={() => setTestModalOpen(false)}
              disabled={testing}
            >
              Close
            </CustomButton>
            <CustomButton
              variant="primary"
              onClick={() => void runTest()}
              loading={testing}
            >
              <CustomIcon name="play" size={14} />
              Run test
            </CustomButton>
          </>
        }
      >
        <div className={styles.testModalBody}>
          {isDirty && (
            <p className={styles.testModalHint}>
              Save the tool first to test your latest changes.
            </p>
          )}
          <label className={styles.fieldLabel}>Input</label>
          <JsonEditor
            value={testInput}
            onChange={setTestInput}
            placeholder='{"orderId":"123"}'
            minRows={6}
            maxRows={14}
            ariaLabel="Test input JSON"
          />
          {testError && (
            <div className={styles.formError}>
              <CustomTag tone="error">Error</CustomTag> {testError}
            </div>
          )}
          {testOutput != null && (
            <>
              <label className={styles.fieldLabel}>Output</label>
              <JsonEditor
                value={formatJson(testOutput)}
                readOnly
                minRows={6}
                maxRows={16}
                ariaLabel="Test output JSON"
              />
            </>
          )}
        </div>
      </CustomModal>

      <CustomModal
        open={authModalOpen}
        title={`Authentication · ${form.name.trim() || 'Tool'}`}
        onClose={() => setAuthModalOpen(false)}
        width="md"
        footer={
          <CustomButton
            variant="primary"
            onClick={() => setAuthModalOpen(false)}
          >
            Done
          </CustomButton>
        }
      >
        <div className={styles.authModalBody}>
          <p className={styles.authModalSummary}>
            Current: <strong>{authSummary}</strong>
          </p>
          <label className={styles.fieldLabel}>Auth profile</label>
          <CustomSelect
            options={profileOptions}
            value={form.authProfileId || ''}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                authProfileId: (v as string) || '',
              }))
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
              <JsonEditor
                value={form.authConfig || ''}
                onChange={(next) =>
                  setForm((f) => ({ ...f, authConfig: next }))
                }
                placeholder='{"name":"X-Api-Key","value":"..."}'
                minRows={5}
                maxRows={12}
                compact
                ariaLabel="Inline auth config JSON"
              />
            </>
          )}
        </div>
      </CustomModal>
    </>
  );
};

export default ToolsPage;
