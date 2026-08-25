import { useSuspenseQuery } from '@tanstack/react-query';

import { artifactApi } from '@/api/artifactApi';

export function useDirectory() {
  return useSuspenseQuery({
    queryKey: ['directory'] as const,
    queryFn: artifactApi.listDirectory,
  });
}
