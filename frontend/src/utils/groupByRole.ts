import { User } from '../types';

export const groupUsersByRole = (users: User[]) => {
  const roleMap: { [role: string]: User[] } = {};

  users.forEach((user) => {
    if (!roleMap[user.role]) {
      roleMap[user.role] = [];
    }
    roleMap[user.role].push(user);
  });

  return roleMap;
};
