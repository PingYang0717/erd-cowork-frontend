import { App } from 'antd';

import { useTranslations } from '@/i18n/useTranslations';

interface DestructiveConfirmArgs {
  title: string;
  /** What will actually happen, consequences included — not a restatement of the
   *  button. The artifact one says recipients lose access; that is the sentence the
   *  user is confirming. */
  body: string;
  /** The verb, repeated from the menu item that got us here. */
  confirmLabel: string;
  onConfirm: () => void;
}

/** One shape for "are you sure" on a destructive action.
 *
 *  Held in one hook so every such dialog behaves the same way: the confirm is
 *  `danger`, and focus lands on Cancel — the safe answer is the default answer,
 *  and an Enter pressed out of habit must not be the destructive one.
 *
 *  `modal.confirm?.` — outside `AppProviders` (component tests) `useApp` returns an
 *  empty object, and a missing dialog is better than a crashed test. */
export const useConfirmDestructive = () => {
  const { modal } = App.useApp();
  const t = useTranslations();

  return ({ title, body, confirmLabel, onConfirm }: DestructiveConfirmArgs) =>
    modal.confirm?.({
      title,
      content: body,
      okText: confirmLabel,
      okType: 'danger',
      cancelText: t.common.cancel,
      autoFocusButton: 'cancel',
      onOk: onConfirm,
    });
};

export default useConfirmDestructive;
