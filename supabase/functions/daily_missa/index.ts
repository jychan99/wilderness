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

    // const missaTitle =
    //   doc
    //     ?.querySelector("#missa_title")
    //     ?.textContent?.replace(/\s+/g, " ")
    //     .trim() ?? null;
    const missaTitle: string[] = [];
    for (const node of doc.querySelectorAll("h3#missa_title")) {
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      if (text) missaTitle.push(text);
    }

    console.log("missaTitle", missaTitle);

    const h4Texts: string[] = [];
    for (const node of doc.querySelectorAll("h4")) {
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      if (text) h4Texts.push(text);
    }

    return json({
      date,
      url: targetUrl,
      missaTitle,
      count: h4Texts.length,
      h4Texts,
    });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "unknown error" },
      500,
    );
  }
});
