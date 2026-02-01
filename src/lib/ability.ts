import { Ability, AbilityBuilder, AbilityClass, subject } from "@casl/ability";

export type Actions = "manage" | "create" | "read" | "update" | "delete" | "approve";
export type Subjects =
  | "Order"
  | "Report"
  | "User"
  | "Dashboard"
  | "all";

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

export function defineRulesFor(user: User) {
  const { can, cannot, rules } = new AbilityBuilder(AppAbility);

  can("read", "Dashboard");

  if (user.role === "admin") {
    can("manage", "all");
  }

  if (user.role === "general_manager") {
    can("read", "Report", { region: user.region });
    can(["read", "update", "approve"], "Order", { region: user.region });
    can("read", "User");
    cannot("delete", "Order");
  }

  if (user.role === "sales_bu") {
    can("read", "Order", { businessUnit: user.businessUnit });
    can("update", "Order", { ownerId: user.id, status: "draft" });
    can("create", "Order");
    can("read", "Report", {
      businessUnit: user.businessUnit,
      visibilityLevel: { $lte: user.level }
    });
  }

  return rules;
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

