export const hasPermission = (
  userPermissions: string[],
  required: string
): boolean => {
  return userPermissions.includes(required);
};
