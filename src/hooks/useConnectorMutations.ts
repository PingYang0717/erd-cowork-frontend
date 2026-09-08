import { useMutation, useQueryClient } from '@tanstack/react-query';

import { rememberSelection } from '@/api/connectorApi';
import { setDataSources } from '@/api/sessionApi';
import { useTranslations } from '@/i18n/useTranslations';
import { useActionErrorToast } from './useActionErrorToast';
import { sessionDetailQueryKey } from './useSessionDetail';

/** Sets which data sources one conversation draws on.
 *
 *  The write goes to the session, not to the connector: what this conversation may read
 *  is a fact about the conversation, and the same source can be attached to one and not
 *  another. Invalidating the session detail is what refreshes the panel, since that is
 *  where the selection lives.
 *
 *  The whole set travels, so this replaces rather than amends — see `setDataSources`. */
export const useSetSessionDataSources = (sessionId: string) => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const toastError = useActionErrorToast(t.errors.notFound.session);

  return useMutation({
    mutationFn: (connectorIds: string[]) => setDataSources(sessionId, connectorIds),
    onSuccess: (_result, connectorIds) => {
      // Remember what the user is working with, so the next conversation opens on this
      // combination instead of asking them to pick it again. A default for the dialog and
      // nothing more — it is never attached to a session on their behalf.
      rememberSelection(connectorIds);
      queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    },
    // A write that fails silently is how a choice quietly stops sticking.
    onError: toastError,
  });
};
