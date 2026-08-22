import { useMutation } from '@tanstack/react-query';

import { messageApi, type SendMessageInput } from '../api/messageApi';

export function useSendMessage(sessionId: string) {
  return useMutation({
    mutationFn: (input: SendMessageInput) => messageApi.sendMessage(sessionId, input),
  });
}
