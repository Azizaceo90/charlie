import { ApplicationStatus } from "./types";

interface Signal {
  status: ApplicationStatus;
  patterns: RegExp[];
}

// Phrases that clearly indicate a stage in the application lifecycle.
// Order matters: stronger/later stages are checked before "applied".
const SIGNALS: Signal[] = [
  {
    status: "offer",
    patterns: [
      /pleased to offer/i,
      /offer of employment/i,
      /(?:extend|extending) (?:you )?an offer/i,
      /we(?:'re| are) (?:thrilled|excited|pleased) to offer/i,
      /your (?:job |employment )?offer/i,
      /offer letter/i,
    ],
  },
  {
    status: "rejected",
    patterns: [
      /regret to inform/i,
      /not (?:be )?moving forward/i,
      /decided (?:to |not to )(?:proceed|move forward)/i,
      /will not be (?:moving|progressing|proceeding)/i,
      /move forward with other (?:candidates|applicants)/i,
      /position has been filled/i,
      /no longer under consideration/i,
      /unfortunately,? (?:we|after)/i,
    ],
  },
  {
    status: "assessment",
    patterns: [
      /\bassessment\b/i,
      /coding (?:challenge|test|exercise)/i,
      /take[- ]?home/i,
      /online (?:test|assessment)/i,
      /hackerrank|codility|codesignal|hackerearth/i,
      /skills? (?:test|assessment|evaluation)/i,
    ],
  },
  {
    status: "interview",
    patterns: [
      /\binterview\b/i,
      /phone (?:screen|call)/i,
      // "schedule a phone call", "schedule us 30 minutes", "schedule a time"…
      /schedule (?:a |an |us |you |your )?(?:\w+\s+){0,2}(?:call|time|chat|conversation|meeting|interview|minutes?)/i,
      /(?:hop|jump|get) on (?:a )?(?:quick )?(?:phone )?call/i,
      /set ?up (?:a |an )?(?:phone )?(?:call|time|meeting|chat)/i,
      /invite you to (?:a |an )?(?:interview|call|conversation)/i,
      /(?:like to|love to) (?:speak|chat|connect|meet|schedule) (?:with )?you/i,
      // proposing/confirming availability or specific times
      /(?:choose|pick|select|confirm) (?:one of )?(?:these|the following|a) (?:times?|slots?)/i,
      /(?:these|the following|a few) (?:times?|slots?) (?:work|that work|below|available)/i,
      /your availability/i,
      /next (?:round|step)/i,
      /zoom (?:meeting|link)/i,
      /join zoom/i,
      /google meet|meet\.google\.com/i,
      /calendar invit(?:e|ation)/i,
      /look(?:ing)? forward to (?:meeting|speaking)/i,
    ],
  },
  {
    status: "applied",
    patterns: [
      /thank(?:s| you) for applying/i,
      /application (?:has been )?(?:received|submitted)/i,
      /we(?:'ve| have) received your application/i,
      /received your application/i,
      /your application (?:to|for|has been|was)/i,
      /application was sent/i,
      /successfully (?:applied|submitted)/i,
      /thank(?:s| you) for your (?:interest|application)/i,
    ],
  },
];

// Subjects/snippets that are almost always noise (alerts, digests, marketing).
const NOISE: RegExp[] = [
  /jobs? (?:for you|you may|matching|recommended|near you|picked)/i,
  /recommended (?:jobs|for you)/i,
  /\bjob alert/i,
  /\b\d+\+? (?:new )?jobs?\b/i,
  /\bnew jobs?\b/i,
  /\bdigest\b/i,
  /\bnewsletter\b/i,
  /people you may know/i,
  /viewed your profile/i,
  /who(?:'s| is) hiring/i,
  /trending|top picks|hiring now/i,
  /\bwebinar\b/i,
  /\d+%\s*off/i,
  /\bunsubscribe to stop receiving/i,
  /complete your profile/i,
  /set up job alerts/i,
  /your job search/i,
  /salary (?:guide|report)/i,
];

// Sender domains that are job boards / ATS providers — the company name is
// NOT the domain and must come from the subject instead.
const RELAY_DOMAINS =
  /(?:linkedin|indeed|ziprecruiter|glassdoor|monster|dice|builtin|wellfound|angel\.co|talent\.com|lensa|joblist|greenhouse|lever|myworkday|workday|ashbyhq|icims|smartrecruiters|jobvite|taleo|successfactors|bamboohr|workable|breezy|jazz|applytojob|hire\.|notifications?|no-?reply|mailer|email|notify)/i;

export interface ClassifiableEmail {
  subject: string;
  from: string;
  snippet?: string;
}

/** Returns the detected application status, or null if not a real application email. */
export function classifyEmail(email: ClassifiableEmail): ApplicationStatus | null {
  const haystack = `${email.subject}\n${email.snippet ?? ""}`;
  if (NOISE.some((p) => p.test(haystack))) return null;
  for (const sig of SIGNALS) {
    if (sig.patterns.some((p) => p.test(haystack))) return sig.status;
  }
  return null;
}

function clean(name: string): string {
  return name
    .replace(/["']/g, "")
    .replace(/\b(careers?|jobs?|hiring|talent|recruiting|recruitment|team|hr|people|noreply|no-reply|notifications?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[-–—|,:]+\s*$/, "")
    .trim();
}

/**
 * Extracts the employer name. Prefers the subject line (which usually names the
 * company even when the email is relayed through LinkedIn/Indeed/an ATS),
 * falling back to the sender's display name or domain.
 */
export function extractCompany(subject: string, from: string): string {
  // A company token = 1–4 Capitalized words (so we stop before lowercase
  // filler like "has been received" / "for the role").
  const CO = "([A-Z][A-Za-z0-9&.'’\\-]*(?:\\s+[A-Z][A-Za-z0-9&.'’\\-]*){0,3})";
  const subjectPatterns: RegExp[] = [
    new RegExp(`(?:applying to|application (?:to|at)|apply to|application (?:was |has been )?sent to|application submitted to)\\s+${CO}`),
    new RegExp(`interview (?:with|at)\\s+${CO}`),
    new RegExp(`(?:offer from|position at|role at|opportunity at|opening at)\\s+${CO}`),
    new RegExp(`^${CO}\\s*[-–—|:]`),
  ];
  for (const p of subjectPatterns) {
    const m = subject.match(p);
    if (m) {
      const c = clean(m[1]);
      if (c.length >= 2) return c;
    }
  }

  // Sender display name, unless it's a generic relay/noreply name.
  const nameMatch = from.match(/^\s*"?([^"<]+?)"?\s*</);
  if (nameMatch) {
    const name = clean(nameMatch[1]);
    if (name.length >= 2 && !/^(?:linkedin|indeed|ziprecruiter|glassdoor|greenhouse|lever|workday|notifications?)$/i.test(name)) {
      return name;
    }
  }

  // Domain fallback (skip relay/ATS/jobboard domains).
  const emailMatch = from.match(/@([^>\s]+)/);
  if (emailMatch) {
    const domain = emailMatch[1].toLowerCase();
    if (!RELAY_DOMAINS.test(domain)) {
      const core = domain.split(".")[0];
      return core.charAt(0).toUpperCase() + core.slice(1);
    }
  }
  return "Unknown company";
}

const ROLE_WORDS =
  "Engineer|Developer|Designer|Manager|Analyst|Lead|Specialist|Coordinator|Associate|Director|Consultant|Scientist|Architect|Administrator|Representative|Intern|Internship|Writer|Researcher|Marketer|Recruiter|Accountant|Strategist|Officer|Agent|Technician|Assistant|Advocate|Engineer II|Engineer I";

/** Best-effort role/title extraction from a subject line. */
export function extractRole(subject: string): string {
  const patterns: RegExp[] = [
    new RegExp(`([A-Z][A-Za-z/ ]{2,40}?(?:${ROLE_WORDS}))\\s+(?:at|position|role|opening)`, ""),
    new RegExp(`(?:for|the|position of|role of|—|-|:)\\s+(?:the\\s+)?([A-Z][A-Za-z/ ]{2,40}?(?:${ROLE_WORDS}))\\b`, ""),
    new RegExp(`\\b([A-Z][A-Za-z/ ]{2,40}?(?:${ROLE_WORDS}))\\b`, ""),
  ];
  for (const p of patterns) {
    const m = subject.match(p);
    if (m) return m[1].trim();
  }
  return "";
}

// Backwards-compatible alias.
export const companyFromSender = (from: string) => extractCompany("", from);
export const roleFromSubject = extractRole;
