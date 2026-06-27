"use client";
import { useRef } from "react";
import { useWizard, AnimalType, CollateralItem, makeItem } from "@/context/LoanWizardContext";
import { signTransaction } from "@/lib/freighterClient";
import { submitSignedXdr } from "@/lib/stellarUtils";
import Spinner from "@/components/Spinner";

const ANIMAL_TYPES: { value: AnimalType; label: string; emoji: string }[] = [
  { value: "cattle", label: "Cattle", emoji: "🐄" },
  { value: "goat", label: "Goat", emoji: "🐐" },
  { value: "sheep", label: "Sheep", emoji: "🐑" },
];

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Props {
  walletAddress: string;
}

export default function StepCollateral({ walletAddress }: Props) {
  const { collaterals, loading, error, setField, setCollaterals, nextStep } = useWizard();
  const dragIndexRef = useRef<number | null>(null);

  // ── Item helpers ────────────────────────────────────────────────────────────

  function updateItem(index: number, patch: Partial<CollateralItem>) {
    setCollaterals(collaterals.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function addItem() {
    setCollaterals([...collaterals, makeItem()]);
  }

  function removeItem(index: number) {
    if (collaterals.length === 1) return;
    setCollaterals(collaterals.filter((_, i) => i !== index));
  }

  function moveItem(from: number, to: number) {
    if (from === to) return;
    const next = [...collaterals];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setCollaterals(next);
  }

  // ── Keyboard reorder ────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      moveItem(index, index - 1);
    } else if (e.key === "ArrowDown" && index < collaterals.length - 1) {
      e.preventDefault();
      moveItem(index, index + 1);
    }
  }

  // ── Pointer drag ─────────────────────────────────────────────────────────────

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>, index: number) {
    // Only drag from the handle
    dragIndexRef.current = index;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onDragStart(e: React.DragEvent, index: number) {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      moveItem(dragIndexRef.current, index);
      dragIndexRef.current = index;
    }
  }

  function onDragEnd() {
    dragIndexRef.current = null;
  }

  // ── Validation & submit ──────────────────────────────────────────────────────

  function validate(): string | null {
    for (let i = 0; i < collaterals.length; i++) {
      const c = collaterals[i];
      if (!c.count || parseInt(c.count) < 1) return `Item ${i + 1}: enter at least 1 animal.`;
      if (!c.appraisedValue || parseInt(c.appraisedValue) < 1)
        return `Item ${i + 1}: enter a valid appraised value.`;
    }
    return null;
  }

  async function handleRegister() {
    const err = validate();
    if (err) { setField("error", err); return; }

    setField("loading", true);
    setField("error", null);
    try {
      // Register each collateral in order and collect IDs
      const registered: CollateralItem[] = [];
      for (const item of collaterals) {
        const res = await fetch(`${API}/api/collateral/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: walletAddress,
            animal_type: item.animalType,
            count: parseInt(item.count),
            appraised_value: parseInt(item.appraisedValue),
          }),
        });
        if (!res.ok) throw new Error("Registration failed. Please try again.");
        const { xdr } = await res.json();
        const { signedTxXdr } = await signTransaction(xdr, {
          network: process.env.NEXT_PUBLIC_NETWORK || "TESTNET",
        });
        const collateralId = await submitSignedXdr(signedTxXdr);
        registered.push({ ...item, collateralId: String(collateralId) });
      }

      setCollaterals(registered);
      // Sync legacy single-item fields for downstream steps
      setField("collateralId", registered.map((r) => r.collateralId).join(","));
      setField("animalType", registered[0].animalType);
      setField("count", registered[0].count);
      setField("appraisedValue", registered[0].appraisedValue);
      nextStep();
    } catch (e: any) {
      setField("error", e.message || "Something went wrong.");
    } finally {
      setField("loading", false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brown">Select Your Collateral</h2>
        <p className="text-brown/60 mt-1 text-sm">
          Add one or more livestock items. Drag to prioritise which is pledged first.
        </p>
      </div>

      <ul aria-label="Collateral items" className="space-y-3">
        {collaterals.map((item, index) => (
          <li
            key={item.id}
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            className="border border-brown/20 rounded-xl p-4 bg-white flex gap-3 items-start"
          >
            {/* Drag handle */}
            <div
              role="button"
              aria-label="Drag to reorder"
              tabIndex={0}
              onPointerDown={(e) => onPointerDown(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="cursor-grab active:cursor-grabbing mt-1 text-brown/30 hover:text-brown/60 select-none focus:outline-none focus:ring-2 focus:ring-gold rounded"
              title="Drag to reorder or use arrow keys"
            >
              {/* Grip icon */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
                <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
                <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
              </svg>
            </div>

            <div className="flex-1 space-y-3">
              {/* Animal type */}
              <div className="flex gap-2">
                {ANIMAL_TYPES.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateItem(index, { animalType: value })}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      item.animalType === value
                        ? "border-gold bg-gold/10 text-brown"
                        : "border-brown/20 hover:border-brown/40 text-brown/60"
                    }`}
                  >
                    {emoji} {label}
                  </button>
                ))}
              </div>

              {/* Count + Value */}
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Count"
                  aria-label={`Item ${index + 1} count`}
                  value={item.count}
                  onChange={(e) => updateItem(index, { count: e.target.value })}
                  className="w-24 border border-brown/30 rounded-lg px-3 py-2 text-sm text-brown placeholder-brown/40 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Appraised value (stroops)"
                  aria-label={`Item ${index + 1} appraised value`}
                  value={item.appraisedValue}
                  onChange={(e) => updateItem(index, { appraisedValue: e.target.value })}
                  className="flex-1 border border-brown/30 rounded-lg px-3 py-2 text-sm text-brown placeholder-brown/40 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
              </div>
            </div>

            {/* Remove button */}
            {collaterals.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label={`Remove item ${index + 1}`}
                className="text-brown/30 hover:text-red-500 transition-colors mt-1"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addItem}
        className="text-sm text-brown/60 hover:text-brown border border-dashed border-brown/20 hover:border-brown/40 rounded-xl px-4 py-2 w-full transition"
      >
        + Add another collateral item
      </button>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full bg-brown text-cream py-3 rounded-xl font-semibold hover:bg-brown/80 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Spinner />
            Registering on-chain…
          </>
        ) : (
          "Register & Continue →"
        )}
      </button>
    </div>
  );
}
