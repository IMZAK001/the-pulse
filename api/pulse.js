// The Pulse — Backend API Route
// Deployed on Vercel as /api/pulse
// Handles: RSS fetching, Claude rewriting, story generation

const Anthropic = require('@anthropic-ai/sdk');

const RSS_FEEDS = {
  geo: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  ],
  money: [
    'https://feeds.bbci.co.uk/news/business/rss.xml',
    'https://feeds.bloomberg.com/markets/news.rss',
  ],
  tech: [
    'https://techcrunch.com/feed/',
    'https://www.wired.com/feed/rss',
  ],
  culture: [
    'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    'https://pitchfork.com/rss/news/feed.json',
  ],
};

async function fetchRSS(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ThePulse/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const block = match[1];
      const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block) ||
                     /<title>(.*?)<\/title>/.exec(block) || [])[1] || '';
      const desc = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(block) ||
                    /<description>(.*?)<\/description>/.exec(block) || [])[1] || '';
      const link = (/<link>(.*?)<\/link>/.exec(block) || [])[1] || '';
      if (title && title.length > 10) {
        items.push({
          title: title.replace(/<[^>]+>/g, '').trim(),
          desc: desc.replace(/<[^>]+>/g, '').trim().slice(0, 200),
          link: link.trim(),
        });
      }
    }
    return items.slice(0, 5);
  } catch {
    return [];
  }
}

async function rewriteStories(rawStories, anthropic) {
  const prompt = `You are The Pulse — a news app for Gen Z that makes news feel urgent, cultural, and unmissable.

Rewrite these news stories in The Pulse voice. Return ONLY valid JSON, no markdown, no explanation.

Rules:
- headline: 1 punchy sentence. Cultural commentary. Like a friend who reads everything. NO boring journalist language. Max 12 words.
- kicker: 3-4 word topic label (e.g. "WAR UPDATE", "MARKET SHOCK", "AI TAKEOVER")
- emoji: single most relevant emoji
- stat: one shocking/key number with context (e.g. "2,400 killed", "$110 oil", "40% drop")
- chips: exactly 3 short facts/reactions, each under 8 words, starting with an emoji
- versus: a hot take battle ONLY if genuinely controversial. null if not. Format: {question, a: {emoji, text}, b: {emoji, text}}
- cat: one of "geo", "money", "tech", "culture"
- score: relevance score 1-10

Raw stories:
${JSON.stringify(rawStories, null, 2)}

Return this exact JSON structure:
{
  "stories": [
    {
      "headline": "...",
      "kicker": "...",
      "emoji": "...",
      "stat": "...",
      "chips": ["...", "...", "..."],
      "versus": null,
      "cat": "...",
      "score": 8
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Fetch RSS from all categories in parallel
    const allFetches = [];
    for (const [cat, urls] of Object.entries(RSS_FEEDS)) {
      for (const url of urls) {
        allFetches.push(fetchRSS(url).then(items => items.map(i => ({ ...i, cat }))));
      }
    }

    const results = await Promise.allSettled(allFetches);
    const rawStories = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .filter(s => s.title)
      .slice(0, 20); // send max 20 to Claude

    if (rawStories.length === 0) {
      return res.status(200).json({ stories: [], source: 'no-rss' });
    }

    const rewritten = await rewriteStories(rawStories, anthropic);

    // Filter to score >= 6
    const filtered = rewritten.stories
      .filter(s => s.score >= 6)
      .slice(0, 12);

    return res.status(200).json({ stories: filtered, source: 'live' });

  } catch (err) {
    console.error('Pulse API error:', err);
    return res.status(500).json({ error: err.message });
  }
};
