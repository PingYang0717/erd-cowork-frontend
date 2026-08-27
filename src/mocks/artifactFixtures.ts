import type { ScenarioKey } from '@/types/api/index';

/** Which document the mock builds. It left the wire contract when `kind` did — the
 *  backend will reintroduce it as `type` — but the fixtures still need to know whether
 *  they are assembling a dashboard or a deck. */
export type ArtifactKind = 'dashboard' | 'slides';

// The same surfaces the app itself uses (theme/tokens.ts, copied from the mockup):
// the Artifact renders inside an iframe and so cannot read the app's custom
// properties, but it has to look like it belongs to the page it sits in. Artifact
// HTML has no theme variants (ADR-0001 status note) — one light palette only.
const PALETTE = {
  bg: '#f5f6f8',
  fg: 'rgba(0, 0, 0, 0.88)',
  fgMuted: 'rgba(0, 0, 0, 0.45)',
  accent: '#1677ff',
  cardBg: '#ffffff',
  cardBorder: '#f0f0f0',
};

interface StatTile {
  label: string;
  value: string;
  sub: string;
}

interface ArtifactContent {
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  stats: StatTile[];
}

// Ported from cowork-master's backend template (artifact/head-inject.vm): the artifact
// reports its own runtime errors to the host, batched so a loop of failures arrives as
// one offer rather than hundreds. A real backend injects this at assembly time; the mock
// injects it here so the repair flow is exercisable without one.
const ERROR_COLLECTOR = `<script>(function(){var pending=[],timer=null;
function flush(){if(!pending.length)return;var batch=pending.slice(0,10);pending=[];
try{parent.postMessage({type:'erd-artifact-error',errors:batch},'*');}catch(e){}}
function push(message,line,col){if(!message||message==='Script error.')return;
pending.push({message:String(message).slice(0,500),line:line||0,col:col||0});
if(timer)clearTimeout(timer);timer=setTimeout(flush,1000);}
window.addEventListener('error',function(e){push(e.message,e.lineno,e.colno);});
window.addEventListener('unhandledrejection',function(e){
push('Unhandled rejection: '+(e.reason&&e.reason.message?e.reason.message:String(e.reason)),0,0);});
})();</script>`;

// Both artifact kinds ship the same document shell.
function renderDocument(title: string, css: string, body: string) {
  const { bg, fg } = PALETTE;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
${ERROR_COLLECTOR}
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; font-family: -apple-system, "Segoe UI", sans-serif; background: ${bg}; color: ${fg}; }
${css}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderDashboardHtml(content: ArtifactContent) {
  const { fg, fgMuted, accent, cardBg, cardBorder } = PALETTE;
  const tagsHtml = content.tags.map((tag) => `<span class="tag">${tag}</span>`).join('');
  const statsHtml = content.stats
    .map(
      (stat) => `<div class="stat">
      <div class="stat-label">${stat.label}</div>
      <div class="stat-value">${stat.value}</div>
      <div class="stat-sub">${stat.sub}</div>
    </div>`,
    )
    .join('');

  const css = `  h1 { color: ${fg}; font-size: 18px; margin: 0 0 2px; }
  .subtitle { color: ${fgMuted}; font-size: 12px; margin: 0 0 10px; }
  .description { font-size: 13px; line-height: 1.5; margin: 0 0 12px; }
  .tags { display: flex; gap: 6px; margin-bottom: 20px; }
  .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid ${cardBorder}; color: ${fgMuted}; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
  .stat { border: 1px solid ${cardBorder}; background: ${cardBg}; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); }
  .stat-label { font-size: 10.5px; letter-spacing: 0.04em; text-transform: uppercase; color: ${fgMuted}; margin-bottom: 6px; }
  .stat-value { font-size: 20px; font-weight: 700; color: ${accent}; }
  .stat-sub { font-size: 11px; color: ${fgMuted}; margin-top: 2px; }`;

  const body = `<h1>${content.title}</h1>
<p class="subtitle">${content.subtitle}</p>
<p class="description">${content.description}</p>
<div class="tags">${tagsHtml}</div>
<div class="stats">${statsHtml}</div>`;

  return renderDocument(content.title, css, body);
}

// The slides kind renders the same analysis as a stacked deck (title slide,
// findings slide, key-figures slide) instead of one dashboard surface.
function renderSlidesHtml(content: ArtifactContent) {
  const { fg, fgMuted, accent, cardBg, cardBorder } = PALETTE;
  const tagsHtml = content.tags.map((tag) => `<span class="tag">${tag}</span>`).join('');
  const figuresHtml = content.stats
    .map(
      (stat) => `<li class="figure">
        <span class="figure-value">${stat.value}</span>
        <span class="figure-label">${stat.label}</span>
        <span class="figure-sub">${stat.sub}</span>
      </li>`,
    )
    .join('');

  const css = `  .deck { display: flex; flex-direction: column; gap: 16px; }
  .slide { position: relative; border: 1px solid ${cardBorder}; background: ${cardBg}; border-radius: 12px; padding: 22px 24px 28px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); }
  .slide-number { position: absolute; right: 14px; bottom: 10px; font-size: 10.5px; color: ${fgMuted}; }
  .slide-kicker { font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: ${accent}; margin: 0 0 8px; }
  .slide-title { color: ${fg}; font-size: 20px; margin: 0 0 6px; }
  .slide-subtitle { color: ${fgMuted}; font-size: 12px; margin: 0; }
  .slide-body { font-size: 13px; line-height: 1.6; margin: 0 0 12px; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid ${cardBorder}; color: ${fgMuted}; }
  .figures { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin: 0; padding: 0; }
  .figure { display: flex; flex-direction: column; gap: 2px; border-left: 3px solid ${accent}; padding-left: 10px; }
  .figure-value { font-size: 20px; font-weight: 700; color: ${accent}; }
  .figure-label { font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: ${fgMuted}; }
  .figure-sub { font-size: 11px; color: ${fgMuted}; }`;

  const body = `<div class="deck">
  <section class="slide">
    <p class="slide-kicker">eRD Cowork</p>
    <h1 class="slide-title">${content.title}</h1>
    <p class="slide-subtitle">${content.subtitle}</p>
    <span class="slide-number">1 / 3</span>
  </section>
  <section class="slide">
    <p class="slide-kicker">Findings</p>
    <p class="slide-body">${content.description}</p>
    <div class="tags">${tagsHtml}</div>
    <span class="slide-number">2 / 3</span>
  </section>
  <section class="slide">
    <p class="slide-kicker">Key figures</p>
    <ul class="figures">${figuresHtml}</ul>
    <span class="slide-number">3 / 3</span>
  </section>
</div>`;

  return renderDocument(content.title, css, body);
}

function buildFixture(content: ArtifactContent, kind: ArtifactKind = 'dashboard'): string {
  const render = kind === 'slides' ? renderSlidesHtml : renderDashboardHtml;
  return render(content);
}

const SCENARIO_CONTENT: Record<ScenarioKey, ArtifactContent> = {
  spc: {
    title: 'SPC analysis — Vt (gate CD)',
    subtitle: 'Inline DB · N5 line',
    description:
      'Control chart with CL / ±3σ limits and Western Electric rules applied to Vt (gate CD).',
    tags: ['Control chart', 'Western Electric'],
    stats: [
      { label: 'Mean Vt', value: '0.421 V', sub: 'target 0.420' },
      { label: 'CPK', value: '1.36', sub: '> 1.33 spec' },
      { label: 'OOC points', value: '1', sub: 'lot 109' },
      { label: 'Lots', value: '24', sub: 'N5 line' },
    ],
  },
  inline: {
    title: 'Inline dashboard',
    subtitle: 'Inline DB · selected DC items',
    description: 'SPC cards for each selected DC item, with OOC wafers highlighted.',
    tags: ['Multi-item', 'OOC highlight'],
    stats: [
      { label: 'DC items', value: '5', sub: 'tracked' },
      { label: 'OOC wafers', value: '3', sub: 'across items' },
      { label: 'Lots scanned', value: '42', sub: 'this week' },
    ],
  },
  daily: {
    title: 'Daily Monitor Dashboard — A14',
    subtitle: 'Approval Center · EXP Health · Inline SPC',
    description: 'Approval Center, EXP Health, and Inline SPC merged into one daily view.',
    tags: ['Merged view', 'Daily'],
    stats: [
      { label: 'Pending holds', value: '2', sub: 'Approval Center' },
      { label: 'EXP flags', value: '1', sub: 'Idsat drift' },
      { label: 'Inline OOC', value: '1', sub: 'lot 109' },
    ],
  },
  cptest: {
    title: 'CP Test status',
    subtitle: 'CP Test · submission records',
    description: 'Submission records grouped by site and progress.',
    tags: ['Site breakdown', 'Progress'],
    stats: [
      { label: 'Open submissions', value: '7', sub: 'across sites' },
      { label: 'Completed', value: '18', sub: 'this month' },
      { label: 'Avg. progress', value: '64%', sub: 'in-flight lots' },
    ],
  },
};

// Every version of an Artifact renders its own content: the version number is
// carried into the rendered subtitle, so regenerating an Artifact produces a
// version that is visibly different from the one before it.
export function buildArtifactFixture(
  scenario: ScenarioKey,
  kind: ArtifactKind,
  versionN?: number,
): string {
  const content = SCENARIO_CONTENT[scenario];
  const versioned =
    versionN == null ? content : { ...content, subtitle: `${content.subtitle} · v${versionN}` };
  return buildFixture(versioned, kind);
}
