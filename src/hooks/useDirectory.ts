import { useQuery } from '@tanstack/react-query';

import { artifactApi } from '@/api/artifactApi';

export function useDirectory() {
  return useQuery({
    queryKey: ['directory'] as const,
    queryFn: artifactApi.listDirectory,
  });
}
