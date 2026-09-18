import { useMutation, useQueryClient } from '@tanstack/react-query';

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
    // This conversation's choice and nothing else: the user's default sources
    // (CONTEXT.md, 預設資料來源) are set in the preferences, not by whatever a
    // conversation last submitted. They used to be, and a one-off pick in one
    // conversation quietly became every later conversation's starting point.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionDetailQueryKey(sessionId) });
    },
    // A write that fails silently is how a choice quietly stops sticking.
    onError: toastError,
  });
};
