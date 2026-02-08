"use client";

import { useEffect, useMemo, useState } from "react";
import { Can } from "../lib/ability-context";
import {
  Order,
  Report,
  User,
  orderSubject,
  reportSubject
} from "../lib/ability";
import { AbilityProvider } from "../lib/ability-context";
import type { AbilityPolicyResponse, ApiAbilityRule } from "../lib/ability-policy";
import { policyTemplates, type PolicySetKey } from "@policies";

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

const orders: Order[] = [
  {
    id: "order-1",
    businessUnit: "electronics",
    region: "north",
    ownerId: "user-1",
    status: "draft",
    total: 1200
  },
  {
    id: "order-2",
    businessUnit: "fashion",
    region: "south",
    ownerId: "user-4",
    status: "submitted",
    total: 320
  }
];

const reports: Report[] = [
  {
    id: "report-1",
    businessUnit: "electronics",
    region: "north",
    visibilityLevel: 1
  },
  {
    id: "report-2",
    businessUnit: "fashion",
    region: "south",
    visibilityLevel: 3
  }
];

const roleLabels: Record<User["role"], string> = {
  sales_bu: "銷售事業部",
  general_manager: "總經理",
  admin: "管理員"
};

const roleDescriptions: Record<User["role"], string> = {
  sales_bu: "聚焦單一事業部，可編輯自己的草稿訂單。",
  general_manager: "負責區域審批與訂單管理。",
  admin: "擁有全部對象與操作權限。"
};

const policySets = Object.entries(policyTemplates).map(([key, value]) => ({
  key: key as PolicySetKey,
  label: value.name,
  description: value.description
}));

const policyCards = [
  {
    title: "銷售事業部",
    body: "建立訂單、查看本事業部訂單、更新自己的草稿訂單。"
  },
  {
    title: "銷售事業部（ABAC）",
    body: "當報表可見等級小於等於使用者等級時，允許查看本事業部報表。"
  },
  {
    title: "總經理",
    body: "查看、更新、審批所屬區域訂單，並查看區域報表。"
  },
  {
    title: "管理員",
    body: "管理平台內全部對象與操作。"
  }
];

const regionLabels: Record<User["region"], string> = {
  north: "北區",
  south: "南區"
};

const businessUnitLabels: Record<User["businessUnit"], string> = {
  electronics: "電子",
  fashion: "時尚",
  home: "居家"
};

const orderStatusLabels: Record<Order["status"], string> = {
  draft: "草稿",
  submitted: "已提交",
  approved: "已核准",
  shipped: "已出貨"
};

export default function Home() {
  const [selected, setSelected] = useState<keyof typeof users>("sales");
  const user = useMemo(() => users[selected], [selected]);
  const [policySet, setPolicySet] = useState<PolicySetKey>("sales-focus");
  const [policyFetchMode, setPolicyFetchMode] = useState<"assigned" | "preview">(
    "assigned"
  );
  const [policyRules, setPolicyRules] = useState<ApiAbilityRule[] | null>(null);
  const [policyStatus, setPolicyStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [policyIssuedAt, setPolicyIssuedAt] = useState<string | null>(null);
  const [policyVersion, setPolicyVersion] = useState<number | null>(null);
  const apiBase = useMemo(
    () => process.env.API_BASE_URL?.replace(/\/$/, "") ?? "",
    []
  );

  const resetPolicyState = () => {
    setPolicyRules(null);
    setPolicyStatus("idle");
    setPolicyIssuedAt(null);
    setPolicyVersion(null);
  };

  useEffect(() => {
    resetPolicyState();

    const controller = new AbortController();

    const loadPolicy = async () => {
      setPolicyStatus("loading");

      try {
        const data = await fetchPolicyFromApi(
          selected,
          policyFetchMode === "preview" ? policySet : undefined,
          controller.signal
        );
        setPolicyRules(data.rules);
        setPolicyIssuedAt(data.issuedAt ?? null);
        setPolicyVersion(typeof data.version === "number" ? data.version : null);
        if (
          policyFetchMode === "assigned" &&
          data.set &&
          data.set !== policySet &&
          Object.prototype.hasOwnProperty.call(policyTemplates, data.set)
        ) {
          setPolicySet(data.set as PolicySetKey);
        }
        setPolicyStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setPolicyStatus("error");
      }
    };

    void loadPolicy();

    return () => controller.abort();
  }, [apiBase, selected, policySet, policyFetchMode]);

  const buildApiUrl = (path: string, params?: Record<string, string>) => {
    if (!params) {
      return `${apiBase}${path}`;
    }

    const query = new URLSearchParams(params);
    return `${apiBase}${path}?${query.toString()}`;
  };

  const fetchPolicyFromApi = async (
    userKey: string,
    setKey?: PolicySetKey,
    signal?: AbortSignal
  ) => {
    const params: Record<string, string> = { user: userKey };
    if (setKey) {
      params.set = setKey;
    }

    const response = await fetch(buildApiUrl("/api/ability", params), {
      signal,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Failed to fetch policy");
    }

    return (await response.json()) as AbilityPolicyResponse;
  };

  const publishPolicyVersion = async (setKey: PolicySetKey) => {
    const template = policyTemplates[setKey];

    if (!template) {
      throw new Error("Policy template not found");
    }

    const response = await fetch(buildApiUrl("/api/ability"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setKey,
        name: template.name,
        description: template.description,
        rules: template.rules,
        createdBy: user.id
      })
    });

    if (!response.ok) {
      throw new Error("Failed to update policy");
    }
  };

  const refreshPolicy = async (mode: "assigned" | "preview" = policyFetchMode) => {
    const data = await fetchPolicyFromApi(
      selected,
      mode === "preview" ? policySet : undefined
    );
    setPolicyRules(data.rules);
    setPolicyIssuedAt(data.issuedAt ?? null);
    setPolicyVersion(typeof data.version === "number" ? data.version : null);
    if (
      mode === "assigned" &&
      data.set &&
      data.set !== policySet &&
      Object.prototype.hasOwnProperty.call(policyTemplates, data.set)
    ) {
      setPolicySet(data.set as PolicySetKey);
    }
  };

  const updatePolicy = async () => {
    setPolicyStatus("loading");
    setPolicyFetchMode("assigned");

    try {
      await publishPolicyVersion(policySet);
      await refreshPolicy("assigned");
      setPolicyStatus("ready");
    } catch (error) {
      setPolicyStatus("error");
    }
  };

  return (
    <AbilityProvider user={user} rules={policyRules ?? undefined}>
      <main className="page">
        <header className="hero">
          <div className="hero__copy">
            <span className="badge">CASL RBAC + ABAC</span>
            <h1>權限控制工作台</h1>
            <p>
              建模不同角色在訂單與報表中的權限，並即時驗證每項能力。
            </p>
            <div className="meta-grid">
              <div className="meta-card">
                <span className="meta-label">目前角色</span>
                <strong>{roleLabels[user.role]}</strong>
              </div>
              <div className="meta-card">
                <span className="meta-label">區域 / 事業部</span>
                <strong>
                  {regionLabels[user.region]} / {businessUnitLabels[user.businessUnit]}
                </strong>
              </div>
              <div className="meta-card">
                <span className="meta-label">權限等級</span>
                <strong>等級 {user.level}</strong>
              </div>
              <div className="meta-card">
                <span className="meta-label">使用者 ID</span>
                <strong>{user.id}</strong>
              </div>
            </div>
          </div>
          <div className="hero__panel">
            <div className="panel-header">
              <h3>切換角色</h3>
              <p>預覽 CASL 對 RBAC 與 ABAC 規則的評估結果。</p>
            </div>
            <div className="role-grid">
              {Object.entries(users).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelected(key as keyof typeof users);
                      setPolicyFetchMode("assigned");
                    }}
                    className={`role-btn ${
                      key === selected ? "role-btn--active" : ""
                    }`}
                  >
                  <span>{roleLabels[value.role]}</span>
                  <span className="role-meta">
                    {regionLabels[value.region]} / {businessUnitLabels[value.businessUnit]}
                  </span>
                </button>
              ))}
            </div>
            <div className="policy-controls">
              <div className="policy-options">
                {policySets.map((policy) => (
                  <button
                    key={policy.key}
                    type="button"
                    onClick={() => {
                      setPolicySet(policy.key);
                      setPolicyFetchMode("preview");
                    }}
                    className={`policy-btn ${
                      policySet === policy.key ? "policy-btn--active" : ""
                    }`}
                  >
                    <span>{policy.label}</span>
                    <span>{policy.description}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="update-btn"
                onClick={updatePolicy}
                disabled={policyStatus === "loading"}
              >
                {policyStatus === "loading" ? "更新策略中..." : "更新策略"}
              </button>
              <div className="policy-status">
                {policyRules ? (
                  <span className="pill pill--success">已啟用 API 策略</span>
                ) : (
                  <span className="pill pill--warn">已啟用本地規則</span>
                )}
                <span>
                  目前策略：
                  <strong>
                    {policySets.find((policy) => policy.key === policySet)?.label ??
                      policySet}
                  </strong>
                </span>
                {policyVersion ? <span>版本 {policyVersion}</span> : null}
                {policyIssuedAt ? (
                  <span>
                    更新時間 {new Date(policyIssuedAt).toLocaleTimeString("zh-TW")}
                  </span>
                ) : (
                  <span>等待更新</span>
                )}
                {policyStatus === "error" ? (
                  <span className="policy-error">請求失敗</span>
                ) : null}
              </div>
            </div>
            <div className="panel-note">
              <span className="pill pill--info">即時校驗</span>
              <p>{roleDescriptions[user.role]}</p>
            </div>
          </div>
        </header>

        <section className="section">
          <div className="section__header">
            <h2>訂單</h2>
            <p>每筆訂單會依區域與歸屬人屬性進行校驗。</p>
          </div>
          <div className="cards-grid">
            {orders.map((order, index) => (
              <article
                key={order.id}
                className="card"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="card__header">
                  <div>
                    <span className="eyebrow">訂單</span>
                    <h3>{order.id}</h3>
                  </div>
                  <span className={`status status--${order.status}`}>
                    {orderStatusLabels[order.status]}
                  </span>
                </div>
                <div className="card__body">
                  <div className="data">
                    <span>事業部</span>
                    <strong>{businessUnitLabels[order.businessUnit]}</strong>
                  </div>
                  <div className="data">
                    <span>區域</span>
                    <strong>{regionLabels[order.region]}</strong>
                  </div>
                  <div className="data">
                    <span>歸屬人</span>
                    <strong>{order.ownerId}</strong>
                  </div>
                  <div className="data">
                    <span>金額</span>
                    <strong>${order.total}</strong>
                  </div>
                </div>
                <div className="permissions">
                  <Can I="read" this={orderSubject(order)}>
                    <span className="pill pill--info">查看</span>
                  </Can>
                  <Can I="update" this={orderSubject(order)}>
                    <span className="pill pill--success">更新</span>
                  </Can>
                  <Can I="approve" this={orderSubject(order)}>
                    <span className="pill pill--warn">審批</span>
                  </Can>
                  <Can I="delete" this={orderSubject(order)}>
                    <span className="pill pill--danger">刪除</span>
                  </Can>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section__header">
            <h2>報表</h2>
            <p>報表可見性由事業部與使用者等級共同決定。</p>
          </div>
          <div className="cards-grid">
            {reports.map((report, index) => (
              <article
                key={report.id}
                className="card"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="card__header">
                  <div>
                    <span className="eyebrow">報表</span>
                    <h3>{report.id}</h3>
                  </div>
                  <span className="status status--report">
                    等級 {report.visibilityLevel}
                  </span>
                </div>
                <div className="card__body">
                  <div className="data">
                    <span>事業部</span>
                    <strong>{businessUnitLabels[report.businessUnit]}</strong>
                  </div>
                  <div className="data">
                    <span>區域</span>
                    <strong>{regionLabels[report.region]}</strong>
                  </div>
                  <div className="data">
                    <span>可見等級</span>
                    <strong>等級 {report.visibilityLevel}</strong>
                  </div>
                </div>
                <div className="permissions">
                  <Can I="read" this={reportSubject(report)}>
                    <span className="pill pill--info">查看報表</span>
                  </Can>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section section--tight">
          <div className="section__header">
            <h2>策略摘要</h2>
            <p>用於驅動上述校驗的高層規則。</p>
          </div>
          <div className="policy-grid">
            {policyCards.map((card) => (
              <div key={card.title} className="policy-card">
                <span className="eyebrow">{card.title}</span>
                <p>{card.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AbilityProvider>
  );
}
