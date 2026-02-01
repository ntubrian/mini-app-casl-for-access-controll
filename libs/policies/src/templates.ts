export type Actions = "manage" | "create" | "read" | "update" | "delete" | "approve";
export type Subjects = "Order" | "Report" | "User" | "Dashboard" | "all";

export type ApiAbilityRule = {
  action: Actions | Actions[];
  subject: Subjects | Subjects[];
  fields?: string | string[];
  inverted?: boolean;
  conditions?: Record<string, unknown>;
  reason?: string;
};

export type PolicySetKey = "sales-focus" | "regional-manager" | "admin-lite";

export const policyTemplates: Record<
  PolicySetKey,
  { name: string; description: string; rules: ApiAbilityRule[] }
> = {
  "sales-focus": {
    name: "銷售重點",
    description: "按事業部分配訂單權限，並按等級控制報表可見性。",
    rules: [
      { action: "read", subject: "Dashboard" },
      {
        action: "read",
        subject: "Order",
        conditions: { businessUnit: "$user.businessUnit" }
      },
      {
        action: "update",
        subject: "Order",
        conditions: { ownerId: "$user.id", status: "draft" }
      },
      { action: "create", subject: "Order" },
      {
        action: "read",
        subject: "Report",
        conditions: {
          businessUnit: "$user.businessUnit",
          visibilityLevel: { $lte: "$user.level" }
        }
      }
    ]
  },
  "regional-manager": {
    name: "區域經理",
    description: "按區域審批訂單與查看報表。",
    rules: [
      { action: "read", subject: "Dashboard" },
      {
        action: "read",
        subject: "Report",
        conditions: { region: "$user.region" }
      },
      {
        action: ["read", "update", "approve"],
        subject: "Order",
        conditions: { region: "$user.region" }
      },
      { action: "read", subject: "User" },
      { action: "delete", subject: "Order", inverted: true }
    ]
  },
  "admin-lite": {
    name: "管理員（限制）",
    description: "可管理全部對象，但不允許刪除訂單。",
    rules: [
      { action: "read", subject: "Dashboard" },
      { action: "manage", subject: "all" },
      { action: "delete", subject: "Order", inverted: true }
    ]
  }
};
