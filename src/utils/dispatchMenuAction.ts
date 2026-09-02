export const dispatchMenuAction = <Key extends string>(
  key: Key,
  actions: Partial<Record<Key, () => void>>,
) => {
  actions[key]?.();
};
