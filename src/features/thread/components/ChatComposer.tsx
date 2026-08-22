import {
  ArrowUpOutlined,
  DashboardOutlined,
  DotChartOutlined,
  FilePptOutlined,
  LineChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { Button, Input } from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';

import type { ScenarioKey } from '@/types/api';

import styles from './ChatComposer.module.css';

const SUGGESTED_PROMPTS: {
  label: string;
  text: string;
  scenarioKey: ScenarioKey;
  icon: ReactNode;
}[] = [
  {
    label: 'Inline dashboard',
    text: 'Generate an Inline dashboard.',
    scenarioKey: 'inline',
    icon: <DotChartOutlined aria-hidden />,
  },
  {
    label: 'SPC analysis',
    text: 'Run an SPC analysis on Vt (gate CD).',
    scenarioKey: 'spc',
    icon: <LineChartOutlined aria-hidden />,
  },
  {
    label: 'Generate slides',
    text: 'Generate slides from this analysis.',
    scenarioKey: 'spc',
    icon: <FilePptOutlined aria-hidden />,
  },
  {
    label: 'Daily monitor (A14)',
    text: 'Generate the Daily Monitor dashboard for A14.',
    scenarioKey: 'daily',
    icon: <DashboardOutlined aria-hidden />,
  },
  {
    label: 'CP Test status',
    text: 'What is the CP Test status?',
    scenarioKey: 'cptest',
    icon: <PieChartOutlined aria-hidden />,
  },
];

interface ChatComposerProps {
  onSend: (text: string, scenarioKey?: ScenarioKey) => void;
  disabled: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [draft, setDraft] = useState('');

  function submitDraft() {
    const text = draft.trim();
    if (!text || disabled) {
      return;
    }
    onSend(text);
    setDraft('');
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Button
            key={prompt.label}
            shape="round"
            size="small"
            icon={prompt.icon}
            disabled={disabled}
            onClick={() => onSend(prompt.text, prompt.scenarioKey)}
          >
            {prompt.label}
          </Button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Input.TextArea
          className={styles.messageInput}
          aria-label="Message"
          placeholder="Ask eRD AI…"
          value={draft}
          disabled={disabled}
          autoSize
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submitDraft();
            }
          }}
        />
        <Button
          type="primary"
          shape="circle"
          disabled={disabled}
          onClick={submitDraft}
          title="Send message"
          aria-label="Send message"
          icon={<ArrowUpOutlined aria-hidden />}
        />
      </div>
    </div>
  );
}
