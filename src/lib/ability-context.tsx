"use client";

import { createContext, PropsWithChildren, useMemo } from "react";
import { AbilityContext } from "@casl/react";
import type { AppAbility, User } from "./ability";
import { buildAbilityFor } from "./ability";

export const AppAbilityContext = createContext<AppAbility | null>(null);

export function AbilityProvider({ user, children }: PropsWithChildren<{ user: User }>) {
  const ability = useMemo(() => buildAbilityFor(user), [user]);

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
