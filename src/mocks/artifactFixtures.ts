import type { ArtifactTheme, ScenarioKey } from '@/types/api';

const THEME_PALETTE: Record<
  ArtifactTheme,
  { bg: string; fg: string; fgMuted: string; accent: string; cardBg: string; cardBorder: string }
> = {
  light: {
    bg: '#f5f6f8',
    fg: '#141414',
    fgMuted: '#8c8c8c',
    accent: '#1677ff',
    cardBg: '#ffffff',
    cardBorder: '#f0f0f0',
  },
  dark: {
    bg: '#0b0f14',
    fg: '#e8e8e8',
    fgMuted: '#8c9296',
    accent: '#69b1ff',
    cardBg: '#161b22',
    cardBorder: '#2a333c',
  },
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

function renderArtifactHtml(content: ArtifactContent, theme: ArtifactTheme) {
  const { bg, fg, fgMuted, accent, cardBg, cardBorder } = THEME_PALETTE[theme];
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

  return `<!doctype html>
<html data-artifact-theme="${theme}">
<head>
<meta charset="utf-8" />
<title>${content.title}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; font-family: -apple-system, "Segoe UI", sans-serif; background: ${bg}; color: ${fg}; }
  h1 { color: ${fg}; font-size: 18px; margin: 0 0 2px; }
  .subtitle { color: ${fgMuted}; font-size: 12px; margin: 0 0 10px; }
  .description { font-size: 13px; line-height: 1.5; margin: 0 0 12px; }
  .tags { display: flex; gap: 6px; margin-bottom: 20px; }
  .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid ${cardBorder}; color: ${fgMuted}; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
  .stat { border: 1px solid ${cardBorder}; background: ${cardBg}; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); }
  .stat-label { font-size: 10.5px; letter-spacing: 0.04em; text-transform: uppercase; color: ${fgMuted}; margin-bottom: 6px; }
  .stat-value { font-size: 20px; font-weight: 700; color: ${accent}; }
  .stat-sub { font-size: 11px; color: ${fgMuted}; margin-top: 2px; }
</style>
</head>
<body>
<h1>${content.title}</h1>
<p class="subtitle">${content.subtitle}</p>
<p class="description">${content.description}</p>
<div class="tags">${tagsHtml}</div>
<div class="stats">${statsHtml}</div>
<script>
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'theme') {
      document.documentElement.dataset.artifactTheme = event.data.theme;
    }
  });
</script>
</body>
</html>`;
}

interface ArtifactFixture {
  light: string;
  dark: string;
}

function buildFixture(content: ArtifactContent): ArtifactFixture {
  return {
    light: renderArtifactHtml(content, 'light'),
    dark: renderArtifactHtml(content, 'dark'),
  };
}

// Content for specific historical Artifact versions, keyed by ArtifactVersion.id.
// A versionId with no entry here falls back to ARTIFACT_FIXTURES (the latest content).
export const ARTIFACT_VERSION_CONTENT: Record<string, ArtifactFixture> = {
  'artifact-1-v1': buildFixture({
    title: 'SPC analysis — Vt (gate CD)',
    subtitle: 'Inline DB · N5 line · Draft',
    description:
      'Control chart with CL / ±3σ limits applied to Vt (gate CD); Western Electric rules not yet applied.',
    tags: ['Control chart', 'Draft'],
    stats: [
      { label: 'Mean Vt', value: '0.421 V', sub: 'target 0.420' },
      { label: 'Lots', value: '18', sub: 'N5 line' },
    ],
  }),
};

export const ARTIFACT_FIXTURES: Record<ScenarioKey, ArtifactFixture> = {
  spc: buildFixture({
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
  }),
  inline: buildFixture({
    title: 'Inline dashboard',
    subtitle: 'Inline DB · selected DC items',
    description: 'SPC cards for each selected DC item, with OOC wafers highlighted.',
    tags: ['Multi-item', 'OOC highlight'],
    stats: [
      { label: 'DC items', value: '5', sub: 'tracked' },
      { label: 'OOC wafers', value: '3', sub: 'across items' },
      { label: 'Lots scanned', value: '42', sub: 'this week' },
    ],
  }),
  daily: buildFixture({
    title: 'Daily Monitor Dashboard — A14',
    subtitle: 'Approval Center · EXP Health · Inline SPC',
    description: 'Approval Center, EXP Health, and Inline SPC merged into one daily view.',
    tags: ['Merged view', 'Daily'],
    stats: [
      { label: 'Pending holds', value: '2', sub: 'Approval Center' },
      { label: 'EXP flags', value: '1', sub: 'Idsat drift' },
      { label: 'Inline OOC', value: '1', sub: 'lot 109' },
    ],
  }),
  cptest: buildFixture({
    title: 'CP Test status',
    subtitle: 'CP Test · submission records',
    description: 'Submission records grouped by site and progress.',
    tags: ['Site breakdown', 'Progress'],
    stats: [
      { label: 'Open submissions', value: '7', sub: 'across sites' },
      { label: 'Completed', value: '18', sub: 'this month' },
      { label: 'Avg. progress', value: '64%', sub: 'in-flight lots' },
    ],
  }),
};
