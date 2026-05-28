import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 56;
const FONT_SIZE = 11;
const LINE_HEIGHT = 15;

function wrap(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    if (para.trim() === "") {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/)) {
      if ((line + " " + word).trim().length > maxChars) {
        out.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, text, filename } = (await req.json()) as {
    title?: string;
    text?: string;
    filename?: string;
  };
  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  if (title) {
    page.drawText(title, {
      x: MARGIN,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= 28;
  }

  const lines = wrap(text, 90);
  for (const line of lines) {
    if (y < MARGIN + LINE_HEIGHT) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    if (line.trim() === "") {
      y -= LINE_HEIGHT / 2;
      continue;
    }
    page.drawText(line, {
      x: MARGIN,
      y,
      size: FONT_SIZE,
      font,
      color: rgb(0.12, 0.12, 0.15),
    });
    y -= LINE_HEIGHT;
  }

  const bytes = await pdf.save();
  const safe = (filename ?? "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Content-Length": String(bytes.length),
    },
  });
}
