import {
  Applicant,
  Contract,
  JobApplication,
  JobListing,
  SopDoc,
  TimeEntry,
  User,
} from "./types";
import { makeSamplePdf } from "./pdf";

// ── Users ─────────────────────────────────────────────────────────────────────
export const SAMPLE_USERS: User[] = [
  {
    id: "u-admin",
    name: "Jordan Cole",
    email: "support@jcatmediallc.com",
    role: "admin",
    title: "Founder / Admin",
    avatarColor: "#6366f1",
  },
  {
    id: "u-emp-1",
    name: "Maya Singh",
    email: "maya@jcatmediallc.com",
    role: "employee",
    title: "Recruiter",
    avatarColor: "#14b8a6",
  },
  {
    id: "u-emp-2",
    name: "Devon Parks",
    email: "devon@jcatmediallc.com",
    role: "employee",
    title: "Operations Associate",
    avatarColor: "#f59e0b",
  },
];

// ── Date helpers (relative to "now" so range filters always have data) ───────
function isoDaysAgo(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ── Job applications (as if synced from Gmail) ───────────────────────────────
export function sampleApplications(): JobApplication[] {
  const data: Array<[string, string, JobApplication["status"], number, number, string]> = [
    ["Stripe", "Product Designer", "offer", 0, 9, "careers@stripe.com"],
    ["Notion", "Senior PM", "interview", 0, 14, "talent@notion.so"],
    ["Figma", "Brand Designer", "applied", 0, 18, "jobs@figma.com"],
    ["Linear", "Frontend Engineer", "assessment", 1, 11, "hiring@linear.app"],
    ["Vercel", "Developer Advocate", "interview", 1, 16, "careers@vercel.com"],
    ["Airbnb", "UX Researcher", "applied", 1, 8, "recruiting@airbnb.com"],
    ["Datadog", "Solutions Engineer", "applied", 2, 13, "jobs@datadoghq.com"],
    ["Ramp", "Growth Marketer", "interview", 2, 10, "people@ramp.com"],
    ["Anthropic", "Technical Writer", "assessment", 3, 12, "careers@anthropic.com"],
    ["OpenAI", "Account Executive", "applied", 4, 15, "jobs@openai.com"],
    ["Coinbase", "Data Analyst", "rejected", 5, 9, "recruiting@coinbase.com"],
    ["Shopify", "Content Strategist", "interview", 6, 11, "careers@shopify.com"],
    ["Asana", "Customer Success", "applied", 6, 17, "talent@asana.com"],
    ["Atlassian", "Program Manager", "offer", 8, 10, "jobs@atlassian.com"],
    ["GitLab", "Support Engineer", "assessment", 9, 14, "recruiting@gitlab.com"],
    ["Twilio", "Sales Development", "applied", 11, 9, "jobs@twilio.com"],
    ["Dropbox", "Marketing Manager", "rejected", 13, 16, "careers@dropbox.com"],
    ["Square", "Operations Lead", "interview", 15, 12, "people@squareup.com"],
    ["Reddit", "Community Manager", "applied", 18, 13, "jobs@reddit.com"],
    ["Pinterest", "Visual Designer", "assessment", 21, 10, "careers@pinterest.com"],
    ["Robinhood", "Compliance Analyst", "applied", 24, 15, "recruiting@robinhood.com"],
    ["Snap", "Recruiter", "offer", 27, 11, "jobs@snap.com"],
    ["Slack", "Technical PM", "applied", 29, 9, "careers@slack.com"],
  ];

  return data.map(([company, role, status, daysAgo, hour, from], i) => ({
    id: `app-${i}`,
    company,
    role,
    status,
    date: isoDaysAgo(daysAgo, hour),
    source: "gmail" as const,
    emailFrom: from,
    emailSubject:
      status === "offer"
        ? `Your offer from ${company}`
        : status === "interview"
          ? `Interview invitation — ${role}`
          : status === "assessment"
            ? `${company} assessment: next steps`
            : status === "rejected"
              ? `Update on your ${company} application`
              : `We received your application — ${role}`,
  }));
}

// ── Time entries ─────────────────────────────────────────────────────────────
export function sampleTimeEntries(userId: string): TimeEntry[] {
  const entries: TimeEntry[] = [];
  const projects = ["Client Onboarding", "Recruiting", "Internal Ops", "SOP Writing"];
  for (let d = 0; d < 14; d++) {
    // skip weekends for realism
    const day = new Date();
    day.setDate(day.getDate() - d);
    const weekday = day.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const startHour = 9;
    const hoursWorked = 6 + ((d * 7) % 4); // 6-9h, deterministic
    entries.push({
      id: `${userId}-te-${d}`,
      userId,
      clockIn: isoDaysAgo(d, startHour, 0),
      clockOut: isoDaysAgo(d, startHour + hoursWorked, 30),
      project: projects[d % projects.length],
      note: d % 3 === 0 ? "Focused block" : undefined,
    });
  }
  return entries;
}

// ── SOP documents ────────────────────────────────────────────────────────────
export function sampleSops(): SopDoc[] {
  const defs: Array<[string, string, string[]]> = [
    [
      "Employee Onboarding SOP",
      "Onboarding",
      [
        "Purpose: Standardize the first-week experience for every new hire.",
        "",
        "1. Send welcome email and equipment checklist on day -2.",
        "2. Create accounts: email, Slack, project tools, time tracker.",
        "3. Day 1: company overview, role expectations, buddy assignment.",
        "4. Day 2-3: tooling walkthrough and shadowing sessions.",
        "5. Day 5: first check-in and 30/60/90 day goal setting.",
      ],
    ],
    [
      "Client Communication SOP",
      "Operations",
      [
        "Purpose: Keep client communication consistent and professional.",
        "",
        "1. Acknowledge inbound messages within 4 business hours.",
        "2. Use the approved email templates for status updates.",
        "3. Log every client call in the CRM with next steps.",
        "4. Escalate blockers to the account lead same-day.",
      ],
    ],
    [
      "Expense Reimbursement SOP",
      "Finance",
      [
        "Purpose: Define how employees submit and get approved for expenses.",
        "",
        "1. Submit receipts within 30 days of purchase.",
        "2. Categorize each expense and attach the receipt PDF.",
        "3. Manager approval required for amounts over $250.",
        "4. Finance processes reimbursements every other Friday.",
      ],
    ],
  ];
  return defs.map(([title, category, body], i) => {
    const dataUrl = makeSamplePdf(title, body);
    return {
      id: `sop-${i}`,
      title,
      category,
      uploadedBy: "Jordan Cole",
      uploadedAt: isoDaysAgo(i * 3 + 1, 10),
      fileName: `${title.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      dataUrl,
      sizeKb: Math.round(dataUrl.length / 1024),
    };
  });
}

// ── Contracts ────────────────────────────────────────────────────────────────
export function sampleContracts(): Contract[] {
  const body = (name: string) => [
    "This Employment Agreement is entered into between JCAT Media LLC",
    `("Company") and ${name} ("Employee").`,
    "",
    "1. Position. The Employee agrees to perform the duties of their role",
    "   in good faith and to the best of their ability.",
    "2. Compensation. The Employee will be paid on a bi-weekly schedule.",
    "3. Confidentiality. The Employee agrees to keep all proprietary",
    "   information confidential during and after employment.",
    "4. At-Will. Employment is at-will and may be terminated by either party.",
    "",
    "By signing below, the Employee acknowledges and agrees to these terms.",
  ];
  return [
    {
      id: "contract-1",
      title: "Employment Agreement 2026",
      assignedToId: "u-emp-1",
      assignedToName: "Maya Singh",
      status: "pending",
      fileName: "employment-agreement-maya-singh.pdf",
      dataUrl: makeSamplePdf("Employment Agreement", body("Maya Singh")),
      issuedAt: isoDaysAgo(3, 9),
    },
    {
      id: "contract-2",
      title: "Employment Agreement 2026",
      assignedToId: "u-emp-2",
      assignedToName: "Devon Parks",
      status: "pending",
      fileName: "employment-agreement-devon-parks.pdf",
      dataUrl: makeSamplePdf("Employment Agreement", body("Devon Parks")),
      issuedAt: isoDaysAgo(2, 14),
    },
    {
      id: "contract-3",
      title: "NDA — Contractor",
      assignedToId: "u-emp-1",
      assignedToName: "Maya Singh",
      status: "signed",
      fileName: "nda-maya-singh.pdf",
      dataUrl: makeSamplePdf("Non-Disclosure Agreement", body("Maya Singh")),
      issuedAt: isoDaysAgo(20, 9),
      signedAt: isoDaysAgo(19, 11),
      signerName: "Maya Singh",
    },
  ];
}

// ── Applicants (hiring pipeline) ─────────────────────────────────────────────
export function sampleApplicants(): Applicant[] {
  const data: Array<[string, string, Applicant["stage"], number, number, string]> = [
    ["Alex Rivera", "Customer Success Rep", "interview", 1, 4, "Austin, TX"],
    ["Priya Nair", "Marketing Coordinator", "screening", 2, 5, "Remote"],
    ["Sam Whitfield", "Operations Associate", "offer", 3, 5, "Denver, CO"],
    ["Lena Fischer", "Content Writer", "applied", 0, 0, "Remote"],
    ["Marcus Hill", "Sales Development", "assessment", 4, 4, "Chicago, IL"],
    ["Yuki Tanaka", "Product Designer", "interview", 5, 4, "Remote"],
    ["Grace Owens", "Recruiter", "hired", 12, 5, "Atlanta, GA"],
    ["Tomás Vega", "Data Analyst", "rejected", 9, 2, "Remote"],
    ["Hannah Brooks", "Support Engineer", "applied", 0, 0, "Seattle, WA"],
    ["Omar Haddad", "Account Manager", "screening", 6, 3, "Remote"],
  ];
  return data.map(([name, role, stage, daysAgo, rating, location], i) => ({
    id: `applicant-${i}`,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
    role,
    stage,
    appliedAt: isoDaysAgo(daysAgo, 9 + (i % 8)),
    rating: rating || undefined,
    location,
  }));
}

// ── Job search listings ──────────────────────────────────────────────────────
export function sampleListings(): JobListing[] {
  const data: Array<[string, string, string, JobListing["type"], string, number]> = [
    ["Senior Product Designer", "Stripe", "Remote", "Remote", "$150k–$190k", 0],
    ["Frontend Engineer", "Linear", "San Francisco, CA", "Full-time", "$160k–$210k", 1],
    ["Growth Marketing Lead", "Ramp", "New York, NY", "Full-time", "$140k–$180k", 1],
    ["UX Researcher", "Airbnb", "Remote", "Remote", "$130k–$170k", 2],
    ["Developer Advocate", "Vercel", "Remote", "Remote", "$135k–$175k", 3],
    ["Content Strategist", "Shopify", "Toronto, ON", "Full-time", "$110k–$140k", 4],
    ["Solutions Engineer", "Datadog", "Boston, MA", "Full-time", "$145k–$185k", 5],
    ["Brand Designer", "Figma", "Remote", "Contract", "$70–$95 / hr", 6],
    ["Customer Success Manager", "Asana", "Remote", "Full-time", "$95k–$120k", 8],
    ["Technical Writer", "Anthropic", "Remote", "Full-time", "$120k–$155k", 10],
  ];
  return data.map(([title, company, location, type, salary, daysAgo], i) => ({
    id: `listing-${i}`,
    title,
    company,
    location,
    type,
    salary,
    postedAt: isoDaysAgo(daysAgo, 8),
    saved: i === 0 || i === 4,
    applied: i === 1,
    description: `${company} is hiring a ${title}. Join a fast-moving team and own meaningful work from day one. Competitive pay, strong benefits, and a collaborative remote-friendly culture.`,
  }));
}
