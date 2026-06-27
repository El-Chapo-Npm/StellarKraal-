"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export type AnimalType = "cattle" | "goat" | "sheep";

export interface CollateralItem {
  id: string; // local uuid before on-chain registration
  animalType: AnimalType;
  count: string;
  appraisedValue: string;
  collateralId: string; // returned after on-chain register
}

export interface WizardState {
  // Step 1 – Collateral (multi-item, ordered)
  collaterals: CollateralItem[];

  // Legacy single-item fields (kept for backward compat with StepAmount/Review/Confirm)
  animalType: AnimalType;
  count: string;
  appraisedValue: string;
  collateralId: string;

  // Step 2 – Amount
  loanAmount: string;
  loanTermDays: string;

  // Meta
  step: number;
  loading: boolean;
  error: string | null;
}

interface WizardCtx extends WizardState {
  setField: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  setCollaterals: (items: CollateralItem[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

function makeItem(overrides?: Partial<CollateralItem>): CollateralItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    animalType: "cattle",
    count: "",
    appraisedValue: "",
    collateralId: "",
    ...overrides,
  };
}

const defaults: WizardState = {
  collaterals: [makeItem()],
  animalType: "cattle",
  count: "",
  appraisedValue: "",
  collateralId: "",
  loanAmount: "",
  loanTermDays: "30",
  step: 1,
  loading: false,
  error: null,
};

const LoanWizardContext = createContext<WizardCtx | null>(null);

export function LoanWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(defaults);

  function setField<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function setCollaterals(items: CollateralItem[]) {
    setState((s) => ({ ...s, collaterals: items }));
  }

  function nextStep() {
    setState((s) => ({ ...s, step: Math.min(s.step + 1, 4), error: null }));
  }

  function prevStep() {
    setState((s) => ({ ...s, step: Math.max(s.step - 1, 1), error: null }));
  }

  function reset() {
    setState(defaults);
  }

  return (
    <LoanWizardContext.Provider value={{ ...state, setField, setCollaterals, nextStep, prevStep, reset }}>
      {children}
    </LoanWizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(LoanWizardContext);
  if (!ctx) throw new Error("useWizard must be used inside LoanWizardProvider");
  return ctx;
}

export { makeItem };