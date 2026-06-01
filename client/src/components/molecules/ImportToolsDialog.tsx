import React, { useState } from 'react';
import CustomModal from '@atoms/CustomModal';
import CustomSelect from '@atoms/CustomSelect';
import CustomInput from '@atoms/CustomInput';
import CustomTextarea from '@atoms/CustomTextarea';
import CustomButton from '@atoms/CustomButton';
import { TOOL_IMPORT_KINDS } from '@constants/toolSourceKinds';
import { toolsApi } from '@apiCalls/services';
import { useNotification } from '@providers/NotificationProviders';
import type { ToolImportKind } from '@interfaces/tool.interface';
import * as styles from '@styles/resourcePanel.module.scss';

export interface ImportToolsDialogProps {
  open: boolean;
  assistantId: string;
  onClose: () => void;
  onImported: () => void;
}

const ImportToolsDialog: React.FC<ImportToolsDialogProps> = ({
  open,
  assistantId,
  onClose,
  onImported,
}) => {
  const openNotification = useNotification();
  const [kind, setKind] = useState<ToolImportKind>('curl');
  const [content, setContent] = useState('');
  const [host, setHost] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setKind('curl');
    setContent('');
    setHost('');
    setError('');
  };

  const submit = async () => {
    if (!content.trim()) {
      setError('Paste a cURL command, OpenAPI spec, or Postman collection.');
      return;
    }
    if (!assistantId) {
      setError('Pick an assistant first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const imported = await toolsApi.import(kind, assistantId, {
        content,
        host: host.trim() || undefined,
      });
      openNotification(`Imported ${imported.length} tool(s)`, 'Success');
      reset();
      onImported();
      onClose();
    } catch (e) {
      setError((e as Error)?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <CustomModal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import tools"
      width="lg"
      footer={
        <>
          <CustomButton
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={busy}
          >
            Cancel
          </CustomButton>
          <CustomButton variant="primary" onClick={submit} loading={busy}>
            Import
          </CustomButton>
        </>
      }
    >
      <label className={styles.fieldLabel}>Source format</label>
      <CustomSelect
        options={TOOL_IMPORT_KINDS.map((k) => ({
          value: k.value,
          label: k.label,
        }))}
        value={kind}
        onChange={(v) => setKind(v as ToolImportKind)}
        fullWidth
      />

      <label className={styles.fieldLabel}>Host override (optional)</label>
      <CustomInput
        value={host}
        onChange={(e) => setHost(e.target.value)}
        placeholder="https://api.example.com"
        fullWidth
      />
      <div className={styles.fieldHelp}>
        Use to replace the inferred host across all imported endpoints.
      </div>

      <label className={styles.fieldLabel}>Source</label>
      <CustomTextarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          kind === 'curl'
            ? 'curl https://api.example.com/v1/things -H "Authorization: Bearer ..."'
            : kind === 'openapi'
              ? 'Paste OpenAPI/Swagger JSON or YAML here'
              : 'Paste Postman collection JSON here'
        }
        autoSize={{ minRows: 10, maxRows: 24 }}
        fullWidth
      />

      {error && <div className={styles.formError}>{error}</div>}
    </CustomModal>
  );
};

export default ImportToolsDialog;
