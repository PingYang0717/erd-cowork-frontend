import React, { useEffect, useMemo, useRef } from 'react';

import { useMcpCallBridge } from '@/hooks/useMcpCallBridge';
import { type BrowserJsError, useRepairOfferStore } from '@/stores/useRepairOfferStore';
import { injectCspMeta } from '@/utils/artifactCsp';
import { injectScrollbarStyle } from '@/utils/artifactScrollbar';

interface ArtifactFrameProps {
  html: string;
  artifactId: string;
  /** Whether a repair offer raised from here would be seen: the Studio thread shows
   *  them, the full-page view has no thread. Only the MCP bridge asks — the error
   *  collector's reports are unconditional, as they were before the bridge existed. */
  offersMcpRepair: boolean;
}

/** Keying the iframe on the artifact and the reload nonce is what makes a Reload a
 *  Reload: React drops the element and mounts a new one, so the document restarts from
 *  scratch (ADR-0001). */
const ArtifactFrame: React.FC<ArtifactFrameProps> = ({ html, artifactId, offersMcpRepair }) => {
  const report = useRepairOfferStore((store) => store.report);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The artifact's way to a Connector: it cannot fetch (the CSP below), so it asks this
  // window to (ADR-0017). Bound to this iframe, so a remount starts a fresh bridge.
  useMcpCallBridge({ artifactId, iframeRef, offersRepair: offersMcpRepair });

  // The sandbox keeps the artifact out of this app; the policy keeps it off the network.
  // Injected here rather than served with the document — a srcdoc never sees a header.
  // The app's scrollbar goes in the same way, for the same reason: nothing from outside
  // reaches a srcdoc document unless it is written into it.
  const securedHtml = useMemo(() => injectScrollbarStyle(injectCspMeta(html, window.location.origin)), [html]);

  // The artifact reports its own runtime errors (the collector injected into its head).
  // Only messages from THIS iframe count — any page can postMessage at us.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'erd-artifact-error' || event.source !== iframeRef.current?.contentWindow) {
        return;
      }
      report(artifactId, (event.data.errors ?? []) as BrowserJsError[]);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [artifactId, report]);

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

export default ArtifactFrame;
