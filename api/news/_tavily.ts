// Cliente mínimo de Tavily (sin dependencias). El prefijo `_` evita que Vercel lo exponga como endpoint.

export interface TavilyResult {
  title?: string;
  url?: string;
  published_date?: string;
}

/**
 * Una búsqueda de noticias. `search_depth: basic` cuesta 1 crédito.
 * No se pide `include_raw_content` ni respuesta generada: solo titular, URL y fecha.
 */
export async function tavilyNewsSearch(
  apiKey: string,
  query: string,
  opts: { days: number; maxResults: number; includeDomains: string[] },
): Promise<TavilyResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query: query.slice(0, 400),
      topic: 'news',
      search_depth: 'basic',
      days: opts.days,
      max_results: opts.maxResults,
      include_domains: opts.includeDomains,
      include_answer: false,
      include_raw_content: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily respondió ${res.status}`);
  const data = (await res.json()) as { results?: TavilyResult[] };
  return data.results ?? [];
}
