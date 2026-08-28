import React from 'react';
import { useParams } from 'react-router-dom';

import ArtifactFullPageView from '@/components/artifact/ArtifactFullPageView';
import DataBoundary from '@/components/common/DataBoundary';

const ArtifactPage: React.FC = () => {
  const { artifactId } = useParams<{ artifactId: string }>();

  return (
    <DataBoundary label="Artifact">
      <ArtifactFullPageView artifactId={artifactId} />
    </DataBoundary>
  );
};

export default ArtifactPage;
