import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RESUME_SYSTEM =
  "You are an expert resume tailor. Given a candidate's base resume and a target job, rewrite the resume to highlight the most relevant experience, skills, and achievements for that role. Keep it concise (one page), professional, ATS-friendly, and truthful — do not invent experience. Output the tailored resume as clean plain text with clear section headers (Summary, Experience, Skills, Education).";

const COVER_SYSTEM =
  "You are an expert cover letter writer. Given a candidate's base resume and a target job, write a tailored cover letter under 350 words. Be specific about how the candidate's experience aligns with the role's requirements. Plain text only. Format: date, greeting, 2–3 body paragraphs, closing, sign-off with the candidate's name. No bullets.";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.title !== "Application Specialist") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { kind, jobTitle, jobCompany, jobDescription, resume, applicantName } =
    (await req.json()) as {
      kind?: "resume" | "cover";
      jobTitle?: string;
      jobCompany?: string;
      jobDescription?: string;
      resume?: string;
      applicantName?: string;
    };
  if (!kind || !jobDescription || !resume) {
    return NextResponse.json(
      { error: "kind, jobDescription and resume are required." },
      { status: 400 }
    );
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "AI generation isn't configured. Add OPENAI_API_KEY to your Vercel environment variables.",
      },
      { status: 400 }
    );
  }

  const name = applicantName?.trim() || me.name;
  const userMsg = `Candidate name: ${name}
Target role: ${jobTitle ?? "(unspecified)"}
Company: ${jobCompany ?? "(unspecified)"}

Job description:
${jobDescription}

Base resume:
${resume}

${kind === "resume" ? "Tailor the resume for this role." : "Write a cover letter from " + name + " for this role."}`;

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
          {
            role: "system",
            content: kind === "resume" ? RESUME_SYSTEM : COVER_SYSTEM,
          },
          { role: "user", content: userMsg },
        ],
      }),
    });
    if (!res.ok) {
      const data = await res
        .json()
        .catch(() => ({} as { error?: { message?: string } }));
      return NextResponse.json(
        { error: data.error?.message ?? `OpenAI returned ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return NextResponse.json({
      text: data.choices?.[0]?.message?.content ?? "",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed." },
      { status: 500 }
    );
  }
}
