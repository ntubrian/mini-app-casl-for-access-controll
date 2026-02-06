import express, { type RequestHandler } from "express";
import { desc, eq } from "drizzle-orm";
import { getDb, policySets, policyVersions } from "../../../libs/db/src";
import { policyTemplates } from "../../../libs/policies/src";
import type { ApiAbilityRule, PolicySetKey } from "../../../libs/policies/src";

const app = express();
app.use(express.json());

type User = {
  id: string;
  role: "sales_bu" | "general_manager" | "admin";
  businessUnit: "electronics" | "fashion" | "home";
  region: "north" | "south";
  level: 1 | 2 | 3;
};

type AbilityPolicyResponse = {
  rules: ApiAbilityRule[];
  set?: string;
  userId?: string;
  version?: number;
  issuedAt?: string;
};

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

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Policy API",
    version: "1.0.0"
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/ability": {
      get: {
        summary: "取得最新策略版本",
        parameters: [
          {
            name: "set",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "user",
            in: "query",
            required: false,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "策略資料",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AbilityPolicyResponse" }
              }
            }
          }
        }
      },
      post: {
        summary: "建立新策略版本",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePolicyRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "建立成功",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreatePolicyResponse" }
              }
            }
          }
        }
      }
    },
    "/api/policies/seed": {
      post: {
        summary: "初始化預設策略",
        responses: {
          "200": {
            description: "初始化完成",
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          }
        }
      }
    },
    "/api/health": {
      get: {
        summary: "健康檢查",
        responses: {
          "200": {
            description: "OK"
          }
        }
      }
    }
  },
  components: {
    schemas: {
      AbilityRule: {
        type: "object",
        properties: {
          action: {
            oneOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } }
            ]
          },
          subject: {
            oneOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } }
            ]
          },
          fields: {
            oneOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } }
            ]
          },
          inverted: { type: "boolean" },
          conditions: { type: "object" },
          reason: { type: "string" }
        }
      },
      AbilityPolicyResponse: {
        type: "object",
        properties: {
          rules: {
            type: "array",
            items: { $ref: "#/components/schemas/AbilityRule" }
          },
          set: { type: "string" },
          userId: { type: "string" },
          version: { type: "number" },
          issuedAt: { type: "string" }
        }
      },
      CreatePolicyRequest: {
        type: "object",
        required: ["setKey", "rules"],
        properties: {
          setKey: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          rules: {
            type: "array",
            items: { $ref: "#/components/schemas/AbilityRule" }
          },
          createdBy: { type: "string" }
        }
      },
      CreatePolicyResponse: {
        type: "object",
        properties: {
          set: { type: "string" },
          version: { type: "number" },
          issuedAt: { type: "string" }
        }
      }
    }
  }
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
      ? (resolveUserTokens(rule.conditions, user) as ApiAbilityRule["conditions"])
      : rule.conditions
  }));

const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const logError = (message: string, error: unknown) => {
  console.error(message, error);
};

const seedPolicySets = async () => {
  const db = getDb();
  const existing = await db
    .select({ id: policySets.id, key: policySets.key })
    .from(policySets);
  const existingMap = new Map(existing.map((item) => [item.key, item.id]));

  for (const [key, template] of Object.entries(policyTemplates)) {
    const existingId = existingMap.get(key);
    const setId =
      existingId ??
      (
        await db
          .insert(policySets)
          .values({
            key,
            name: template.name,
            description: template.description
          })
          .returning({ id: policySets.id })
      )[0]?.id;

    if (!setId) {
      continue;
    }

    const latest = await db
      .select({ id: policyVersions.id })
      .from(policyVersions)
      .where(eq(policyVersions.setId, setId))
      .limit(1);

    if (latest.length === 0) {
      await db.insert(policyVersions).values({
        setId,
        version: 1,
        rules: template.rules
      });
    }
  }
};

app.get("/api/openapi.json", (_req, res) => {
  res.status(200).json(openApiSpec);
});

const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Policy API Docs</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
    />
    <style>
      html, body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: "/api/openapi.json",
          dom_id: "#swagger-ui",
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layout: "BaseLayout"
        });
      };
    </script>
  </body>
</html>`;

app.get("/api/docs", (_req, res) => {
  res.status(200).type("text/html").send(swaggerHtml);
});

app.get("/api/ability", async (req, res) => {
  try {
    const setKey = (req.query.set as PolicySetKey) ?? "sales-focus";
    const userKey = (req.query.user as string) ?? "sales";
    const user = users[userKey] ?? users.sales;
    const db = getDb();

    await seedPolicySets();

    const setRecord = await db
      .select({ id: policySets.id, key: policySets.key })
      .from(policySets)
      .where(eq(policySets.key, setKey))
      .limit(1);

    if (setRecord.length === 0) {
      res.status(404).json({ error: "Policy set not found" });
      return;
    }

    const versionRecord = await db
      .select({
        rules: policyVersions.rules,
        version: policyVersions.version,
        createdAt: policyVersions.createdAt
      })
      .from(policyVersions)
      .where(eq(policyVersions.setId, setRecord[0].id))
      .orderBy(desc(policyVersions.version))
      .limit(1);

    if (versionRecord.length === 0) {
      res.status(404).json({ error: "Policy version not found" });
      return;
    }

    const record = versionRecord[0];
    const rules = resolveRulesForUser(record.rules as ApiAbilityRule[], user);
    const issuedAt =
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : new Date(record.createdAt).toISOString();

    const payload: AbilityPolicyResponse = {
      rules,
      set: setKey,
      userId: user.id,
      version: record.version,
      issuedAt
    };

    res.status(200).json(payload);
  } catch (error) {
    logError("Failed to load policy:", error);
    res
      .status(500)
      .json({ error: "Failed to load policy", detail: formatError(error) });
  }
});

app.post("/api/policies/seed", async (_req, res) => {
  try {
    await seedPolicySets();
    res.status(200).json({ ok: true });
  } catch (error) {
    logError("Seed failed:", error);
    res.status(500).json({ error: "Seed failed", detail: formatError(error) });
  }
});

app.post("/api/ability", async (req, res) => {
  try {
    const body = req.body as {
      setKey?: PolicySetKey;
      name?: string;
      description?: string;
      rules?: ApiAbilityRule[];
      createdBy?: string;
    };

    if (!body.setKey || !Array.isArray(body.rules)) {
      res.status(400).json({ error: "setKey and rules are required" });
      return;
    }

    const db = getDb();

    const existingSet = await db
      .select({ id: policySets.id })
      .from(policySets)
      .where(eq(policySets.key, body.setKey))
      .limit(1);

    const setId =
      existingSet[0]?.id ??
      (
        await db
          .insert(policySets)
          .values({
            key: body.setKey,
            name: body.name ?? body.setKey,
            description: body.description ?? null
          })
          .returning({ id: policySets.id })
      )[0]?.id;

    if (!setId) {
      res.status(500).json({ error: "Failed to create policy set" });
      return;
    }

    const latestVersion = await db
      .select({ version: policyVersions.version })
      .from(policyVersions)
      .where(eq(policyVersions.setId, setId))
      .orderBy(desc(policyVersions.version))
      .limit(1);

    const nextVersion = (latestVersion[0]?.version ?? 0) + 1;

    const inserted = await db
      .insert(policyVersions)
      .values({
        setId,
        version: nextVersion,
        rules: body.rules,
        createdBy: body.createdBy ?? null
      })
      .returning({
        version: policyVersions.version,
        createdAt: policyVersions.createdAt
      });

    const createdAt = inserted[0]?.createdAt;
    const issuedAt =
      createdAt instanceof Date
        ? createdAt.toISOString()
        : new Date().toISOString();

    res.status(200).json({
      set: body.setKey,
      version: inserted[0]?.version ?? nextVersion,
      issuedAt
    });
  } catch (error) {
    logError("Failed to save policy:", error);
    res
      .status(500)
      .json({ error: "Failed to save policy", detail: formatError(error) });
  }
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

export default app;
