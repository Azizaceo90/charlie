"use client";

import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Clock,
  Paperclip,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";
import { useData } from "@/lib/store";
import { Expense, PayrollEntry } from "@/lib/types";
import { Card, EmptyState, Modal, PageHeader, StatCard } from "@/components/ui";
import { dateOnly } from "@/lib/format";

const EXPENSE_CATEGORIES = [
  "Travel",
  "Meals",
  "Software",
  "Equipment",
  "Office",
  "Training",
  "Other",
];

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const EXPENSE_CHIP: Record<string, string> = {
  pending: "bg-accent-amber/15 text-accent-amber",
  approved: "bg-accent-blue/15 text-accent-blue",
  reimbursed: "bg-accent-green/15 text-accent-green",
  rejected: "bg-accent-red/15 text-accent-red",
};

export default function PayrollPage() {
  const { currentUser } = useData();
  const isAdmin = currentUser?.role === "admin";
  const [tab, setTab] = useState<"expenses" | "payroll">("expenses");

  if (!currentUser) return null;

  return (
    <div>
      <PageHeader
        title="Payroll & Expenses"
        subtitle={
          isAdmin
            ? "Review expense claims and run payroll for your team."
            : "Submit expenses and see your pay history."
        }
      />

      <div className="mb-5 inline-flex rounded-lg border border-line bg-bg-soft p-1">
        {(["expenses", "payroll"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-brand text-white"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "expenses" ? (
        <ExpensesTab isAdmin={isAdmin} />
      ) : (
        <PayrollTab isAdmin={isAdmin} />
      )}
    </div>
  );
}

function ExpensesTab({ isAdmin }: { isAdmin: boolean }) {
  const { expenses, addExpense, updateExpense, removeExpense, currentUser } =
    useData();
  const [showAdd, setShowAdd] = useState(false);

  const totals = useMemo(() => {
    const sum = (s: string) =>
      expenses.filter((e) => e.status === s).reduce((a, e) => a + e.amount, 0);
    return {
      pending: sum("pending"),
      approved: sum("approved"),
      reimbursed: sum("reimbursed"),
    };
  }, [expenses]);

  async function setStatus(e: Expense, status: Expense["status"]) {
    try {
      await updateExpense(e.id, { status });
    } catch {
      window.alert("Could not update the expense. Try again.");
    }
  }

  async function del(e: Expense) {
    if (!window.confirm(`Delete the ${money(e.amount)} ${e.category} expense?`))
      return;
    try {
      await removeExpense(e.id);
    } catch {
      window.alert("Could not delete. Try again.");
    }
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending"
          value={money(totals.pending)}
          tone="amber"
          icon={<Clock className="h-4 w-4" />}
          hint="Awaiting approval"
        />
        <StatCard
          label="Approved"
          value={money(totals.approved)}
          tone="blue"
          icon={<CheckCircle2 className="h-4 w-4" />}
          hint="To be reimbursed"
        />
        <StatCard
          label="Reimbursed"
          value={money(totals.reimbursed)}
          tone="green"
          icon={<BadgeDollarSign className="h-4 w-4" />}
          hint="Paid out"
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">
          {isAdmin ? "All expenses" : "My expenses"}
        </h2>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8" />}
          title="No expenses yet"
          hint="Add an expense to get started."
        />
      ) : (
        <Card className="divide-y divide-line">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-900">
                    {money(e.amount)}
                  </span>
                  <span className="chip bg-bg-soft text-neutral-600">
                    {e.category}
                  </span>
                  <span className={`chip ${EXPENSE_CHIP[e.status]}`}>
                    {e.status}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-neutral-500">
                  {isAdmin && <span className="font-medium">{e.userName} · </span>}
                  {dateOnly(e.date)}
                  {e.description ? ` · ${e.description}` : ""}
                </div>
              </div>
              {e.receiptUrl && (
                <a
                  href={e.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={e.receiptName ?? undefined}
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-bg-hover hover:text-brand"
                  title="View receipt"
                >
                  <Paperclip className="h-4 w-4" />
                </a>
              )}
              {isAdmin && e.status === "pending" && (
                <>
                  <button
                    className="btn-subtle text-xs"
                    onClick={() => setStatus(e, "approved")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-bg-hover hover:text-accent-red"
                    title="Reject"
                    onClick={() => setStatus(e, "rejected")}
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </>
              )}
              {isAdmin && e.status === "approved" && (
                <button
                  className="btn-subtle text-xs"
                  onClick={() => setStatus(e, "reimbursed")}
                >
                  <BadgeDollarSign className="h-3.5 w-3.5" /> Mark reimbursed
                </button>
              )}
              {e.userId === currentUser?.id && e.status === "pending" && (
                <button
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-bg-hover hover:text-accent-red"
                  title="Delete"
                  onClick={() => del(e)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </Card>
      )}

      <AddExpenseModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={async (input) => {
          await addExpense({
            ...input,
            userId: currentUser!.id,
            userName: currentUser!.name,
            status: "pending",
          });
        }}
      />
    </div>
  );
}

function AddExpenseModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: {
    date: string;
    category: string;
    description: string | null;
    amount: number;
    receiptUrl: string | null;
    receiptName: string | null;
  }) => Promise<void>;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setDate(new Date().toISOString().slice(0, 10));
    setCategory(EXPENSE_CATEGORIES[0]);
    setDescription("");
    setAmount("");
    setReceiptUrl(null);
    setReceiptName(null);
    setError("");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setReceiptUrl(null);
      setReceiptName(null);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Receipt is larger than 8 MB.");
      return;
    }
    setError("");
    setReceiptName(file.name);
    const reader = new FileReader();
    reader.onload = () => setReceiptUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function submit() {
    const amt = parseFloat(amount);
    if (!date || !Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid date and amount.");
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        date: new Date(date).toISOString(),
        category,
        description: description.trim() || null,
        amount: Math.round(amt * 100) / 100,
        receiptUrl,
        receiptName,
      });
      reset();
      onClose();
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add expense"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Amount (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
          />
        </div>
        <div>
          <label className="label">Receipt (optional)</label>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={onFile}
            className="block w-full text-sm text-neutral-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dim"
          />
          {receiptName && (
            <p className="mt-1.5 text-xs text-accent-green">Attached {receiptName}</p>
          )}
        </div>
        {error && <p className="text-xs text-accent-red">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            className="btn-ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            Add expense
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PayrollTab({ isAdmin }: { isAdmin: boolean }) {
  const { payroll, addPayroll, updatePayroll, removePayroll, users } = useData();
  const [showAdd, setShowAdd] = useState(false);

  const totals = useMemo(() => {
    const sum = (s: string) =>
      payroll.filter((p) => p.status === s).reduce((a, p) => a + p.gross, 0);
    return { pending: sum("pending"), paid: sum("paid") };
  }, [payroll]);

  async function markPaid(p: PayrollEntry) {
    try {
      await updatePayroll(p.id, {
        status: "paid",
        paidAt: new Date().toISOString(),
      });
    } catch {
      window.alert("Could not update. Try again.");
    }
  }

  async function del(p: PayrollEntry) {
    if (!window.confirm(`Delete the ${money(p.gross)} payroll entry for ${p.userName}?`))
      return;
    try {
      await removePayroll(p.id);
    } catch {
      window.alert("Could not delete. Try again.");
    }
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Pending payout"
          value={money(totals.pending)}
          tone="amber"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Paid"
          value={money(totals.paid)}
          tone="green"
          icon={<BadgeDollarSign className="h-4 w-4" />}
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">
          {isAdmin ? "Payroll runs" : "My pay history"}
        </h2>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add payroll entry
          </button>
        )}
      </div>

      {payroll.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8" />}
          title="No payroll entries yet"
          hint={isAdmin ? "Add one to record a pay run." : "Nothing here yet."}
        />
      ) : (
        <Card className="divide-y divide-line">
          {payroll.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-900">
                    {money(p.gross)}
                  </span>
                  <span
                    className={`chip ${
                      p.status === "paid"
                        ? "bg-accent-green/15 text-accent-green"
                        : "bg-accent-amber/15 text-accent-amber"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-neutral-500">
                  {isAdmin && <span className="font-medium">{p.userName} · </span>}
                  {dateOnly(p.periodStart)} – {dateOnly(p.periodEnd)} ·{" "}
                  {p.hours}h @ {money(p.rate)}/h
                  {p.method ? ` · ${p.method}` : ""}
                </div>
              </div>
              {isAdmin && p.status === "pending" && (
                <button
                  className="btn-subtle text-xs"
                  onClick={() => markPaid(p)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                </button>
              )}
              {isAdmin && (
                <button
                  className="rounded-md p-1.5 text-neutral-400 hover:bg-bg-hover hover:text-accent-red"
                  title="Delete"
                  onClick={() => del(p)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </Card>
      )}

      {isAdmin && (
        <AddPayrollModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          employees={users.filter((u) => u.role === "employee")}
          onAdd={async (input) => {
            await addPayroll({ ...input, status: "pending" });
          }}
        />
      )}
    </div>
  );
}

function AddPayrollModal({
  open,
  onClose,
  employees,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  employees: { id: string; name: string; paymentMethod?: string | null }[];
  onAdd: (input: {
    userId: string;
    userName: string;
    periodStart: string;
    periodEnd: string;
    hours: number;
    rate: number;
    gross: number;
    method: string | null;
    note: string | null;
  }) => Promise<void>;
}) {
  const { timeEntries } = useData();
  const [userId, setUserId] = useState(employees[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const gross = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);

  // Approved hours from the Time Tracker for this employee + period.
  const approvedHours = useMemo(() => {
    if (!userId || !periodStart || !periodEnd) return null;
    const start = new Date(periodStart).getTime();
    const end = new Date(periodEnd).getTime() + 24 * 60 * 60 * 1000; // include end day
    let mins = 0;
    for (const t of timeEntries) {
      if (t.userId !== userId || !t.approvedAt || !t.clockOut) continue;
      const ci = new Date(t.clockIn).getTime();
      if (ci < start || ci >= end) continue;
      mins += (new Date(t.clockOut).getTime() - ci) / 60000;
    }
    return Math.round((mins / 60) * 100) / 100;
  }, [userId, periodStart, periodEnd, timeEntries]);

  function reset() {
    setPeriodStart("");
    setPeriodEnd("");
    setHours("");
    setRate("");
    setNote("");
    setError("");
  }

  async function submit() {
    const emp = employees.find((e) => e.id === userId);
    const h = parseFloat(hours);
    const r = parseFloat(rate);
    if (!emp || !periodStart || !periodEnd || !Number.isFinite(h) || !Number.isFinite(r)) {
      setError("Pick an employee, period, hours and rate.");
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        userId: emp.id,
        userName: emp.name,
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        hours: Math.round(h * 100) / 100,
        rate: Math.round(r * 100) / 100,
        gross: Math.round(h * r * 100) / 100,
        method: emp.paymentMethod ?? null,
        note: note.trim() || null,
      });
      reset();
      onClose();
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add payroll entry"
    >
      <div className="space-y-4">
        <div>
          <label className="label">Employee</label>
          <select
            className="input"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Period start</label>
            <input
              type="date"
              className="input"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Period end</label>
            <input
              type="date"
              className="input"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Hours</label>
            <input
              type="number"
              min="0"
              step="0.25"
              className="input"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Rate (USD/hour)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        {approvedHours != null && (
          <button
            type="button"
            onClick={() => setHours(String(approvedHours))}
            className="text-xs font-medium text-brand hover:underline"
          >
            Use {approvedHours}h approved from Time Tracker for this period
          </button>
        )}
        <div className="rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm">
          Gross pay:{" "}
          <span className="font-semibold text-neutral-900">{money(gross)}</span>
        </div>
        <div>
          <label className="label">Note</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
          />
        </div>
        {error && <p className="text-xs text-accent-red">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            className="btn-ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            Add entry
          </button>
        </div>
      </div>
    </Modal>
  );
}
