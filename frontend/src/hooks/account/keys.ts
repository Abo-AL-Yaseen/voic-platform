export const accountKeys = {
  scope: (userId: string) => ["account", userId] as const,
  profile: (userId: string) => [...accountKeys.scope(userId), "profile"] as const,
};
