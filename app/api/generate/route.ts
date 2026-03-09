import { NextRequest, NextResponse } from "next/server";

import { urlSchema } from "@/lib/url-validator";
import { generateLLMTxt } from "@/lib/llm-generator";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = (body as Record<string, unknown>)?.url;
  const parsed = urlSchema.safeParse(input);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid URL" },
      { status: 422 },
    );
  }

  const url = parsed.data;

  let html: string;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "llm-web-generator/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        },
        { status: 502 },
      );
    }

    html = await response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";

    return NextResponse.json(
      { error: `Could not reach URL: ${message}` },
      { status: 502 },
    );
  }

  const content = await generateLLMTxt(url, html);

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="llm.txt"',
    },
  });
}
