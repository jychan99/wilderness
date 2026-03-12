// @ts-ignore Deno remote URL import is resolved at runtime by Supabase Edge Runtime.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno remote URL import is resolved at runtime by Supabase Edge Runtime.
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.56/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });

const getTodayInKst = () => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}${month}${day}`;
};

const normalizeDateInput = (value: string): string | null => {
  const trimmed = value.trim();

  if (/^\d{8}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed.replaceAll("-", "");
  }

  return null;
};

const formatSentenceBreaksOutsideQuotes = (text: string): string => {
  let inStraightDoubleQuote = false;
  let inCurlyDoubleQuote = false;
  let result = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      inStraightDoubleQuote = !inStraightDoubleQuote;
      result += char;
      continue;
    }

    if (char === "“") {
      inCurlyDoubleQuote = true;
      result += char;
      continue;
    }

    if (char === "”") {
      inCurlyDoubleQuote = false;
      result += char;
      continue;
    }

    if (char === "." && !inStraightDoubleQuote && !inCurlyDoubleQuote) {
      result += ".\n";
      continue;
    }

    result += char;
  }

  return result.trim();
};

const getRawDateFromRequest = async (req: Request): Promise<string | null> => {
  const url = new URL(req.url);
  const queryDate = url.searchParams.get("date");
  if (queryDate) return queryDate;

  if (req.method === "GET" || req.method === "HEAD") {
    return null;
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    const body = await req.json();
    if (body && typeof body.date === "string") {
      return body.date;
    }
  } catch {
    return null;
  }

  return null;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawDate = await getRawDateFromRequest(req);
    const date = rawDate ? normalizeDateInput(rawDate) : getTodayInKst();

    if (!date) {
      return json(
        { error: "date는 YYYYMMDD 또는 YYYY-MM-DD 형식이어야 합니다." },
        400,
      );
    }

    const targetUrl = `https://missa.cbck.or.kr/DailyMissa/${date}`;

    const res = await fetch(targetUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8",
      },
    });

    if (!res.ok) {
      return json(
        { error: `fetch failed: ${res.status} ${res.statusText}` },
        502,
      );
    }

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc) {
      return json({ error: "HTML 파싱 실패" }, 500);
    }

    const missaTitle =
      doc
        ?.querySelector("#missa_title")
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null;

    const gospelHeaderTexts: string[] = [];
    const gospelStartTexts: string[] = [];
    const gospelSectionTexts: string[] = [];
    for (const node of doc.querySelectorAll(".bottompadding-sm:not(.row)")) {
      const heading = node
        .querySelector("h4")
        ?.textContent?.replace(/\s+/g, " ")
        .trim();

      if (heading !== "복음") continue;

      for (const headerRow of node.querySelectorAll(".row.bottompadding-sm")) {
        const headerText = headerRow.textContent?.replace(/\s+/g, " ").trim();
        if (headerText) gospelHeaderTexts.push(headerText);
      }

      for (const startRow of node.querySelectorAll(
        ".row:not(.bottompadding-sm):not(.tjustify)",
      )) {
        const startText = startRow.textContent?.replace(/\s+/g, " ").trim();
        if (startText) gospelStartTexts.push(startText);
      }

      for (const sectionRow of node.querySelectorAll(".row.tjustify")) {
        const sectionText = sectionRow.textContent?.replace(/\s+/g, " ").trim();
        if (!sectionText) continue;

        const formattedSectionText =
          formatSentenceBreaksOutsideQuotes(sectionText);
        if (formattedSectionText) gospelSectionTexts.push(formattedSectionText);
      }
    }

    return json({
      date,
      url: targetUrl,
      missaTitle,
      count: gospelSectionTexts.length,
      gospelHeaderTexts,
      gospelStartTexts,
      gospelSectionTexts,
    });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "unknown error" },
      500,
    );
  }
});
