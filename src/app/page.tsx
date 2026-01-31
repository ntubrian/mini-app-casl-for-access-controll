"use client";

import { useMemo, useState } from "react";
import { Can } from "@casl/react";
import {
  Order,
  Report,
  User,
  orderSubject,
  reportSubject
} from "../lib/ability";
import { AbilityProvider } from "../lib/ability-context";

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
  sales_bu: "Sales BU",
  general_manager: "General Manager",
  admin: "Admin"
};

export default function Home() {
  const [selected, setSelected] = useState<keyof typeof users>("sales");
  const user = useMemo(() => users[selected], [selected]);

  return (
    <AbilityProvider user={user}>
      <main
        style={{
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          maxWidth: 960,
          margin: "0 auto"
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ margin: 0 }}>E-commerce Dashboard Access</h1>
          <p style={{ margin: 0 }}>
            Switch the signed-in role to see RBAC + ABAC checks powered by CASL.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(users).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key as keyof typeof users)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border:
                    key === selected
                      ? "2px solid #0f62fe"
                      : "1px solid #c1c7d0",
                  background: key === selected ? "#e8f0ff" : "#fff",
                  cursor: "pointer"
                }}
              >
                {roleLabels[value.role]}
              </button>
            ))}
          </div>
        </header>

        <section style={{ display: "grid", gap: 16 }}>
          <h2 style={{ margin: 0 }}>Orders</h2>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 12,
                padding: 16,
                display: "grid",
                gap: 8
              }}
            >
              <strong>{order.id}</strong>
              <span>BU: {order.businessUnit}</span>
              <span>Region: {order.region}</span>
              <span>Status: {order.status}</span>
              <span>Total: ${order.total}</span>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Can I="read" this={orderSubject(order)}>
                  <span style={{ color: "#0f62fe" }}>Can view</span>
                </Can>
                <Can I="update" this={orderSubject(order)}>
                  <span style={{ color: "#198038" }}>Can update</span>
                </Can>
                <Can I="approve" this={orderSubject(order)}>
                  <span style={{ color: "#8a3ffc" }}>Can approve</span>
                </Can>
                <Can I="delete" this={orderSubject(order)}>
                  <span style={{ color: "#da1e28" }}>Can delete</span>
                </Can>
              </div>
            </div>
          ))}
        </section>

        <section style={{ display: "grid", gap: 16 }}>
          <h2 style={{ margin: 0 }}>Reports</h2>
          {reports.map((report) => (
            <div
              key={report.id}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 12,
                padding: 16,
                display: "grid",
                gap: 8
              }}
            >
              <strong>{report.id}</strong>
              <span>BU: {report.businessUnit}</span>
              <span>Region: {report.region}</span>
              <span>Visibility level: {report.visibilityLevel}</span>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Can I="read" this={reportSubject(report)}>
                  <span style={{ color: "#0f62fe" }}>Can view</span>
                </Can>
              </div>
            </div>
          ))}
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Defined abilities</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Sales BU: create orders, read orders in their BU, update own draft orders.</li>
            <li>
              Sales BU (ABAC): read reports in their BU if visibility &lt;= their
              level.
            </li>
            <li>General Manager: read/update/approve orders in their region, read region reports.</li>
            <li>Admin: manage everything.</li>
          </ul>
        </section>
      </main>
    </AbilityProvider>
  );
}
