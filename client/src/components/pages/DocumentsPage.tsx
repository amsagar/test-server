import React, { useEffect, useMemo, useState } from 'react';
import ResourcePanelTemplate from '@templates/ResourcePanelTemplate';
import FormTemplate from '@templates/FormTemplate';
import CustomInput from '@atoms/CustomInput';
import CustomButton from '@atoms/CustomButton';
import CustomFileUpload from '@atoms/CustomFileUpload';
import CustomTag from '@atoms/CustomTag';
import { useSettingsScope } from '@providers/SettingsScopeProvider';
import { documentsApi } from '@apiCalls/services';
import { useNotification } from '@providers/NotificationProviders';
import type { DocumentDto } from '@interfaces/document.interface';
import * as styles from '@styles/resourcePanel.module.scss';

const DocumentsPage: React.FC = () => {
  const openNotification = useNotification();
  const { assistant, assistantId } = useSettingsScope();
  const [items, setItems] = useState<DocumentDto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!assistantId) {
      setItems([]);
      return;
    }
    try {
      setItems(await documentsApi.list(assistantId));
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to load documents',
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
    setNewFile(null);
    setFormName('');
    setFormEnabled(true);
    setError('');
  };

  const startEdit = (d: DocumentDto) => {
    setEditingId(d.id);
    setFormName(d.name);
    setFormEnabled(d.enabled);
    setNewFile(null);
    setError('');
  };

  const cancel = () => {
    setEditingId(null);
    setError('');
    setNewFile(null);
  };

  const save = async () => {
    if (editingId === 'new') {
      if (!newFile) {
        setError('Pick a file to upload.');
        return;
      }
      setSaving(true);
      try {
        const created = await documentsApi.upload(assistantId, newFile);
        openNotification(`Document "${created.name}" uploaded`, 'Success');
        cancel();
        await refresh();
      } catch (e) {
        setError((e as Error)?.message || 'Failed to upload document');
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
      const updated = await documentsApi.update(editingId, {
        name: formName.trim(),
        enabled: formEnabled,
      });
      openNotification(`Document "${updated.name}" updated`, 'Success');
      cancel();
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: DocumentDto) => {
    try {
      await documentsApi.delete(d.id);
      if (editingId === d.id) cancel();
      await refresh();
      openNotification(`Document "${d.name}" deleted`, 'Success');
    } catch (e) {
      openNotification(
        (e as Error)?.message || 'Failed to delete document',
        'Error'
      );
    }
  };

  const listItems = useMemo(
    () =>
      items.map((d) => ({
        id: d.id,
        name: d.name,
        meta: `${d.chunkCount} chunks · ${d.enabled ? 'enabled' : 'disabled'}`,
      })),
    [items]
  );

  return (
    <ResourcePanelTemplate
      title="Documents"
      subtitle={
        assistant
          ? `Reference documents ${assistant.name} can retrieve from (RAG).`
          : 'Reference documents the assistant can retrieve from (RAG).'
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
      newLabel="+ Upload document"
      emptyListLabel={
        assistantId ? 'No documents yet' : 'Pick an assistant in the left rail'
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
            <label className={styles.fieldLabel}>Document file</label>
            <CustomFileUpload
              value={newFile}
              onChange={setNewFile}
              dropLabel="Drop a .pdf, .md, .txt, or .docx file"
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

export default DocumentsPage;
