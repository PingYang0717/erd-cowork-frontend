export interface CurrentUser {
  id: string;
  name: string;
  department: string;
}

export const currentUser: CurrentUser = {
  id: 'u-001',
  name: 'Alex Chen',
  department: 'Process Integration',
};
