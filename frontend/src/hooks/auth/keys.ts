export const authKeys = {
  session: ["auth", "session"] as const,
  current: (epoch: number) => ["auth", "session", epoch] as const,
  mfaChallenge: (challengeId: string) => ["auth", "mfa", challengeId] as const,
};
