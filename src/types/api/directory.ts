export type DirectoryEntryKind = 'department' | 'section' | 'person';

export interface DirectoryEntry {
  id: string;
  kind: DirectoryEntryKind;
  label: string;
}
