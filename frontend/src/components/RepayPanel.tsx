"use client";
import { useState } from "react";
import { signTransaction } from "@/lib/freighterClient";
import { submitSignedXdr } from "@/lib/stellarUtils";
import { Input, Button } from "@/components/ui";
import { useToast } from "@/components/toast";

interface Props {
  walletAddress: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function RepayPanel({ walletAddress }: Props) {
  const [loanId, setLoanId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function repay() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/loan/repay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrower: walletAddress,
          loan_id: parseInt(loanId),
          amount: parseInt(amount),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Repayment failed");
      }
      const { xdr } = await res.json();
      const { signedTxXdr } = await signTransaction(xdr, {
        network: process.env.NEXT_PUBLIC_NETWORK || "TESTNET",
      });
      await submitSignedXdr(signedTxXdr);
      toast.success("Repayment submitted successfully!");
      setLoanId("");
      setAmount("");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow mb-4">
      <h2 className="text-xl font-semibold text-brown-700 mb-4">Repay Loan</h2>
      <div className="space-y-4">
        <Input
          label="Loan ID"
          type="number"
          placeholder="Enter your loan ID"
          value={loanId}
          onChange={(e) => setLoanId(e.target.value)}
          disabled={loading}
        />
        <Input
          label="Amount (stroops)"
          type="number"
          placeholder="Amount to repay"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
        />
        <Button
          fullWidth
          loading={loading}
          disabled={!loanId || !amount}
          onClick={repay}
        >
          {loading ? "Processing…" : "Repay"}
        </Button>
      </div>
    </div>
  );
}
