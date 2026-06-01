import React, { useEffect, useMemo, useState } from 'react';
import ResourcePanelTemplate from '@templates/ResourcePanelTemplate';
import FormTemplate from '@templates/FormTemplate';
import CustomInput from '@atoms/CustomInput';
import CustomTextarea from '@atoms/CustomTextarea';
import CustomButton from '@atoms/CustomButton';
import { useSettingsScope } from '@providers/SettingsScopeProvider';
import { stylesApi } from '@apiCalls/services';
import { useNotification } from '@providers/NotificationProviders';
import type {
  ResponseStyleDto,
  CreateStyleRequest,
} from '@interfaces/style.interface';
import * as styles from '@styles/resourcePanel.module.scss';

const EMPTY: CreateStyleRequest = {
  name: '',
  description: '',
  instructions: '',
};

const ResponseStylesPage: React.FC = () => {
  const openNotification = useNotification();
  const { assistantId } = useSettingsScope();
  const [items, setItems] = useState<ResponseStyleDto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateStyleRequest>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!assistantId) {
      setItems([]);
      return;
    }
    try {
      setItems(await stylesApi.list(assistantId));
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to load styles',
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

  const startEdit = (s: ResponseStyleDto) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description,
      instructions: s.instructions,
    });
    setError('');
  };

  const cancel = () => {
    setEditingId(null);
    setForm(EMPTY);
    setError('');
  };

  const save = async () => {
    if (!form.name.trim() || !form.instructions.trim()) {
      setError('Name and instructions are required.');
      return;
    }
    setSaving(true);
    try {
      const body: CreateStyleRequest = {
        name: form.name.trim(),
        description: form.description?.trim() || '',
        instructions: form.instructions,
      };
      if (editingId === 'new') {
        const created = await stylesApi.create(assistantId, body);
        openNotification(`Style "${created.name}" created`, 'Success');
      } else if (editingId) {
        const updated = await stylesApi.update(editingId, body);
        openNotification(`Style "${updated.name}" updated`, 'Success');
      }
      cancel();
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: ResponseStyleDto) => {
    try {
      await stylesApi.delete(s.id);
      if (editingId === s.id) cancel();
      await refresh();
      openNotification(`Style "${s.name}" deleted`, 'Success');
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to delete style',
        'Error'
      );
    }
  };

  const listItems = useMemo(
    () =>
      items.map((s) => ({
        id: s.id,
        name: s.name,
        meta: s.description || undefined,
      })),
    [items]
  );

  return (
    <ResourcePanelTemplate
      title="Response Styles"
      subtitle="Reusable instruction snippets you can pin per chat session."
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
      newLabel="+ New style"
      emptyListLabel="No styles yet"
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
          placeholder="e.g. Crisp & technical"
          fullWidth
        />

        <label className={styles.fieldLabel}>Description</label>
        <CustomInput
          value={form.description || ''}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          placeholder="Short summary shown in the picker"
          fullWidth
        />

        <label className={styles.fieldLabel}>Instructions</label>
        <CustomTextarea
          value={form.instructions}
          onChange={(e) =>
            setForm((f) => ({ ...f, instructions: e.target.value }))
          }
          placeholder="e.g. Keep responses under 5 bullet points..."
          autoSize={{ minRows: 8, maxRows: 24 }}
          fullWidth
        />

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

export default ResponseStylesPage;
