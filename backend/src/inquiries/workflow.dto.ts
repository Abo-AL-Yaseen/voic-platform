import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
export class WorkflowActionDto {
  @IsUUID("4") key!: string;
  @IsInt() @Min(1) @Max(1000000) revision!: number;
  @IsIn(["status", "message", "note"]) type!: "status" | "message" | "note";
  @IsOptional() @IsIn(["under_review", "awaiting_customer", "responded", "closed"]) status?:
    | "under_review"
    | "awaiting_customer"
    | "responded"
    | "closed";
  @IsOptional() @IsString() @MaxLength(4000) text?: string;
}
export class CustomerReplyDto {
  @IsUUID("4") key!: string;
  @IsInt() @Min(1) @Max(1000000) revision!: number;
  @IsString() @MaxLength(4000) text!: string;
}
export function workflowTransitions(status: string): string[] {
  return (
    (
      {
        submitted: ["under_review"],
        under_review: ["awaiting_customer", "responded", "closed"],
        responded: ["under_review", "closed"],
      } as Record<string, string[]>
    )[status] || []
  );
}
