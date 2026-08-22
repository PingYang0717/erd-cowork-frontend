import {
  AppstoreOutlined,
  ClockCircleOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useCreateSession } from '@/features/session/hooks/useSessionMutations';

import styles from './CollapsedSessionRail.module.css';

interface CollapsedSessionRailProps {
  onExpand: () => void;
}

export function CollapsedSessionRail({ onExpand }: CollapsedSessionRailProps) {
  const createSession = useCreateSession();
  const navigate = useNavigate();

  return (
    <div className={styles.rail}>
      <Button
        type="text"
        shape="circle"
        icon={<MenuUnfoldOutlined />}
        onClick={onExpand}
        title="Expand session list"
        aria-label="Expand session list"
      />
      <Divider className={styles.divider} />
      <Button
        type="primary"
        shape="circle"
        icon={<PlusOutlined />}
        onClick={() => {
          createSession.mutate();
          navigate('/cowork');
        }}
        title="New chat"
        aria-label="New chat"
      />
      <Button
        type="text"
        shape="circle"
        icon={<ClockCircleOutlined />}
        onClick={() => navigate('/cowork/schedule')}
        title="Schedule"
        aria-label="Schedule"
      />
      <Button
        type="text"
        shape="circle"
        icon={<AppstoreOutlined />}
        onClick={() => navigate('/cowork/artifacts')}
        title="Artifacts"
        aria-label="Artifacts"
      />
    </div>
  );
}
