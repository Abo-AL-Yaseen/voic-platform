export const accountKeys = {
  scope: (userId: string) => ["account", userId] as const,
  profile: (userId: string, epoch = 0) => [...accountKeys.scope(userId), epoch, "profile"] as const,
};
