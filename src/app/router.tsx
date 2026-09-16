import { createHashRouter, Navigate } from 'react-router-dom';

import AppShell from '@/components/layouts/AppShell';
import StudioShell from '@/components/layouts/StudioShell';
import ArtifactPage from '@/pages/Artifact/ArtifactPage';
import ArtifactsGalleryPage from '@/pages/ArtifactsGallery/ArtifactsGalleryPage';
import SkillsPage from '@/pages/Skills/SkillsPage';
import StudioPage from '@/pages/Studio/StudioPage';

export const router = createHashRouter([
  {
    // The header (AppShell) is on every screen; the routes below decide only what
    // sits under it.
    element: <AppShell />,
    children: [
      {
        path: '/',
        element: <Navigate to="/cowork" replace />,
      },
      {
        // The session rail (StudioShell) persists across Studio, Artifacts, and
        // Skills — only the single-Artifact full-page view below opts out of
        // it, matching the mockup's cwView-driven layout. The mockup itself is a
        // state-flag SPA; real routes are a deliberate departure, so a reload keeps
        // the current view and an Artifact can be opened by link.
        path: '/cowork',
        element: <StudioShell />,
        children: [
          { index: true, element: <StudioPage /> },
          { path: 'artifacts', element: <ArtifactsGalleryPage /> },
          { path: 'skills', element: <SkillsPage /> },
        ],
      },
      {
        path: '/cowork/artifact/:artifactId',
        element: <ArtifactPage />,
      },
    ],
  },
]);
