"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Applicant,
  AppNotification,
  Contract,
  JobApplication,
  JobListing,
  PersonalDoc,
  SopDoc,
  TimeEntry,
  User,
} from "./types";

export interface ProfileFields {
  fullLegalName?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  phone?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  paymentMethod?: string | null;
  paymentAccount?: string | null;
}

async function apiCreate<T>(resource: string, input: unknown): Promise<T> {
  const res = await fetch(`/api/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Create ${resource} failed`);
  return res.json();
}

async function apiPatch<T>(resource: string, id: string, patch: unknown): Promise<T> {
  const res = await fetch(`/api/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Update ${resource} failed`);
  return res.json();
}

async function apiDelete(resource: string, id: string): Promise<void> {
  const res = await fetch(`/api/${resource}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete ${resource} failed`);
}

export interface GmailStatus {
  connected: boolean;
  configured: boolean;
  email?: string;
  lastSynced?: string;
  calendarAuthorized?: boolean;
}

interface AppData {
  ready: boolean;

  users: User[];
  currentUser: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  addUser: (input: {
    name: string;
    email: string;
    password: string;
    role: string;
    title?: string;
  }) => Promise<{
    user?: User;
    emailed?: boolean;
    emailError?: string;
    error?: string;
  }>;
  removeUser: (id: string) => Promise<string | null>;
  editUser: (
    id: string,
    fields: { name?: string; email?: string; title?: string | null; role?: string }
  ) => Promise<string | null>;
  impersonator: { id: string; name: string } | null;
  impersonateUser: (userId: string) => Promise<string | null>;
  stopImpersonating: () => Promise<void>;
  updateProfile: (fields: ProfileFields) => Promise<string | null>;

  personalDocs: PersonalDoc[];
  addPersonalDoc: (
    input: Omit<PersonalDoc, "id" | "userId">
  ) => Promise<PersonalDoc>;
  removePersonalDoc: (id: string) => Promise<void>;

  notifications: AppNotification[];
  unreadCount: number;
  markNotificationsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;

  applications: JobApplication[];
  addApplication: (input: Omit<JobApplication, "id">) => Promise<JobApplication>;
  removeApplication: (id: string) => Promise<void>;
  setApplicationsAll: (apps: JobApplication[]) => void;

  timeEntries: TimeEntry[];
  addTimeEntry: (input: Omit<TimeEntry, "id">) => Promise<TimeEntry>;
  updateTimeEntry: (id: string, patch: Partial<TimeEntry>) => Promise<void>;
  removeTimeEntry: (id: string) => Promise<void>;
  submitTimesheet: () => Promise<{ submitted: number; message?: string }>;
  approveTimesheet: (
    userId: string,
    weekStart: string
  ) => Promise<{ approved: number; message?: string }>;

  sops: SopDoc[];
  addSop: (input: Omit<SopDoc, "id">) => Promise<SopDoc>;
  removeSop: (id: string) => Promise<void>;

  contracts: Contract[];
  addContract: (input: Omit<Contract, "id">) => Promise<Contract>;
  removeContract: (id: string) => Promise<void>;
  reopenContract: (id: string) => Promise<void>;
  signContract: (
    id: string,
    body: {
      signatureDataUrl: string;
      fullName?: string;
      address?: string;
      phone?: string;
      fieldValues?: Record<string, string>;
    }
  ) => Promise<void>;

  applicants: Applicant[];
  addApplicant: (input: Omit<Applicant, "id">) => Promise<Applicant>;
  updateApplicant: (id: string, patch: Partial<Applicant>) => Promise<void>;

  listings: JobListing[];
  addListing: (input: Omit<JobListing, "id">) => Promise<JobListing>;
  updateListing: (id: string, patch: Partial<JobListing>) => Promise<void>;

  gmail: GmailStatus;
  setGmail: React.Dispatch<React.SetStateAction<GmailStatus>>;
}

const Ctx = createContext<AppData | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [impersonator, setImpersonator] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [personalDocs, setPersonalDocs] = useState<PersonalDoc[]>([]);

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [sops, setSops] = useState<SopDoc[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [listings, setListings] = useState<JobListing[]>([]);
  const [gmail, setGmail] = useState<GmailStatus>({
    connected: false,
    configured: false,
  });

  const didInit = useRef(false);

  const loadBootstrap = useCallback(async () => {
    const res = await fetch("/api/bootstrap");
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users ?? []);
    setApplications(data.applications ?? []);
    setTimeEntries(data.timeEntries ?? []);
    setSops(data.sops ?? []);
    setContracts(data.contracts ?? []);
    setApplicants(data.applicants ?? []);
    setListings(data.listings ?? []);
    setNotifications(data.notifications ?? []);
    setPersonalDocs(data.personalDocs ?? []);
    if (data.me) {
      setCurrentUser((prev) => (prev ? { ...prev, ...data.me } : prev));
    }
  }, []);

  const clearData = useCallback(() => {
    setUsers([]);
    setApplications([]);
    setTimeEntries([]);
    setSops([]);
    setContracts([]);
    setApplicants([]);
    setListings([]);
    setNotifications([]);
    setPersonalDocs([]);
  }, []);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        const me = meData.user as User | null;
        setImpersonator(meData.impersonator ?? null);
        if (me) {
          setCurrentUser(me);
          await loadBootstrap();
        }
      } catch {
        /* not logged in */
      } finally {
        setReady(true);
      }
    })();
  }, [loadBootstrap]);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) return data.error ?? "Login failed.";
        setCurrentUser(data.user);
        await loadBootstrap();
        return null;
      } catch {
        return "Could not reach the server. Try again.";
      }
    },
    [loadBootstrap]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setCurrentUser(null);
    clearData();
  }, [clearData]);

  const addUser = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      role: string;
      title?: string;
    }) => {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? "Failed to add user." };
      setUsers((prev) => [...prev, data.user]);
      return {
        user: data.user as User,
        emailed: Boolean(data.emailed),
        emailError: data.emailError as string | undefined,
      };
    },
    []
  );

  const updateProfile = useCallback(
    async (fields: ProfileFields): Promise<string | null> => {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "Could not save profile.";
      setCurrentUser((prev) => (prev ? { ...prev, ...data.user } : prev));
      return null;
    },
    []
  );

  const addPersonalDoc = useCallback(
    async (input: Omit<PersonalDoc, "id" | "userId">) => {
      const res = await fetch("/api/personal-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Upload failed");
      const created = (await res.json()) as PersonalDoc;
      setPersonalDocs((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const removePersonalDoc = useCallback(async (id: string) => {
    const res = await fetch(`/api/personal-docs/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    setPersonalDocs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const editUser = useCallback(
    async (
      id: string,
      fields: { name?: string; email?: string; title?: string | null; role?: string }
    ): Promise<string | null> => {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "Could not save user.";
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.user } : u)));
      return null;
    },
    []
  );

  const impersonateUser = useCallback(
    async (userId: string): Promise<string | null> => {
      const res = await fetch("/api/auth/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "Could not switch user.";
      // Hard navigate so all data + session reload cleanly.
      window.location.assign("/");
      return null;
    },
    []
  );

  const stopImpersonating = useCallback(async () => {
    await fetch("/api/auth/stop-impersonating", { method: "POST" });
    window.location.assign("/team");
  }, []);

  const removeUser = useCallback(async (id: string): Promise<string | null> => {
    const res = await fetch(`/api/auth/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error ?? "Failed to remove user.";
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    return null;
  }, []);

  const markNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications/read", { method: "POST" });
    } catch {
      /* ignore */
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Poll for new notifications so they appear without a full reload.
  useEffect(() => {
    if (!currentUser) return;
    const t = setInterval(refreshNotifications, 20000);
    const onFocus = () => refreshNotifications();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentUser, refreshNotifications]);

  // ── Applications ──
  const addApplication = useCallback(async (input: Omit<JobApplication, "id">) => {
    const created = await apiCreate<JobApplication>("applications", input);
    setApplications((prev) => [created, ...prev]);
    return created;
  }, []);
  const removeApplication = useCallback(async (id: string) => {
    await apiDelete("applications", id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }, []);
  const setApplicationsAll = useCallback((apps: JobApplication[]) => {
    setApplications(apps);
  }, []);

  // ── Time entries ──
  const addTimeEntry = useCallback(async (input: Omit<TimeEntry, "id">) => {
    const created = await apiCreate<TimeEntry>("time-entries", input);
    setTimeEntries((prev) => [created, ...prev]);
    return created;
  }, []);
  const updateTimeEntry = useCallback(
    async (id: string, patch: Partial<TimeEntry>) => {
      const updated = await apiPatch<TimeEntry>("time-entries", id, patch);
      setTimeEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    },
    []
  );
  const removeTimeEntry = useCallback(async (id: string) => {
    await apiDelete("time-entries", id);
    setTimeEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const submitTimesheet = useCallback(async () => {
    const res = await fetch("/api/time-entries/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { submitted: 0, message: data.error ?? "Submit failed" };
    if (Array.isArray(data.entries)) {
      const byId = new Map<string, TimeEntry>(
        (data.entries as TimeEntry[]).map((e) => [e.id, e])
      );
      setTimeEntries((prev) =>
        prev.map((e) => (byId.has(e.id) ? (byId.get(e.id) as TimeEntry) : e))
      );
    }
    return { submitted: data.submitted ?? 0, message: data.message };
  }, []);

  const approveTimesheet = useCallback(
    async (userId: string, weekStart: string) => {
      const res = await fetch("/api/time-entries/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, weekStart }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { approved: 0, message: data.error ?? "Approve failed" };
      }
      if (Array.isArray(data.entries)) {
        const byId = new Map<string, TimeEntry>(
          (data.entries as TimeEntry[]).map((e) => [e.id, e])
        );
        setTimeEntries((prev) =>
          prev.map((e) => (byId.has(e.id) ? (byId.get(e.id) as TimeEntry) : e))
        );
      }
      return { approved: data.approved ?? 0, message: data.message };
    },
    []
  );

  // ── SOPs ──
  const addSop = useCallback(async (input: Omit<SopDoc, "id">) => {
    const created = await apiCreate<SopDoc>("sops", input);
    setSops((prev) => [created, ...prev]);
    return created;
  }, []);
  const removeSop = useCallback(async (id: string) => {
    await apiDelete("sops", id);
    setSops((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Contracts ──
  const addContract = useCallback(async (input: Omit<Contract, "id">) => {
    const created = await apiCreate<Contract>("contracts", input);
    setContracts((prev) => [created, ...prev]);
    return created;
  }, []);
  const removeContract = useCallback(async (id: string) => {
    await apiDelete("contracts", id);
    setContracts((prev) => prev.filter((c) => c.id !== id));
  }, []);
  const reopenContract = useCallback(async (id: string) => {
    const res = await fetch(`/api/contracts/${id}/reopen`, { method: "POST" });
    if (!res.ok) throw new Error("Reopen failed");
    const updated = (await res.json()) as Contract;
    setContracts((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);
  const signContract = useCallback(
    async (
      id: string,
      body: {
        signatureDataUrl: string;
        fullName?: string;
        address?: string;
        phone?: string;
        fieldValues?: Record<string, string>;
      }
    ) => {
      const res = await fetch(`/api/contracts/${id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Sign failed");
      const updated = await res.json();
      setContracts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    },
    []
  );

  // ── Applicants ──
  const addApplicant = useCallback(async (input: Omit<Applicant, "id">) => {
    const created = await apiCreate<Applicant>("applicants", input);
    setApplicants((prev) => [created, ...prev]);
    return created;
  }, []);
  const updateApplicant = useCallback(
    async (id: string, patch: Partial<Applicant>) => {
      const updated = await apiPatch<Applicant>("applicants", id, patch);
      setApplicants((prev) => prev.map((a) => (a.id === id ? updated : a)));
    },
    []
  );

  // ── Listings ──
  const addListing = useCallback(async (input: Omit<JobListing, "id">) => {
    const created = await apiCreate<JobListing>("listings", input);
    setListings((prev) => [created, ...prev]);
    return created;
  }, []);
  const updateListing = useCallback(
    async (id: string, patch: Partial<JobListing>) => {
      const updated = await apiPatch<JobListing>("listings", id, patch);
      setListings((prev) => prev.map((l) => (l.id === id ? updated : l)));
    },
    []
  );

  const value: AppData = {
    ready,
    users,
    currentUser,
    login,
    logout,
    addUser,
    removeUser,
    editUser,
    impersonator,
    impersonateUser,
    stopImpersonating,
    updateProfile,
    personalDocs,
    addPersonalDoc,
    removePersonalDoc,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markNotificationsRead,
    refreshNotifications,
    applications,
    addApplication,
    removeApplication,
    setApplicationsAll,
    timeEntries,
    addTimeEntry,
    updateTimeEntry,
    removeTimeEntry,
    submitTimesheet,
    approveTimesheet,
    sops,
    addSop,
    removeSop,
    contracts,
    addContract,
    removeContract,
    reopenContract,
    signContract,
    applicants,
    addApplicant,
    updateApplicant,
    listings,
    addListing,
    updateListing,
    gmail,
    setGmail,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): AppData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
