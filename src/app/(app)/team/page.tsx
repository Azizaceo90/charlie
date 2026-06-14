"use client";

import { useEffect, useState } from "react";
import {
  LogIn,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useData } from "@/lib/store";
import { User } from "@/lib/types";
import { Card, EmptyState, Modal, PageHeader } from "@/components/ui";

export default function TeamPage() {
  const { currentUser, users, removeUser, impersonateUser } = useData();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  async function handleImpersonate(u: User) {
    if (
      !window.confirm(
        `Sign in as ${u.name}? You'll see their account; click "Return to admin" to switch back.`
      )
    )
      return;
    const err = await impersonateUser(u.id);
    if (err) window.alert(err);
  }

  async function handleDelete(id: string, name: string) {
    if (
      !window.confirm(
        `Remove ${name}? This permanently deletes their account and any contracts assigned to them.`
      )
    )
      return;
    const err = await removeUser(id);
    if (err) window.alert(err);
  }

  if (currentUser?.role !== "admin") {
    return (
      <EmptyState
        icon={<UserIcon className="h-10 w-10" />}
        title="Admins only"
        hint="Team management is available to admin accounts."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="Add employees and give them their own login."
        actions={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add employee
          </button>
        }
      />

      <Card className="overflow-hidden">
        <div className="divide-y divide-line">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3.5">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: u.avatarColor ?? "#0073ea" }}
              >
                {u.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-neutral-900">{u.name}</div>
                <div className="truncate text-xs text-neutral-500">
                  {u.email}
                  {u.title ? ` · ${u.title}` : ""}
                  {u.payRate != null ? ` · $${u.payRate}/h` : ""}
                </div>
              </div>
              <span
                className={`chip ${
                  u.role === "admin"
                    ? "bg-brand/15 text-brand"
                    : "bg-accent-teal/15 text-accent-teal"
                }`}
              >
                {u.role === "admin" ? (
                  <Shield className="h-3 w-3" />
                ) : (
                  <UserIcon className="h-3 w-3" />
                )}
                {u.role}
              </span>
              <button
                onClick={() => setEditing(u)}
                className="rounded-md p-1.5 text-neutral-400 hover:bg-bg-hover hover:text-neutral-900"
                title="Edit user"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {u.id !== currentUser?.id && (
                <>
                  <button
                    onClick={() => handleImpersonate(u)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-bg-hover hover:text-brand"
                    title="Sign in as this user"
                  >
                    <LogIn className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(u.id, u.name)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-bg-hover hover:text-accent-red"
                    title="Remove user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      <AddEmployeeModal open={showAdd} onClose={() => setShowAdd(false)} />
      <EditEmployeeModal
        user={editing}
        isSelf={editing?.id === currentUser?.id}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function EditEmployeeModal({
  user,
  isSelf,
  onClose,
}: {
  user: User | null;
  isSelf: boolean;
  onClose: () => void;
}) {
  const { editUser } = useData();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [title, setTitle] = useState(user?.title ?? "");
  const [role, setRole] = useState<string>(user?.role ?? "employee");
  const [payRate, setPayRate] = useState(
    user?.payRate != null ? String(user.payRate) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setTitle(user.title ?? "");
    setRole(user.role);
    setPayRate(user.payRate != null ? String(user.payRate) : "");
    setError(null);
  }, [user?.id, user]);

  async function save() {
    if (!user) return;
    let payRateVal: number | null = null;
    const rateStr = payRate.trim();
    if (rateStr !== "") {
      const n = Number(rateStr);
      if (!Number.isFinite(n) || n < 0) {
        setError("Enter a valid pay rate.");
        return;
      }
      payRateVal = Math.round(n * 100) / 100;
    }
    setSaving(true);
    setError(null);
    const err = await editUser(user.id, {
      name: name.trim(),
      email: email.trim(),
      title: title.trim() || null,
      role,
      payRate: payRateVal,
    });
    setSaving(false);
    if (err) setError(err);
    else onClose();
  }

  if (!user) return null;

  return (
    <Modal open={user !== null} onClose={onClose} title={`Edit ${user.name}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Title</label>
            <select
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            >
              <option value="">—</option>
              <option value="Medical Coder">Medical Coder</option>
              <option value="Application Specialist">Application Specialist</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Role</label>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isSelf}
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          {isSelf && (
            <p className="mt-1 text-[11px] text-neutral-500">
              You can't change your own role.
            </p>
          )}
        </div>
        <div>
          <label className="label">Pay rate (USD/hour)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={payRate}
            onChange={(e) => setPayRate(e.target.value)}
            placeholder="e.g. 25.00"
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            Used to prefill payroll. Set automatically when you issue a contract
            with a rate.
          </p>
        </div>
        {error && <p className="text-xs text-accent-red">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            Save changes
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddEmployeeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addUser } = useData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("Medical Coder");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{
    email: string;
    password: string;
    emailed: boolean;
    emailError?: string;
  } | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setTitle("Medical Coder");
    setPassword("");
    setRole("employee");
    setError(null);
    setCreated(null);
  }

  async function submit() {
    setError(null);
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError("Name, email and a password of at least 6 characters are required.");
      return;
    }
    setSaving(true);
    const res = await addUser({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      title: title.trim() || undefined,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCreated({
      email: email.trim(),
      password,
      emailed: Boolean(res.emailed),
      emailError: res.emailError,
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add employee"
    >
      {created ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 p-4 text-sm">
            <div className="font-medium text-neutral-900">Account created</div>
            <p className="mt-1 text-neutral-600">
              {created.emailed
                ? `An invite email was sent to ${created.email}. You can also share these credentials directly:`
                : "Share these credentials with the employee — they sign in at the login page:"}
            </p>
            {!created.emailed && created.emailError && (
              <div className="mt-2 rounded-md border border-accent-amber/40 bg-accent-amber/10 px-3 py-2 text-xs text-neutral-700">
                <span className="font-medium">Email not sent:</span>{" "}
                {created.emailError}
              </div>
            )}
            <div className="mt-3 space-y-1 text-neutral-700">
              <div>
                Email: <code>{created.email}</code>
              </div>
              <div>
                Password: <code>{created.password}</code>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={reset}>
              Add another
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="label">Title</label>
              <select
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              >
                <option value="Medical Coder">Medical Coder</option>
                <option value="Application Specialist">Application Specialist</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Temporary password</label>
              <input
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 6 characters"
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
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
              Create account
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
