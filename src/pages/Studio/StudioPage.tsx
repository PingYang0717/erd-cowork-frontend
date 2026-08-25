import React from 'react';

import { StudioLayout } from '@/components/layouts/StudioLayout';

/** Route entry. The two panes inside `StudioLayout` own a data boundary each, so one
 *  failing pane never blanks the other. */
const StudioPage: React.FC = () => <StudioLayout />;

export { StudioPage };
export default StudioPage;
