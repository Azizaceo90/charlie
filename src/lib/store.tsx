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
import {
  SAMPLE_USERS,
  sampleApplicants,
  sampleApplications,
  sampleContracts,
  sampleListings,
  sampleSops,
  sampleTimeEntries,
} from "./sampleData";

const PREFIX = "career-ops:";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore (quota / private mode) */
  }
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
  setApplications: (a: JobApplication[]) => void;

  timeEntries: TimeEntry[];
  setTimeEntries: (t: TimeEntry[]) => void;

  sops: SopDoc[];
  setSops: (s: SopDoc[]) => void;

  contracts: Contract[];
  setContracts: (c: Contract[]) => void;

  applicants: Applicant[];
  setApplicants: (a: Applicant[]) => void;

  listings: JobListing[];
  setListings: (l: JobListing[]) => void;

  gmail: GmailStatus;
  setGmail: (g: GmailStatus) => void;
}

const Ctx = createContext<AppData | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [users] = useState<User[]>(SAMPLE_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [applications, setApplicationsState] = useState<JobApplication[]>([]);
  const [timeEntries, setTimeEntriesState] = useState<TimeEntry[]>([]);
  const [sops, setSopsState] = useState<SopDoc[]>([]);
  const [contracts, setContractsState] = useState<Contract[]>([]);
  const [applicants, setApplicantsState] = useState<Applicant[]>([]);
  const [listings, setListingsState] = useState<JobListing[]>([]);
  const [gmail, setGmailState] = useState<GmailStatus>({
    connected: false,
    configured: false,
  });

  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const savedUserId = load<string | null>("currentUserId", null);
    if (savedUserId) {
      const u = SAMPLE_USERS.find((x) => x.id === savedUserId) ?? null;
      setCurrentUser(u);
    }

    setApplicationsState(load("applications", sampleApplications()));
    setTimeEntriesState(
      load("timeEntries", [
        ...sampleTimeEntries("u-emp-1"),
        ...sampleTimeEntries("u-emp-2"),
        ...sampleTimeEntries("u-admin"),
      ])
    );
    setSopsState(load("sops", sampleSops()));
    setContractsState(load("contracts", sampleContracts()));
    setApplicantsState(load("applicants", sampleApplicants()));
    setListingsState(load("listings", sampleListings()));
    setGmailState(load("gmail", { connected: false, configured: false }));

    setReady(true);
  }, []);

  // Persisting wrappers
  const setApplications = useCallback((a: JobApplication[]) => {
    setApplicationsState(a);
    save("applications", a);
  }, []);
  const setTimeEntries = useCallback((t: TimeEntry[]) => {
    setTimeEntriesState(t);
    save("timeEntries", t);
  }, []);
  const setSops = useCallback((s: SopDoc[]) => {
    setSopsState(s);
    save("sops", s);
  }, []);
  const setContracts = useCallback((c: Contract[]) => {
    setContractsState(c);
    save("contracts", c);
  }, []);
  const setApplicants = useCallback((a: Applicant[]) => {
    setApplicantsState(a);
    save("applicants", a);
  }, []);
  const setListings = useCallback((l: JobListing[]) => {
    setListingsState(l);
    save("listings", l);
  }, []);
  const setGmail = useCallback((g: GmailStatus) => {
    setGmailState(g);
    save("gmail", g);
  }, []);

  const login = useCallback((userId: string) => {
    const u = SAMPLE_USERS.find((x) => x.id === userId) ?? null;
    setCurrentUser(u);
    save("currentUserId", userId);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    save<string | null>("currentUserId", null);
  }, []);

  const value: AppData = {
    ready,
    users,
    currentUser,
    login,
    logout,
    applications,
    setApplications,
    timeEntries,
    setTimeEntries,
    sops,
    setSops,
    contracts,
    setContracts,
    applicants,
    setApplicants,
    listings,
    setListings,
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
