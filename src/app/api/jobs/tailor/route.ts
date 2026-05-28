import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobTitle, jobCompany, jobDescription, resume } = (await req.json()) as {
    jobTitle?: string;
    jobCompany?: string;
    jobDescription?: string;
    resume?: string;
  };
  if (!jobDescription || !resume) {
    return NextResponse.json(
      { error: "Job description and resume are required." },
      { status: 400 }
    );
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "AI tailoring isn't configured. Add OPENAI_API_KEY to your Vercel environment variables.",
      },
      { status: 400 }
    );
  }

  const system =
    "You are an expert resume tailor. Given a candidate's base resume and a target job posting, rewrite the resume to highlight the most relevant experience, skills, and achievements for that specific role. Keep it concise (one page), professional, ATS-friendly, and truthful — do not invent experience the candidate doesn't have. Output the tailored resume as clean plain text with clear section headers (Summary, Experience, Skills, Education).";

  const user = `Target role: ${jobTitle ?? "(unspecified)"}
Company: ${jobCompany ?? "(unspecified)"}

Job description:
${jobDescription}

Base resume:
${resume}

Tailor the resume for this role. Lead with the most relevant 2–3 sentence summary.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as { error?: { message?: string } }));
      return NextResponse.json(
        { error: data.error?.message ?? `OpenAI returned ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const tailored = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ tailored });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Tailoring failed." },
      { status: 500 }
    );
  }
}
