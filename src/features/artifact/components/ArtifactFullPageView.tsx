import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { ThemeToggle } from '@/features/theme/components/ThemeToggle';

import { useArtifactContent } from '../hooks/useArtifactContent';
import { useArtifactTheme } from '../hooks/useArtifactTheme';
import { ArtifactFrame } from './ArtifactFrame';
import styles from './ArtifactFullPageView.module.css';

export function ArtifactFullPageView({ artifactId }: { artifactId: string | undefined }) {
  const navigate = useNavigate();
  const theme = useArtifactTheme();
  const { data, isError } = useArtifactContent(artifactId, theme);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/cowork/artifacts')}
        >
          <ArrowLeftOutlined aria-hidden />
          Back
        </button>
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
