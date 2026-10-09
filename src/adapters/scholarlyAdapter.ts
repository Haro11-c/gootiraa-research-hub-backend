import https from 'https';
import http from 'http';
import { config } from '../config';

export interface ScholarlyWork {
  id: string;
  source: 'INTERNAL' | 'OPENALEX' | 'CROSSREF' | 'ARXIV';
  title: string;
  abstract: string;
  authors: { name: string; affiliation?: string }[];
  publicationYear: number;
  venue?: string;
  doi?: string;
  arxivId?: string;
  isOpenAccess: boolean;
  citationCount: number;
  pdfUrl?: string;
  reviewStatus: 'PEER_REVIEWED' | 'PREPRINT' | 'UNKNOWN';
  documentType: string;
}

// In-memory cache for scholarly query results
interface CacheEntry {
  data: ScholarlyWork[];
  timestamp: number;
}
const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const fetchJsonWithTimeout = (urlStr: string, headers: Record<string, string> = {}, timeoutMs = 4000): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const client = url.protocol === 'https:' ? https : http;

      const req = client.get(url, { headers, timeout: timeoutMs }, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume();
          return reject(new Error(`HTTP error ${res.statusCode}`));
        }

        let raw = '';
        res.setEncoding('utf-8');
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            resolve(raw);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout for ${urlStr}`));
      });

      req.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

export class OpenAlexAdapter {
  async search(query: string, limit = 5): Promise<ScholarlyWork[]> {
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://api.openalex.org/works?search=${encoded}&per_page=${limit}&mailto=${encodeURIComponent(config.scholarly.openAlexEmail)}`;
      const res = await fetchJsonWithTimeout(url);

      if (!res || !Array.isArray(res.results)) return [];

      return res.results.map((w: any) => ({
        id: `openalex-${w.id?.replace('https://openalex.org/', '')}`,
        source: 'OPENALEX' as const,
        title: w.title || 'Untitled Work',
        abstract: w.abstract_inverted_index ? this.reconstructInvertedIndex(w.abstract_inverted_index) : (w.display_name || 'No abstract available.'),
        authors: Array.isArray(w.authorships)
          ? w.authorships.map((a: any) => ({
              name: a.author?.display_name || 'Unknown Author',
              affiliation: a.institutions?.[0]?.display_name || undefined,
            }))
          : [{ name: 'Unknown Author' }],
        publicationYear: w.publication_year || new Date().getFullYear(),
        venue: w.primary_location?.source?.display_name || 'Academic Venue',
        doi: w.doi ? w.doi.replace('https://doi.org/', '') : undefined,
        isOpenAccess: Boolean(w.open_access?.is_oa),
        citationCount: w.cited_by_count || 0,
        pdfUrl: w.open_access?.oa_url || undefined,
        reviewStatus: w.type === 'journal-article' ? 'PEER_REVIEWED' : 'PREPRINT',
        documentType: w.type === 'journal-article' ? 'PEER_REVIEWED_ARTICLE' : 'PREPRINT',
      }));
    } catch (err) {
      // Graceful fallback on network failure or rate limit
      return [];
    }
  }

  private reconstructInvertedIndex(index: Record<string, number[]>): string {
    const wordList: [number, string][] = [];
    for (const [word, positions] of Object.entries(index)) {
      for (const pos of positions) {
        wordList.push([pos, word]);
      }
    }
    wordList.sort((a, b) => a[0] - b[0]);
    return wordList.map((item) => item[1]).join(' ').slice(0, 800) + '...';
  }
}

export class CrossrefAdapter {
  async search(query: string, limit = 5): Promise<ScholarlyWork[]> {
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://api.crossref.org/works?query=${encoded}&rows=${limit}&mailto=${encodeURIComponent(config.scholarly.crossrefMailto)}`;
      const res = await fetchJsonWithTimeout(url, { 'User-Agent': `GootiraaResearchHub/1.0 (mailto:${config.scholarly.crossrefMailto})` });

      if (!res || !res.message || !Array.isArray(res.message.items)) return [];

      return res.message.items.map((item: any) => ({
        id: `crossref-${item.DOI}`,
        source: 'CROSSREF' as const,
        title: Array.isArray(item.title) ? item.title[0] : (item.title || 'Untitled Work'),
        abstract: item.abstract ? item.abstract.replace(/<[^>]*>?/gm, '').slice(0, 500) : 'Abstract indexed under Crossref metadata.',
        authors: Array.isArray(item.author)
          ? item.author.map((a: any) => ({
              name: `${a.given || ''} ${a.family || ''}`.trim() || 'Author',
              affiliation: a.affiliation?.[0]?.name,
            }))
          : [{ name: 'Unknown Author' }],
        publicationYear: item.published?.['date-parts']?.[0]?.[0] || new Date().getFullYear(),
        venue: Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'],
        doi: item.DOI,
        isOpenAccess: false,
        citationCount: item['is-referenced-by-count'] || 0,
        reviewStatus: item.type === 'journal-article' ? 'PEER_REVIEWED' : 'UNKNOWN',
        documentType: item.type === 'journal-article' ? 'PEER_REVIEWED_ARTICLE' : 'PREPRINT',
      }));
    } catch (err) {
      return [];
    }
  }
}

export class ArxivAdapter {
  async search(query: string, limit = 5): Promise<ScholarlyWork[]> {
    try {
      const encoded = encodeURIComponent(query);
      const url = `http://export.arxiv.org/api/query?search_query=all:${encoded}&start=0&max_results=${limit}`;
      const xml = await fetchJsonWithTimeout(url);

      if (typeof xml !== 'string') return [];

      // Lightweight XML parsing without heavy external dependencies
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      const matches: ScholarlyWork[] = [];
      let match;

      while ((match = entryRegex.exec(xml)) !== null && matches.length < limit) {
        const entry = match[1];
        const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(entry);
        const summaryMatch = /<summary>([\s\S]*?)<\/summary>/.exec(entry);
        const idMatch = /<id>http:\/\/arxiv\.org\/abs\/([\s\S]*?)<\/id>/.exec(entry);
        const publishedMatch = /<published>(\d{4})-/.exec(entry);

        const authors: { name: string }[] = [];
        const authorRegex = /<author>\s*<name>([\s\S]*?)<\/name>/g;
        let authorMatch;
        while ((authorMatch = authorRegex.exec(entry)) !== null) {
          authors.push({ name: authorMatch[1].trim() });
        }

        if (titleMatch) {
          const arxivId = idMatch ? idMatch[1].trim() : undefined;
          matches.push({
            id: `arxiv-${arxivId || Math.random().toString(36).substring(7)}`,
            source: 'ARXIV' as const,
            title: titleMatch[1].replace(/\n/g, ' ').trim(),
            abstract: summaryMatch ? summaryMatch[1].replace(/\n/g, ' ').trim() : 'No abstract provided.',
            authors: authors.length > 0 ? authors : [{ name: 'arXiv Submitter' }],
            publicationYear: publishedMatch ? parseInt(publishedMatch[1], 10) : new Date().getFullYear(),
            venue: 'arXiv Preprint Server',
            arxivId,
            isOpenAccess: true,
            citationCount: 0,
            pdfUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : undefined,
            reviewStatus: 'PREPRINT',
            documentType: 'PREPRINT',
          });
        }
      }

      return matches;
    } catch (err) {
      return [];
    }
  }
}

export class UnifiedScholarlyManager {
  private openAlex = new OpenAlexAdapter();
  private crossref = new CrossrefAdapter();
  private arxiv = new ArxivAdapter();

  async searchAll(query: string, limitPerSource = 3): Promise<ScholarlyWork[]> {
    const cacheKey = `search:${query.toLowerCase().trim()}:${limitPerSource}`;
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const results = await Promise.allSettled([
        this.openAlex.search(query, limitPerSource),
        this.crossref.search(query, limitPerSource),
        this.arxiv.search(query, limitPerSource),
      ]);

      const combined: ScholarlyWork[] = [];
      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          combined.push(...res.value);
        }
      });

      // Deduplicate by normalized title or DOI
      const seen = new Set<string>();
      const deduplicated: ScholarlyWork[] = [];

      for (const item of combined) {
        const key = item.doi ? item.doi.toLowerCase() : item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(item);
        }
      }

      queryCache.set(cacheKey, { data: deduplicated, timestamp: Date.now() });
      return deduplicated;
    } catch (err) {
      return [];
    }
  }
}

export const scholarlyManager = new UnifiedScholarlyManager();
