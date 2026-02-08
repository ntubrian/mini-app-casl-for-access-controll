import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const policySets = pgTable("policy_sets", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const policyVersions = pgTable("policy_versions", {
  id: serial("id").primaryKey(),
  setId: integer("set_id")
    .notNull()
    .references(() => policySets.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  rules: jsonb("rules").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text("created_by")
});

export const policyAssignments = pgTable("policy_assignments", {
  id: serial("id").primaryKey(),
  userKey: text("user_key").notNull().unique(),
  setKey: text("set_key").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});
