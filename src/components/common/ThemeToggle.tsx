import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React from 'react';

import { useThemeStore } from '@/stores/useThemeStore';

const ThemeToggle: React.FC = () => {
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
};

export default ThemeToggle;
