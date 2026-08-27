import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/apiClient';

interface ExampleWidget {
  id: string;
  name: string;
}

function fetchExampleWidgets() {
  return apiClient.get<ExampleWidget[]>('/example-widgets').then((res) => res.data);
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
