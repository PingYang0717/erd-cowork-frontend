import React from 'react';
import { ThunderboltOutlined } from '@ant-design/icons';

import ComingSoon from '@/components/common/ComingSoon';
import { useTranslations } from '@/i18n/useTranslations';

/** Skills — the mockup's rail entry under Artifacts, with its thunderbolt. The feature
 *  behind it (instructions of the user's own that the Agent follows) is not built yet;
 *  the entry is there so the rail already has the shape it will have. */
const SkillsPage: React.FC = () => {
  const t = useTranslations();
  return (
    <ComingSoon
      label={t.session.skills}
      icon={<ThunderboltOutlined />}
      title={t.skills.comingSoonTitle}
      detail={t.skills.comingSoonDetail}
    />
  );
};

export default SkillsPage;
