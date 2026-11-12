// /dokladnosc is the accuracy page in Polish. The store listings (fixed per release) link to it from every
// language, so non-Polish visitors are sent to the page in their language here, on the server (no flash of Polish).
// Rules:
//  - the first language in Accept-Language that we publish wins; a header with none of ours falls back to English;
//  - no Accept-Language (crawlers, curl) or a bot User-Agent: the Polish page, as before, so indexing is unchanged;
//  - ?lang=pl, or a click from another fiteoapp.io page (the language switcher), keeps the Polish page;
//  - 302, never cached: the answer depends on the visitor.
// Address table: same as PATHS in web/generators/common.py of the private repo.
const PAGES = {
  en: "/en/accuracy", de: "/de/genauigkeit", fr: "/fr/precision",
  it: "/it/precisione", es: "/es/precision", pt: "/pt/precisao",
};
const BOT = /bot|crawl|spider|slurp|lighthouse|preview/i;

export function pickLanguage(header) {
  if (!header) return null;
  const tags = header.split(",").map((part, i) => {
    const [tag, ...params] = part.trim().split(";");
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    return { lang: tag.trim().slice(0, 2).toLowerCase(), q: q ? parseFloat(q.slice(2)) : 1, i };
  }).filter((t) => t.lang && t.lang !== "*" && !(t.q <= 0)).sort((a, b) => b.q - a.q || a.i - b.i);
  for (const t of tags) if (t.lang === "pl" || PAGES[t.lang]) return t.lang;
  return tags.length ? "en" : null;
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const fromSite = /^https?:\/\/([^/]+\.)?fiteoapp\.io(\/|$)/i.test(request.headers.get("Referer") || "");
  const lang = url.searchParams.has("lang") || fromSite || BOT.test(request.headers.get("User-Agent") || "")
    ? null : pickLanguage(request.headers.get("Accept-Language"));
  if (lang && lang !== "pl") {
    return new Response(null, { status: 302, headers: {
      Location: PAGES[lang] + url.search, "Cache-Control": "no-store", Vary: "Accept-Language, Referer" } });
  }
  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.append("Vary", "Accept-Language, Referer");
  return out;
}
