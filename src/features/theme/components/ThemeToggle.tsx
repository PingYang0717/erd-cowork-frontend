import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import { useThemeStore } from '@/features/theme/store/useThemeStore';

export function ThemeToggle() {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <Button
      type="text"
      shape="circle"
      onClick={toggleTheme}
      title="Toggle theme"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
    />
  );
}
