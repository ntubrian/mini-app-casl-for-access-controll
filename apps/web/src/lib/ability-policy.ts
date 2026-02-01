import type { RawRuleOf } from "@casl/ability";
import type { AppAbility } from "./ability";

export type ApiAbilityRule = RawRuleOf<AppAbility>;

export interface AbilityPolicyResponse {
  rules: ApiAbilityRule[];
  set?: string;
  userId?: string;
  version?: number;
  issuedAt?: string;
}
