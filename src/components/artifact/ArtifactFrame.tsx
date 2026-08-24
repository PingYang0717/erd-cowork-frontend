import { useEffect, useRef } from 'react';

import { type BrowserJsError, useRepairOfferStore } from '@/stores/useRepairOfferStore';
import type { ArtifactTheme } from '@/types/api/index';

export function ArtifactFrame({
  html,
  theme,
  artifactId,
}: {
  html: string;
  theme: ArtifactTheme;
  artifactId: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const report = useRepairOfferStore((store) => store.report);

  // The artifact reports its own runtime errors (the collector injected into its head).
  // Only messages from THIS iframe count — any page can postMessage at us.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data?.type !== 'erd-artifact-error' ||
        event.source !== iframeRef.current?.contentWindow
      ) {
        return;
      }
      report(artifactId, (event.data.errors ?? []) as BrowserJsError[]);
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [artifactId, report]);

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
