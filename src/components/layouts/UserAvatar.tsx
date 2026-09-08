import React, { useState } from 'react';
import { UserOutlined } from '@ant-design/icons';

import styles from './UserAvatar.module.css';

/** The reader's own face, or the nearest thing to it.
 *
 *  Three ways there is no picture — the request has not answered, it failed, or the
 *  address 404s — and one shape for all of them, so the header never resizes or flickers
 *  as they resolve. Initials when a name is known, a neutral figure when not: a name is
 *  what the reader recognises themselves by, and this app's names are Chinese, where the
 *  first character carries more than a Latin initial does. */
interface UserAvatarProps {
  name?: string;
  src?: string | null;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ name, src }) => {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return <img className={styles.image} src={src} alt="" onError={() => setFailed(true)} />;
  }
  // `Array.from`, not `slice`: an emoji or any astral character is two UTF-16 units, and
  // half of one renders as a replacement glyph.
  const initial = name ? Array.from(name.trim())[0] : null;

  return initial ? <>{initial}</> : <UserOutlined aria-hidden />;
};

export default UserAvatar;
