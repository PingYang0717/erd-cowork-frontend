import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/services/apiClient';

interface ExampleWidget {
  id: string;
  name: string;
}

function fetchExampleWidgets() {
  // apiClient's response interceptor already unwraps `response.data`, so the
  // runtime value is `ExampleWidget[]` even though axios's own types still
  // say `AxiosResponse<ExampleWidget[]>`.
  return apiClient.get<ExampleWidget[]>('/example-widgets') as unknown as Promise<ExampleWidget[]>;
}

export function ExampleWidgetsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['example-widgets'],
    queryFn: fetchExampleWidgets,
  });

  if (isLoading || !data) {
    return <p>Loading...</p>;
  }

  return (
    <ul aria-label="example widgets">
      {data.map((widget) => (
        <li key={widget.id}>{widget.name}</li>
      ))}
    </ul>
  );
}
