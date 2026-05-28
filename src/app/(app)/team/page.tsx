"use client";

import { useState } from "react";
import { Plus, Shield, User as UserIcon } from "lucide-react";
import { useData } from "@/lib/store";
import { Card, EmptyState, Modal, PageHeader } from "@/components/ui";

export default function TeamPage() {
  const { currentUser, users } = useData();
  const [showAdd, setShowAdd] = useState(false);

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
            </div>
          ))}
        </div>
      </Card>

      <AddEmployeeModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
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
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(
    null
  );

  function reset() {
    setName("");
    setEmail("");
    setTitle("");
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
    setCreated({ email: email.trim(), password });
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
              Share these credentials with the employee. They sign in at the
              login page.
            </p>
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
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Recruiter"
              />
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
