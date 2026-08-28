import React from 'react';

import DataBoundary from '@/components/common/DataBoundary';
import ArtifactsGallery from '@/components/gallery/ArtifactsGallery';

/** Route entry. Pages own their own data boundary rather than relying on an ancestor,
 *  so a page is self-contained wherever it is mounted. */
const ArtifactsGalleryPage: React.FC = () => (
  <DataBoundary label="Artifacts">
    <ArtifactsGallery />
  </DataBoundary>
);

export default ArtifactsGalleryPage;
