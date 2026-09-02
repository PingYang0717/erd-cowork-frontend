import React from 'react';

import { useTranslations } from '@/i18n/useTranslations';

const SchedulePage: React.FC = () => {
  const t = useTranslations();
  return <h1>{t.session.schedule}</h1>;
};

export default SchedulePage;
