import { useParams } from 'react-router-dom';

import { ArtifactFrame } from '@/features/artifact/components/ArtifactFrame';
import { useArtifactContent } from '@/features/artifact/hooks/useArtifactContent';
import { ThemeToggle } from '@/features/theme/components/ThemeToggle';
import { useThemeStore } from '@/features/theme/store/useThemeStore';
import type { ArtifactTheme } from '@/types/api';

import styles from './ArtifactPage.module.css';

export function ArtifactPage() {
  const { artifactId } = useParams<{ artifactId: string }>();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const theme: ArtifactTheme = isDarkMode ? 'dark' : 'light';
  const { data, isError } = useArtifactContent(artifactId, theme);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Artifact</h1>
        <ThemeToggle />
      </div>
      <div className={styles.body}>
        {isError && <div className={styles.empty}>Artifact not found.</div>}
        {data && <ArtifactFrame html={data.html} theme={theme} />}
      </div>
    </div>
  );
}
