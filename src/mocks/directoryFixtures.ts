import type { DirectoryEntry } from '@/types/api/directory';

const DEPARTMENT_CODES = [
  'A10INTD1-1',
  'A10INTD1-2',
  'A10INTD2-1',
  'A10INTD2-2',
  'A10PITD1-1',
  'A10PITD1-2',
  'A10YETD1-1',
  'A10DETD1-1',
];

const SECTION_CODES = ['INTD-1', 'INTD-2', 'INTD-3', 'PITD-1', 'PITD-2', 'YETD-1', 'DETD-1'];

const PEOPLE: Array<{ account: string; name: string }> = [
  { account: 'CHXXGHYC', name: '鄭凱宇' },
  { account: 'CHXXABCD', name: '王思涵' },
  { account: 'CHXXKLWU', name: '吳克良' },
  { account: 'CHXXSHLN', name: '林淑惠' },
  { account: 'CHXXYCCN', name: '陳彥志' },
  { account: 'CHXXMHHU', name: '黃明翰' },
  { account: 'CHXXTTLA', name: '賴宗霖' },
  { account: 'CHXXPYHS', name: '許佩雅' },
  { account: 'CHXXCKCH', name: '張家愷' },
  { account: 'CHXXWJKM', name: '金宇真' },
];

export const DIRECTORY_FIXTURES: DirectoryEntry[] = [
  ...DEPARTMENT_CODES.map((code) => ({ id: code, kind: 'department' as const, label: code })),
  ...SECTION_CODES.map((code) => ({ id: code, kind: 'section' as const, label: code })),
  ...PEOPLE.map((p) => ({
    id: p.account,
    kind: 'person' as const,
    label: `${p.account} · ${p.name}`,
  })),
];
