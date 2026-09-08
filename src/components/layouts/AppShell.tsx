import React from 'react';
import { Outlet } from 'react-router-dom';

import AppHeader from './AppHeader';

import styles from './AppShell.module.css';

/** Everything the app puts above its routes. Today that is one bar.
 *
 *  A layout route rather than something each page renders: the bar has to be the same
 *  bar across a navigation — remounting it would flash the account entry on every route
 *  change — and it has to survive a route failing, which it only does by being above the
 *  boundary that catches it. */
const AppShell: React.FC = () => (
  <div className={styles.shell}>
    <AppHeader />
    <div className={styles.body}>
      <Outlet />
    </div>
  </div>
);

export default AppShell;
