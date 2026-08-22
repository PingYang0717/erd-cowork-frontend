import { useEffect, useRef } from 'react';

import type { ArtifactTheme } from '@/types/api';

export function ArtifactFrame({ html, theme }: { html: string; theme: ArtifactTheme }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Themed HTML is delivered via the `?theme=` query and re-rendered as a
    // fresh iframe document (see the srcDoc below); this postMessage keeps
    // that in sync for artifacts whose own script wants to react instantly
    // without waiting on a refetch (ADR-0001).
    iframeRef.current?.contentWindow?.postMessage({ type: 'theme', theme }, '*');
  }, [theme, html]);

  return (
    <iframe
      ref={iframeRef}
      title="Artifact preview"
      sandbox="allow-scripts"
      srcDoc={html}
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
}
