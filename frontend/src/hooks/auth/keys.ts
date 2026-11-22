export const authKeys = {
  session: ["auth", "session"] as const,
  mfaChallenge: (challengeId: string) => ["auth", "mfa", challengeId] as const,
};
