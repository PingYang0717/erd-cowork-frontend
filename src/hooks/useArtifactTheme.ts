import { useThemeStore } from '@/stores/useThemeStore';
import type { ArtifactTheme } from '@/types/api/index';

export function useArtifactTheme(): ArtifactTheme {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  return isDarkMode ? 'dark' : 'light';
}
