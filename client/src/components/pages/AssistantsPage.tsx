import React, { useEffect, useMemo, useState } from 'react';
import ResourcePanelTemplate from '@templates/ResourcePanelTemplate';
import FormTemplate from '@templates/FormTemplate';
import CustomInput from '@atoms/CustomInput';
import CustomButton from '@atoms/CustomButton';
import MarkdownEditor from '@molecules/MarkdownEditor';
import { assistantsApi } from '@apiCalls/services';
import { useNotification } from '@providers/NotificationProviders';
import { useSettingsScope } from '@providers/SettingsScopeProvider';
import type {
  AssistantDto,
  BuiltinToolDto,
  CreateAssistantRequest,
} from '@interfaces/assistant.interface';
import * as styles from '@styles/resourcePanel.module.scss';
import * as assistantStyles from '@styles/assistantForm.module.scss';

const EMPTY_FORM: CreateAssistantRequest = {
  name: '',
  systemPrompt: '',
  builtinTools: [],
};

const AssistantsPage: React.FC = () => {
  const openNotification = useNotification();
  const {
    assistants,
    assistantId,
    setAssistantId,
    refreshAssistants,
  } = useSettingsScope();
  const [builtins, setBuiltins] = useState<BuiltinToolDto[]>([]);
  const [creatingNew, setCreatingNew] = useState(false);
  const [form, setForm] = useState<CreateAssistantRequest>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedId = creatingNew ? 'new' : assistantId || null;

  const currentAssistant: AssistantDto | null = useMemo(
    () => assistants.find((a) => a.id === assistantId) || null,
    [assistants, assistantId]
  );

  useEffect(() => {
    assistantsApi
      .builtinTools()
      .then(setBuiltins)
      .catch(() => setBuiltins([]));
  }, []);

  useEffect(() => {
    if (creatingNew) return;
    if (currentAssistant) {
      setForm({
        name: currentAssistant.name,
        systemPrompt: currentAssistant.systemPrompt,
        builtinTools: currentAssistant.builtinTools || [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [currentAssistant, creatingNew]);

  const startNew = () => {
    setCreatingNew(true);
    setForm(EMPTY_FORM);
    setError('');
  };

  const cancelNew = () => {
    setCreatingNew(false);
    setError('');
  };

  const toggleTool = (key: string) => {
    setForm((f) => ({
      ...f,
      builtinTools: f.builtinTools.includes(key)
        ? f.builtinTools.filter((k) => k !== key)
        : [...f.builtinTools, key],
    }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) {
      setError('Name and system prompt are required.');
      return;
    }
    setSaving(true);
    try {
      const body: CreateAssistantRequest = {
        name: form.name.trim(),
        systemPrompt: form.systemPrompt,
        builtinTools: form.builtinTools,
      };
      if (creatingNew) {
        const created = await assistantsApi.create(body);
        openNotification(`Assistant "${created.name}" created`, 'Success');
        await refreshAssistants();
        setAssistantId(created.id);
        setCreatingNew(false);
      } else if (assistantId) {
        const updated = await assistantsApi.update(assistantId, body);
        openNotification(`Assistant "${updated.name}" updated`, 'Success');
        await refreshAssistants();
      }
    } catch (e) {
      setError((e as Error)?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: AssistantDto) => {
    try {
      await assistantsApi.delete(a.id);
      openNotification(`Assistant "${a.name}" deleted`, 'Success');
      await refreshAssistants();
      if (creatingNew) setCreatingNew(false);
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to delete assistant',
        'Error'
      );
    }
  };

  const listItems = useMemo(
    () =>
      assistants.map((a) => ({
        id: a.id,
        name: a.name,
        meta: `${(a.builtinTools || []).length} tools`,
      })),
    [assistants]
  );

  return (
    <ResourcePanelTemplate
      title="Assistants"
      subtitle="Configure name, system prompt, and built-in tool access. Pick one to edit it (all other settings sections will follow this scope)."
      items={listItems}
      selectedId={selectedId}
      onSelect={(it) => {
        setCreatingNew(false);
        setAssistantId(it.id);
      }}
      onNew={startNew}
      onDelete={(it) => {
        const found = assistants.find((x) => x.id === it.id);
        if (found) return remove(found);
      }}
      newLabel="+ New assistant"
      emptyListLabel="No assistants yet"
    >
      <FormTemplate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className={assistantStyles.topGrid}>
          <div className={assistantStyles.nameField}>
            <label className={styles.fieldLabel}>Name</label>
            <CustomInput
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. SQL Helper"
              fullWidth
            />
          </div>

          <div className={assistantStyles.toolsField}>
            <label className={styles.fieldLabel}>Built-in tools</label>
            <div className={assistantStyles.toolChips}>
              {builtins.length === 0 ? (
                <div className={styles.fieldHelp}>
                  No built-in tools available.
                </div>
              ) : (
                builtins.map((t) => {
                  const active = form.builtinTools.includes(t.key);
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => toggleTool(t.key)}
                      className={`${assistantStyles.toolChip} ${
                        active ? assistantStyles.toolChipActive : ''
                      }`}
                      aria-pressed={active}
                      title={t.label}
                    >
                      <span className={assistantStyles.toolChipDot} />
                      {t.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className={assistantStyles.promptSection}>
          <div className={assistantStyles.promptHeader}>
            <label className={styles.fieldLabel}>System prompt</label>
            <span className={assistantStyles.promptCount}>
              {form.systemPrompt.length.toLocaleString()} chars
            </span>
          </div>
          <MarkdownEditor
            value={form.systemPrompt}
            onChange={(next) =>
              setForm((f) => ({ ...f, systemPrompt: next }))
            }
            placeholder="Describe how this assistant should behave. Markdown is supported — switch to Preview to see it rendered."
            minRows={16}
            maxRows={32}
            ariaLabel="System prompt"
          />
          <div className={styles.fieldHelp}>
            HTTP tools, skills, documents, and MCP servers are managed in
            their own sections in the left rail.
          </div>
        </div>

        {error && <div className={styles.formError}>{error}</div>}

        <div className={styles.formActions}>
          <CustomButton variant="primary" htmlType="submit" loading={saving}>
            {creatingNew ? 'Create assistant' : 'Save changes'}
          </CustomButton>
          {creatingNew && (
            <CustomButton
              variant="secondary"
              onClick={cancelNew}
              disabled={saving}
            >
              Cancel
            </CustomButton>
          )}
        </div>
      </FormTemplate>
    </ResourcePanelTemplate>
  );
};

export default AssistantsPage;
