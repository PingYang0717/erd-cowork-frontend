import { useParams } from 'react-router-dom';

import { ArtifactFullPageView } from '@/features/artifact/components/ArtifactFullPageView';

export function ArtifactPage() {
  const { artifactId } = useParams<{ artifactId: string }>();
  return <ArtifactFullPageView artifactId={artifactId} />;
}
