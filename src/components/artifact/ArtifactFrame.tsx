import React, { useEffect, useMemo, useRef } from 'react';

import { type BrowserJsError, useRepairOfferStore } from '@/stores/useRepairOfferStore';
import type { ArtifactTheme } from '@/types/api/index';
import { injectCspMeta } from '@/utils/artifactCsp';

interface ArtifactFrameProps {
  html: string;
  theme: ArtifactTheme;
  artifactId: string;
}

/** Keying the iframe on the artifact and the reload nonce is what makes a Reload a
 *  Reload: React drops the element and mounts a new one, so the document restarts from
 *  scratch. A theme change deliberately does NOT touch this key — the srcDoc swaps
 *  under the same document (ADR-0001). */
const ArtifactFrame: React.FC<ArtifactFrameProps> = ({ html, theme, artifactId }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const report = useRepairOfferStore((store) => store.report);

  // The sandbox keeps the artifact out of this app; the policy keeps it off the network.
  // Injected here rather than served with the document — a srcdoc never sees a header.
  const securedHtml = useMemo(() => injectCspMeta(html, window.location.origin), [html]);

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
      srcDoc={securedHtml}
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
};

export { ArtifactFrame };
export default ArtifactFrame;
