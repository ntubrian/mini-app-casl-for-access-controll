import { NextResponse } from "next/server";
import { AbilityBuilder } from "@casl/ability";
import { AppAbility, User } from "../../../lib/ability";
import type { AbilityPolicyResponse } from "../../../lib/ability-policy";

type PolicySet = "sales-focus" | "regional-manager" | "admin-lite";

const users: Record<string, User> = {
  sales: {
    id: "user-1",
    role: "sales_bu",
    businessUnit: "electronics",
    region: "north",
    level: 1
  },
  manager: {
    id: "user-2",
    role: "general_manager",
    businessUnit: "fashion",
    region: "north",
    level: 3
  },
  admin: {
    id: "user-3",
    role: "admin",
    businessUnit: "home",
    region: "south",
    level: 3
  }
};

const POLICY_SETS: PolicySet[] = [
  "sales-focus",
  "regional-manager",
  "admin-lite"
];

function buildPolicyRules(user: User, set: PolicySet) {
  const { can, cannot, rules } = new AbilityBuilder(AppAbility);

  can("read", "Dashboard");

  switch (set) {
    case "sales-focus":
      can("read", "Order", { businessUnit: user.businessUnit });
      can("update", "Order", { ownerId: user.id, status: "draft" });
      can("create", "Order");
      can("read", "Report", {
        businessUnit: user.businessUnit,
        visibilityLevel: { $lte: user.level }
      });
      break;
    case "regional-manager":
      can("read", "Report", { region: user.region });
      can(["read", "update", "approve"], "Order", { region: user.region });
      can("read", "User");
      cannot("delete", "Order");
      break;
    case "admin-lite":
      can("manage", "all");
      cannot("delete", "Order");
      break;
    default:
      break;
  }

  return rules;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedSet = searchParams.get("set") as PolicySet | null;
  const userKey = searchParams.get("user") ?? "sales";

  const set = POLICY_SETS.includes(requestedSet as PolicySet)
    ? (requestedSet as PolicySet)
    : "sales-focus";
  const user = users[userKey] ?? users.sales;
  const rules = buildPolicyRules(user, set);

  const payload: AbilityPolicyResponse = {
    rules,
    set,
    userId: user.id,
    issuedAt: new Date().toISOString()
  };

  return NextResponse.json(payload);
}
