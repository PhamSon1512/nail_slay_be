import type { HonoCtx } from '../../@types';
import { throwError } from '../../utils';
import { countWordsFromHtml } from '../../utils/articleText';
import { optionalString, requiredString } from '../../utils/formParse';

type SeoAiSuggestInput = {
  title: string;
  content?: string;
  excerpt?: string;
};

type SeoAiSuggestResult = {
  focusKeywords: string[];
  metaTitle: string;
  metaDescription: string;
  relatedQuestions: string[];
};

const GEMINI_MODEL = 'gemini-2.0-flash';

function plainTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

export async function adminSeoAiSuggest(c: HonoCtx, body: Record<string, unknown>): Promise<SeoAiSuggestResult> {
  const apiKey = c.env.GEMINI_API_KEY;
  if (!apiKey) return throwError.internal('GEMINI_API_KEY chưa được cấu hình');

  const title = requiredString(body['title'], 'title');
  const contentHtml = optionalString(body['content']) ?? '';
  const excerpt = optionalString(body['excerpt']) ?? '';
  const plain = plainTextFromHtml(contentHtml).slice(0, 4000);

  const cacheKey = `seo-ai:${await hashContent(`${title}|${excerpt}|${plain.slice(0, 500)}`)}`;
  const cached = await c.env.CACHE.get(cacheKey, 'json');
  if (cached) return cached as SeoAiSuggestResult;

  const prompt = `Bạn là chuyên gia SEO tiếng Việt cho website bán phụ kiện nail/móng.
Phân tích bài viết và trả về JSON với cấu trúc chính xác:
{
  "focusKeywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3"],
  "metaTitle": "tiêu đề SEO 50-60 ký tự",
  "metaDescription": "mô tả meta 120-160 ký tự",
  "relatedQuestions": ["câu hỏi 1?", "câu hỏi 2?", "câu hỏi 3?"]
}

Tiêu đề bài: ${title}
Tóm tắt: ${excerpt || '(chưa có)'}
Nội dung (đoạn đầu): ${plain || '(chưa có)'}

Chỉ trả JSON, không markdown.`;

  try {
    const raw = await callGemini(apiKey, prompt);
    const parsed = JSON.parse(raw) as SeoAiSuggestResult;
    const result: SeoAiSuggestResult = {
      focusKeywords: Array.isArray(parsed.focusKeywords) ? parsed.focusKeywords.slice(0, 5) : [],
      metaTitle: String(parsed.metaTitle ?? title).slice(0, 70),
      metaDescription: String(parsed.metaDescription ?? excerpt).slice(0, 170),
      relatedQuestions: Array.isArray(parsed.relatedQuestions) ? parsed.relatedQuestions.slice(0, 5) : [],
    };
    await c.env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 });
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return throwError.internal(`Không thể gọi Gemini: ${msg}`);
  }
}

async function hashContent(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export type { SeoAiSuggestInput, SeoAiSuggestResult };
