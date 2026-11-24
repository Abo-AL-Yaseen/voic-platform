import { ConfigurationError, type Environment } from "../config/environment.js";
export const WORKFLOW_CONFIG = Symbol("WORKFLOW_CONFIG");
export function workflowConfiguration(env: Environment, input = process.env, mailMode = "capture") {
  const setting = input.STAFF_INQUIRY_WRITES;
  if (
    (env.nodeEnv === "production" && setting !== undefined && setting !== "") ||
    (setting !== undefined && !["", "true", "false"].includes(setting)) ||
    (setting === "true" && mailMode !== "capture")
  )
    throw new ConfigurationError(
      "STAFF_INQUIRY_WRITES is development/test only and requires local capture mail; leave it unset in production until staff MFA is implemented.",
    );
  return { writesEnabled: env.nodeEnv !== "production" && setting === "true" };
}
export type WorkflowConfig = ReturnType<typeof workflowConfiguration>;
