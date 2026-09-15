import React from 'react';
import { Outlet } from 'react-router-dom';

import AppHeader from './AppHeader';

import styles from './AppShell.module.css';

/** The outermost frame: the header on top, and below it whichever route is on. Every
 *  route sits inside — the Studio routes with their session rail, and the full-page
 *  Artifact view that opts out of the rail but not of this. */
const AppShell: React.FC = () => {
  return (
    <div className={styles.frame}>
      <AppHeader />
      <div className={styles.main}>
        <Outlet />
      </div>
    </div>
  );
};

export default AppShell;
