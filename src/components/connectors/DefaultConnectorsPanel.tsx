import React, { useMemo } from 'react';
import { Button, Modal, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';

import { listCatalogue } from '@/api/connectorApi';
import { connectorsQueryKey } from '@/hooks/useConnectors';
import { useDefaultConnectors } from '@/hooks/useDefaultConnectors';
import { useTranslations } from '@/i18n/useTranslations';
import { describeLoadError } from '@/utils/describeLoadError';
import ConnectorsEditor from './ConnectorsEditor';

interface DefaultConnectorsPanelProps {
  open: boolean;
  onClose: () => void;
}

/** The user's default sources (CONTEXT.md, 預設 Connectors): what a new conversation opens
 *  the Connectors panel on. Theirs, across conversations, and only a starting point —
 *  Submit here writes the preference and touches no session.
 *
 *  The catalogue is read as a plain query rather than a suspense one: this opens from the
 *  header, which has no boundary of its own, and a catalogue that cannot be read should
 *  say so inside this dialog rather than take the header down with it. */
const DefaultConnectorsPanel: React.FC<DefaultConnectorsPanelProps> = ({ open, onClose }) => {
  const t = useTranslations();
  const { ids, setIds } = useDefaultConnectors();
  const catalogue = useQuery({ queryKey: connectorsQueryKey, queryFn: listCatalogue, enabled: open });

  // The saved defaults, minus what the catalogue no longer serves: an id it does not
  // know cannot be shown. Kept whether or not it can still be chosen, so a default that
  // has since been disabled is visible and can be let go of, like a session's own.
  const openingIds = useMemo(() => {
    const served = new Set((catalogue.data ?? []).map((connector) => connector.id));
    return ids.filter((id) => served.has(id));
  }, [catalogue.data, ids]);

  if (!open) {
    return null;
  }

  if (catalogue.data === undefined) {
    const failure = catalogue.error !== null ? describeLoadError(catalogue.error, t.errors) : null;
    return (
      <Modal open onCancel={onClose} title={t.connectors.defaultsTitle} footer={null} destroyOnHidden>
        {failure === null ? (
          <Spin aria-label="Loading Connectors" />
        ) : (
          <div role="alert">
            <p>{failure.heading}</p>
            <p>{failure.detail}</p>
            <Button onClick={() => void catalogue.refetch()}>{t.common.retry}</Button>
          </div>
        )}
      </Modal>
    );
  }

  return (
    <ConnectorsEditor
      open
      onClose={onClose}
      title={t.connectors.defaultsTitle}
      subtitle={t.connectors.defaultsSubtitle}
      submitLabel={t.connectors.save}
      catalogue={catalogue.data}
      openingIds={openingIds}
      savedIds={openingIds}
      isPending={false}
      onSubmit={(next) => {
        setIds(next);
        onClose();
      }}
    />
  );
};

export default DefaultConnectorsPanel;
