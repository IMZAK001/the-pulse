// The Pulse — Backend API Route
// Generates today's top stories using Claude directly (no RSS needed)

const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const today = new Date().toISOString().split('T')[0];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are The Pulse — a news app for Gen Z that makes news feel urgent, cultural, and unmissable.

Today is ${today}. Generate 8 of the most important, talked-about news stories right now across geopolitics, money, tech, and culture.

Return ONLY valid JSON, no markdown, no explanation.

Rules:
- headline: 1 punchy sentence. Cultural commentary. Like a brilliant friend texting you. Max 12 words. NO boring journalist language.
- kicker: 3-4 word topic label in caps (e.g. "WAR UPDATE", "MARKET SHOCK", "AI TAKEOVER")  
- emoji: single most relevant emoji
- stat: one shocking/key number or fact in caps (e.g. "1,200+ KILLED", "110 DOLLAR OIL", "40% DROP")
- chips: exactly 3 short facts starting with an emoji, each under 8 words
- versus: a hot take battle if genuinely controversial, otherwise null. Format: {a: {emoji, text}, b: {emoji, text}}
- cat: one of "geo", "money", "tech", "culture"
- score: relevance score 1-10 for a 25 year old

Return exactly this JSON structure:
{
  "stories": [
    {
      "headline": "...",
      "kicker": "...",
      "emoji": "...",
      "stat": "...",
      "chips": ["...", "...", "..."],
      "versus": null,
      "cat": "geo",
      "score": 8
    }
  ]
}`
      }]
    });

    const text = response.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json({ stories: parsed.stories, source: 'ai' });

  } catch (err) {
    console.error('Pulse API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
