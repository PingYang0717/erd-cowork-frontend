import React, { useMemo } from 'react';

import { useSetSessionDataSources } from '@/hooks/useConnectorMutations';
import { useConnectors } from '@/hooks/useConnectors';
import { useDefaultConnectors } from '@/hooks/useDefaultConnectors';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useTranslations } from '@/i18n/useTranslations';
import { sourceKindOf } from '@/utils/sourceKind';
import ConnectorsEditor from './ConnectorsEditor';

interface ConnectorsPanelProps {
  /** Data sources attach per conversation, so the panel edits this session's set. */
  sessionId: string;
  open: boolean;
  onClose: () => void;
}

/** What one conversation draws on (CONTEXT.md, 已選來源), edited as a draft and written
 *  as one set. The picker itself is ConnectorsEditor; this decides what it opens on and
 *  where Submit goes. */
const ConnectorsPanel: React.FC<ConnectorsPanelProps> = ({ sessionId, open, onClose }) => {
  const t = useTranslations();
  const { catalogue, attachedIds } = useConnectors(sessionId);
  const { data: detail } = useSessionDetail(sessionId);
  const { ids: defaultIds } = useDefaultConnectors();
  const setDataSources = useSetSessionDataSources(sessionId);

  // One kind of data source per conversation, fixed once either is attached (CONTEXT.md,
  // 來源種類). A conversation on files cannot take sources on. The composer greys its
  // entry out, but the question card links here too — so the panel still opens, says
  // why, and offers nothing to press.
  const blockedByFiles = sourceKindOf(detail) === 'files';

  /** What to open on: this conversation's own selection, or — only when it has none —
   *  the user's default sources.
   *
   *  Intersected with the catalogue both ways. A default id the catalogue no longer
   *  serves cannot be shown, and submitting it would send the backend an id it does not
   *  know; a session id that has gone the same way is a source the user cannot see in the
   *  list, so counting it would claim they are using something invisible.
   *
   *  The conversation's own ids are kept whether or not they can still be chosen. A source
   *  it already draws on that has since been disabled is still a fact about the session,
   *  and dropping it from the draft made an untouched Submit detach it without a word.
   *  The default is only a default, so it is not offered on anything that cannot be
   *  chosen.
   *
   *  A default offered here and nowhere else. Nothing is attached to a session on the
   *  user's behalf: it reaches the backend when they press Submit, like every other
   *  choice on this panel. */
  const openingIds = useMemo(() => {
    const served = new Set(catalogue.map((connector) => connector.id));
    if (attachedIds.length > 0) {
      return attachedIds.filter((id) => served.has(id));
    }
    // No default either when the conversation cannot take sources on: a default
    // offered here would make Submit live on a panel that must not write.
    if (blockedByFiles) {
      return [];
    }
    const choosable = new Set(catalogue.filter((connector) => connector.enabled).map((connector) => connector.id));
    return defaultIds.filter((id) => choosable.has(id));
  }, [catalogue, attachedIds, blockedByFiles, defaultIds]);

  return (
    <ConnectorsEditor
      open={open}
      onClose={onClose}
      title={t.connectors.title}
      subtitle={t.connectors.subtitle}
      submitLabel={t.connectors.submit}
      catalogue={catalogue}
      openingIds={openingIds}
      savedIds={attachedIds}
      attachedIds={attachedIds}
      readOnlyNotice={blockedByFiles ? t.connectors.blockedByFiles : undefined}
      isPending={setDataSources.isPending}
      // The whole selection in a single request: it describes the outcome rather than a
      // change, so two panels or a double-press cannot land in an order that decides it.
      onSubmit={(ids) => setDataSources.mutate(ids, { onSuccess: onClose })}
    />
  );
};

export default ConnectorsPanel;
