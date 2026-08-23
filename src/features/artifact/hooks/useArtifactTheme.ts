import { useThemeStore } from '@/features/theme/store/useThemeStore';
import type { ArtifactTheme } from '@/types/api';

export function useArtifactTheme(): ArtifactTheme {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  return isDarkMode ? 'dark' : 'light';
}
