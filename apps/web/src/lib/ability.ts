import { Ability, AbilityClass, subject } from "@casl/ability";
import type { RawRuleOf } from "@casl/ability";
import {
  policyTemplates,
  type ApiAbilityRule,
  type PolicySetKey,
  type Actions as PolicyActions,
  type Subjects as PolicySubjects
} from "@policies";

export type Actions = PolicyActions;
export type Subjects = PolicySubjects;

export interface User {
  id: string;
  role: "sales_bu" | "general_manager" | "admin";
  businessUnit: "electronics" | "fashion" | "home";
  region: "north" | "south";
  level: 1 | 2 | 3;
}

export interface Order {
  id: string;
  businessUnit: User["businessUnit"];
  region: User["region"];
  ownerId: string;
  status: "draft" | "submitted" | "approved" | "shipped";
  total: number;
}

export interface Report {
  id: string;
  businessUnit: User["businessUnit"];
  region: User["region"];
  visibilityLevel: 1 | 2 | 3;
}

export type AppSubjects = Subjects | Order | Report | User;
export type AppAbility = Ability<[Actions, AppSubjects]>;
export const AppAbility = Ability as AbilityClass<AppAbility>;
export const abilityOptions = {
  detectSubjectType: (item: unknown) =>
    (item as { __type: Subjects }).__type
};

const defaultPolicySetForRole: Record<User["role"], PolicySetKey> = {
  sales_bu: "sales-focus",
  general_manager: "regional-manager",
  admin: "admin-lite"
};

const resolveUserTokens = (value: unknown, user: User): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => resolveUserTokens(item, user));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveUserTokens(item, user)
      ])
    );
  }

  if (typeof value === "string" && value.startsWith("$user.")) {
    const key = value.replace("$user.", "") as keyof User;
    return user[key];
  }

  return value;
};

const resolveRulesForUser = (rules: ApiAbilityRule[], user: User) =>
  rules.map((rule) => ({
    ...rule,
    conditions: rule.conditions
      ? resolveUserTokens(rule.conditions, user)
      : rule.conditions
  }));

export function defineRulesFor(
  user: User,
  policySet: PolicySetKey = defaultPolicySetForRole[user.role]
) {
  const template = policyTemplates[policySet];
  if (!template) {
    return [] as RawRuleOf<AppAbility>[];
  }

  return resolveRulesForUser(template.rules, user) as RawRuleOf<AppAbility>[];
}

export function buildAbilityFor(user: User): AppAbility {
  return new AppAbility(defineRulesFor(user), abilityOptions);
}

export function orderSubject(order: Order) {
  return subject("Order", { ...order, __type: "Order" });
}

export function reportSubject(report: Report) {
  return subject("Report", { ...report, __type: "Report" });
}

export function userSubject(user: User) {
  return subject("User", { ...user, __type: "User" });
}
