export function jsonResponse(
    body: unknown,
    init?: ResponseInit & { headers?: HeadersInit }
  ) {
    return new Response(JSON.stringify(body, null, 2), {
      ...init,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...(init?.headers ?? {}),
      },
    });
  }
  
  export function svgResponse(
    svg: string,
    init?: ResponseInit & { headers?: HeadersInit }
  ) {
    return new Response(svg, {
      ...init,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        ...(init?.headers ?? {}),
      },
    });
  }
  
  /**
   * CDN-friendly caching for README embeds.
   * - s-maxage: CDN cache
   * - stale-while-revalidate: allow stale while refreshing snapshot
   */
  export function cacheHeaders({
    sMaxAgeSeconds,
    staleWhileRevalidateSeconds,
  }: {
    sMaxAgeSeconds: number;
    staleWhileRevalidateSeconds: number;
  }) {
    return {
      "Cache-Control": `public, max-age=0, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
    };
  }
  