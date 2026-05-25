import { ApplicationStatus } from "./types";

interface Signal {
  status: ApplicationStatus;
  patterns: RegExp[];
}

// Order matters: the first matching status (top-down) wins, so stronger
// signals (offer / interview) are checked before the generic "applied".
const SIGNALS: Signal[] = [
  {
    status: "offer",
    patterns: [
      /\boffer\b/i,
      /pleased to offer/i,
      /offer of employment/i,
      /extend(ing)? (you )?an offer/i,
      /welcome (aboard|to the team)/i,
    ],
  },
  {
    status: "rejected",
    patterns: [
      /unfortunately/i,
      /not (be )?moving forward/i,
      /decided (to|not) (proceed|move forward)/i,
      /other candidates/i,
      /will not be progressing/i,
      /regret to inform/i,
    ],
  },
  {
    status: "assessment",
    patterns: [
      /assessment/i,
      /coding (challenge|test|exercise)/i,
      /take[- ]?home/i,
      /online test/i,
      /hackerrank|codility|codesignal/i,
      /skills? (test|evaluation)/i,
    ],
  },
  {
    status: "interview",
    patterns: [
      /interview/i,
      /schedule (a|your) (call|chat|conversation)/i,
      /phone screen/i,
      /meet (with )?the team/i,
      /next round/i,
      /availability (for|to) (a )?call/i,
    ],
  },
  {
    status: "applied",
    patterns: [
      /thank you for applying/i,
      /application (received|submitted)/i,
      /we('ve| have) received your application/i,
      /your application (for|to)/i,
      /thanks for your interest/i,
      /successfully applied/i,
    ],
  },
];

export interface ClassifiableEmail {
  subject: string;
  from: string;
  snippet?: string;
}

/** Returns the detected application status, or null if not job-related. */
export function classifyEmail(email: ClassifiableEmail): ApplicationStatus | null {
  const haystack = `${email.subject}\n${email.snippet ?? ""}`;
  for (const sig of SIGNALS) {
    if (sig.patterns.some((p) => p.test(haystack))) {
      return sig.status;
    }
  }
  return null;
}

/** Best-effort extraction of a company name from a sender header. */
export function companyFromSender(from: string): string {
  // "Stripe Careers <careers@stripe.com>" -> prefer the display name
  const nameMatch = from.match(/^"?([^"<]+?)"?\s*</);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    if (name && !/no-?reply|notifications?|team|talent|recruit/i.test(name)) {
      return name.replace(/\b(careers|jobs|hiring|talent|recruiting)\b/gi, "").trim() || name;
    }
  }
  // fall back to the email domain
  const emailMatch = from.match(/@([^>\s]+)/);
  if (emailMatch) {
    const domain = emailMatch[1].split(".")[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  return from;
}

/** Best-effort role extraction from a subject line. */
export function roleFromSubject(subject: string): string {
  const m =
    subject.match(/(?:for|the|—|-|:)\s*(?:the\s+)?([A-Z][A-Za-z/ ]{2,40}?(?:Engineer|Designer|Manager|Analyst|Developer|Lead|Specialist|Coordinator|Associate|Director|Writer|Researcher|Marketer|Representative|Rep))\b/);
  if (m) return m[1].trim();
  return "Role not detected";
}
