import { useParams } from 'react-router-dom';

import { ArtifactFullPageView } from '@/components/artifact/ArtifactFullPageView';

export function ArtifactPage() {
  const { artifactId } = useParams<{ artifactId: string }>();
  return <ArtifactFullPageView artifactId={artifactId} />;
}
