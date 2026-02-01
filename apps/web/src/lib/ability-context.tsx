"use client";

import { createContextualCan } from "@casl/react";
import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import type { RawRuleOf } from "@casl/ability";

import type { AppAbility, User } from "./ability";
import { abilityOptions, AppAbility as AppAbilityClass, buildAbilityFor } from "./ability";

const defaultAbility = new AppAbilityClass([], abilityOptions);
export const AbilityContext = createContext<AppAbility>(defaultAbility);

export const useCurrentAbility = () => {
  const currentUserContext = useContext(AbilityContext);

  if (!currentUserContext) {
    throw new Error(
      "useCurrentAbility has to be used within <AbilityContext.Provider>"
    );
  }

  return currentUserContext;
};

export const Can = createContextualCan(AbilityContext.Consumer);



type AbilityProviderProps = PropsWithChildren<{
  user: User;
  rules?: RawRuleOf<AppAbility>[];
}>;

export function AbilityProvider({ user, rules, children }: AbilityProviderProps) {
  const ability = useMemo(() => {
    if (rules) {
      return new AppAbilityClass(rules, abilityOptions);
    }

    return buildAbilityFor(user);
  }, [user, rules]);

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
