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
  Contract,
  JobApplication,
  JobListing,
  SopDoc,
  TimeEntry,
  User,
} from "./types";

const CURRENT_USER_KEY = "career-ops:currentUserId";

async function apiCreate<T>(resource: string, input: unknown): Promise<T> {
  const res = await fetch(`/api/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Create ${resource} failed`);
  return res.json();
}

async function apiPatch<T>(
  resource: string,
  id: string,
  patch: unknown
): Promise<T> {
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
}

interface AppData {
  ready: boolean;

  users: User[];
  currentUser: User | null;
  login: (userId: string) => void;
  logout: () => void;

  applications: JobApplication[];
  addApplication: (input: Omit<JobApplication, "id">) => Promise<JobApplication>;
  removeApplication: (id: string) => Promise<void>;
  setApplicationsAll: (apps: JobApplication[]) => void;

  timeEntries: TimeEntry[];
  addTimeEntry: (input: Omit<TimeEntry, "id">) => Promise<TimeEntry>;
  updateTimeEntry: (id: string, patch: Partial<TimeEntry>) => Promise<void>;
  removeTimeEntry: (id: string) => Promise<void>;

  sops: SopDoc[];
  addSop: (input: Omit<SopDoc, "id">) => Promise<SopDoc>;
  removeSop: (id: string) => Promise<void>;

  contracts: Contract[];
  addContract: (input: Omit<Contract, "id">) => Promise<Contract>;
  updateContract: (id: string, patch: Partial<Contract>) => Promise<void>;

  applicants: Applicant[];
  addApplicant: (input: Omit<Applicant, "id">) => Promise<Applicant>;
  updateApplicant: (id: string, patch: Partial<Applicant>) => Promise<void>;

  listings: JobListing[];
  updateListing: (id: string, patch: Partial<JobListing>) => Promise<void>;

  gmail: GmailStatus;
  setGmail: (g: GmailStatus) => void;
}

const Ctx = createContext<AppData | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    (async () => {
      try {
        const res = await fetch("/api/bootstrap");
        const data = await res.json();
        setUsers(data.users ?? []);
        setApplications(data.applications ?? []);
        setTimeEntries(data.timeEntries ?? []);
        setSops(data.sops ?? []);
        setContracts(data.contracts ?? []);
        setApplicants(data.applicants ?? []);
        setListings(data.listings ?? []);

        const savedId = localStorage.getItem(CURRENT_USER_KEY);
        if (savedId) {
          const u = (data.users as User[]).find((x) => x.id === savedId);
          if (u) setCurrentUser(u);
        }
      } catch {
        /* leave empty; UI shows empty states */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback(
    (userId: string) => {
      const u = users.find((x) => x.id === userId) ?? null;
      setCurrentUser(u);
      try {
        localStorage.setItem(CURRENT_USER_KEY, userId);
      } catch {
        /* ignore */
      }
    },
    [users]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // ── Applications ──
  const addApplication = useCallback(
    async (input: Omit<JobApplication, "id">) => {
      const created = await apiCreate<JobApplication>("applications", input);
      setApplications((prev) => [created, ...prev]);
      return created;
    },
    []
  );
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
  const updateContract = useCallback(
    async (id: string, patch: Partial<Contract>) => {
      const updated = await apiPatch<Contract>("contracts", id, patch);
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
    applications,
    addApplication,
    removeApplication,
    setApplicationsAll,
    timeEntries,
    addTimeEntry,
    updateTimeEntry,
    removeTimeEntry,
    sops,
    addSop,
    removeSop,
    contracts,
    addContract,
    updateContract,
    applicants,
    addApplicant,
    updateApplicant,
    listings,
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
