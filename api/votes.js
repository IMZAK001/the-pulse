// The Pulse — Versus Votes API
// Handles reading and writing votes to Supabase

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/votes?story_id=xxx — fetch vote counts for a story
  if (req.method === 'GET') {
    const { story_id } = req.query;
    if (!story_id) return res.status(400).json({ error: 'story_id required' });

    const { data, error } = await supabase
      .from('versus_votes')
      .select('option')
      .eq('story_id', story_id);

    if (error) return res.status(500).json({ error: error.message });

    const aCount = data.filter(v => v.option === 'a').length;
    const bCount = data.filter(v => v.option === 'b').length;
    const total = aCount + bCount;

    return res.status(200).json({
      story_id,
      a: aCount,
      b: bCount,
      total,
      pctA: total > 0 ? Math.round((aCount / total) * 100) : 50,
      pctB: total > 0 ? Math.round((bCount / total) * 100) : 50,
    });
  }

  // POST /api/votes — cast a vote
  if (req.method === 'POST') {
    const { story_id, option } = req.body;
    if (!story_id || !option) return res.status(400).json({ error: 'story_id and option required' });
    if (!['a', 'b'].includes(option)) return res.status(400).json({ error: 'option must be a or b' });

    const { error } = await supabase
      .from('versus_votes')
      .insert({ story_id, option });

    if (error) return res.status(500).json({ error: error.message });

    // Return updated counts
    const { data } = await supabase
      .from('versus_votes')
      .select('option')
      .eq('story_id', story_id);

    const aCount = data.filter(v => v.option === 'a').length;
    const bCount = data.filter(v => v.option === 'b').length;
    const total = aCount + bCount;

    return res.status(200).json({
      success: true,
      story_id,
      a: aCount,
      b: bCount,
      total,
      pctA: total > 0 ? Math.round((aCount / total) * 100) : 50,
      pctB: total > 0 ? Math.round((bCount / total) * 100) : 50,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
