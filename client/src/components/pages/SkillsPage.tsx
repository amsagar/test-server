import React, { useEffect, useMemo, useState } from 'react';
import ResourcePanelTemplate from '@templates/ResourcePanelTemplate';
import FormTemplate from '@templates/FormTemplate';
import CustomInput from '@atoms/CustomInput';
import CustomTextarea from '@atoms/CustomTextarea';
import CustomButton from '@atoms/CustomButton';
import CustomFileUpload from '@atoms/CustomFileUpload';
import CustomTag from '@atoms/CustomTag';
import { useSettingsScope } from '@providers/SettingsScopeProvider';
import { skillsApi } from '@apiCalls/services';
import { useNotification } from '@providers/NotificationProviders';
import type { SkillDto } from '@interfaces/skill.interface';
import * as styles from '@styles/resourcePanel.module.scss';

const SkillsPage: React.FC = () => {
  const openNotification = useNotification();
  const { assistant, assistantId } = useSettingsScope();
  const [items, setItems] = useState<SkillDto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!assistantId) {
      setItems([]);
      return;
    }
    try {
      setItems(await skillsApi.list(assistantId));
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to load skills',
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
    setFormName('');
    setFormDescription('');
    setFormEnabled(true);
    setNewFile(null);
    setReplaceFile(null);
    setError('');
  };

  const startEdit = (s: SkillDto) => {
    setEditingId(s.id);
    setFormName(s.name);
    setFormDescription(s.description);
    setFormEnabled(s.enabled);
    setNewFile(null);
    setReplaceFile(null);
    setError('');
  };

  const cancel = () => {
    setEditingId(null);
    setError('');
    setNewFile(null);
    setReplaceFile(null);
  };

  const save = async () => {
    if (editingId === 'new') {
      if (!newFile) {
        setError('Pick a skill file to upload.');
        return;
      }
      setSaving(true);
      try {
        const created = await skillsApi.upload(assistantId, newFile);
        openNotification(`Skill "${created.name}" uploaded`, 'Success');
        cancel();
        await refresh();
      } catch (e) {
        setError((e as Error)?.message || 'Failed to upload skill');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!editingId) return;

    if (!formName.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      if (replaceFile) {
        await skillsApi.replaceFile(editingId, replaceFile);
      }
      const updated = await skillsApi.updateMeta(editingId, {
        name: formName.trim(),
        description: formDescription,
        enabled: formEnabled,
      });
      openNotification(`Skill "${updated.name}" updated`, 'Success');
      cancel();
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: SkillDto) => {
    try {
      await skillsApi.delete(s.id);
      if (editingId === s.id) cancel();
      await refresh();
      openNotification(`Skill "${s.name}" deleted`, 'Success');
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to delete skill',
        'Error'
      );
    }
  };

  const listItems = useMemo(
    () =>
      items.map((s) => ({
        id: s.id,
        name: s.name,
        meta: s.enabled ? 'enabled' : 'disabled',
      })),
    [items]
  );

  return (
    <ResourcePanelTemplate
      title="Skills"
      subtitle={
        assistant
          ? `Skill bundles available to ${assistant.name} (markdown / JSON / zip).`
          : 'Per-assistant skill bundles (markdown / JSON / zip).'
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
      newLabel="+ Upload skill"
      emptyListLabel={
        assistantId ? 'No skills yet' : 'Pick an assistant in the left rail'
      }
    >
      <FormTemplate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {editingId === 'new' ? (
          <>
            <label className={styles.fieldLabel}>Skill file</label>
            <CustomFileUpload
              value={newFile}
              onChange={setNewFile}
              dropLabel="Drop your skill file (.md, .json, .zip)"
              buttonLabel="Choose file"
            />
          </>
        ) : (
          <>
            <label className={styles.fieldLabel}>Name</label>
            <CustomInput
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
            />

            <label className={styles.fieldLabel}>Description</label>
            <CustomTextarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              autoSize={{ minRows: 3, maxRows: 10 }}
              fullWidth
            />

            <label className={styles.fieldLabel}>Status</label>
            <CustomTag tone={formEnabled ? 'success' : 'neutral'}>
              {formEnabled ? 'Enabled' : 'Disabled'}
            </CustomTag>
            <div>
              <CustomButton
                variant="ghost"
                onClick={() => setFormEnabled((v) => !v)}
              >
                {formEnabled ? 'Disable' : 'Enable'}
              </CustomButton>
            </div>

            <label className={styles.fieldLabel}>Replace file (optional)</label>
            <CustomFileUpload
              value={replaceFile}
              onChange={setReplaceFile}
              dropLabel="Drop a file to replace the existing skill"
              buttonLabel="Choose new file"
            />
          </>
        )}

        {error && <div className={styles.formError}>{error}</div>}

        <div className={styles.formActions}>
          <CustomButton variant="primary" htmlType="submit" loading={saving}>
            {editingId === 'new' ? 'Upload' : 'Save'}
          </CustomButton>
          <CustomButton variant="secondary" onClick={cancel} disabled={saving}>
            Cancel
          </CustomButton>
        </div>
      </FormTemplate>
    </ResourcePanelTemplate>
  );
};

export default SkillsPage;
