'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchFilterBar from '@/components/SearchFilterBar';
import PageTransition from '@/components/PageTransition';
import StatusBadge from '@/components/StatusBadge';

interface Loan {
  id: string;
  borrower: string;
  amount: number;
  status: string;
  createdAt: string;
}

const STATUS_OPTIONS = ['active', 'repaid', 'liquidated', 'pending'];
const TYPE_OPTIONS: string[] = [];

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function LoanListContent() {
  const searchParams = useSearchParams();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/loans`)
      .then((r) => r.json())
      .then((data) => setLoans(Array.isArray(data) ? data : []))
      .catch(() => setLoans([]))
      .finally(() => setLoading(false));
  }, []);

  const q = (searchParams.get('q') ?? '').toLowerCase();
  const statuses = searchParams.getAll('status');

  const filtered = loans.filter((loan) => {
    const matchesQuery =
      !q ||
      loan.id.toLowerCase().includes(q) ||
      loan.borrower.toLowerCase().includes(q) ||
      loan.status.toLowerCase().includes(q);
    const matchesStatus = statuses.length === 0 || statuses.includes(loan.status);
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <SearchFilterBar
        statusOptions={STATUS_OPTIONS}
        typeOptions={TYPE_OPTIONS}
        searchPlaceholder="Search by loan ID, borrower, or status…"
      />

      {loading ? (
        <p className="text-brown/60 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-brown/60 text-sm">No loans match your filters.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((loan) => (
            <li
              key={loan.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-brown/10 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-brown text-sm">Loan #{loan.id}</p>
                <p className="text-xs text-brown/60 truncate max-w-xs">{loan.borrower}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-brown">{loan.amount.toLocaleString()}</p>
                <StatusBadge status={loan.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LoansPage() {
  return (
    <PageTransition>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-brown mb-6">Loans</h1>
        <Suspense fallback={<p className="text-brown/60 text-sm">Loading…</p>}>
          <LoanListContent />
        </Suspense>
      </main>
    </PageTransition>
  );
}
