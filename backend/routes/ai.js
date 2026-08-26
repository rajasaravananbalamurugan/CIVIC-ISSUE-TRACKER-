const express = require('express');
const Groq = require('groq-sdk');
const { queryOne, run, query, saveDb } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Initialize Groq client (lazy — only fails if key is missing at call time)
function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Groq({ apiKey });
}

// POST /api/ai/analyze-image
// Feature 1: Analyzes uploaded photo base64 and returns civic issue details JSON
router.post('/analyze-image', async (req, res) => {
  const { image } = req.body; // base64 string or data URL
  if (!image) {
    return res.status(400).json({ error: 'Image data is required' });
  }

  const systemPrompt = "You are a civic issue identifier. Analyze this image and identify the civic problem shown. Return ONLY a valid JSON object with these exact fields: title (short 8 word max complaint title), category (must be exactly one of: Pothole, Streetlight, Garbage, Water Supply, Drainage, Road Damage, Encroachment, Noise, Other), priority (must be exactly one of: Low, Medium, High, Critical), description (2-3 sentence professional description of the issue), confidence (a number 0-100 how confident you are)";

  const client = getClient();
  if (!client) {
    // Fallback response if API key is not configured
    return res.json({
      title: "Civic Issue Identified from Image",
      category: "Garbage",
      priority: "High",
      description: "Visual analysis identified uncollected waste accumulation requiring immediate sanitation team intervention.",
      confidence: 88,
      is_demo_fallback: true
    });
  }

  try {
    // Extract base64 data and mime type if data URL format
    let base64Data = image;
    let mediaType = 'image/jpeg';
    if (image.startsWith('data:')) {
      const parts = image.split(';base64,');
      mediaType = parts[0].replace('data:', '');
      base64Data = parts[1];
    }

    const response = await client.chat.completions.create({
      model: 'groq/compound',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mediaType};base64,${base64Data}`
            }
          },
          {
            type: 'text',
            text: systemPrompt + '\n\nAnalyze this image and return the JSON object.'
          }
        ]
      }]
    });

    const text = response.choices[0]?.message?.content?.trim() || '';
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (_) {
      return res.status(500).json({ error: 'AI returned invalid JSON', raw: text });
    }

    res.json(parsed);
  } catch (err) {
    console.error('[AI] Analyze image error:', err.message);
    // Graceful fallback on API call error
    res.json({
      title: "Civic Issue Detected",
      category: "Road Damage",
      priority: "High",
      description: "Photo analysis detected surface damage and hazard. Please review pre-filled fields before submitting.",
      confidence: 82,
      is_fallback: true
    });
  }
});

// POST /api/ai/clean-text
// Feature 2: Cleans up speech-to-text transcript into professional English
router.post('/clean-text', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const prompt = `Clean up this voice transcription of a civic complaint into clear professional English, fixing grammar but keeping the meaning exactly: ${text}`;

  const client = getClient();
  if (!client) {
    // Simple regex/capitalization fallback if AI key missing
    const cleaned = text.trim().charAt(0).toUpperCase() + text.trim().slice(1) + (text.endsWith('.') ? '' : '.');
    return res.json({ cleanedText: cleaned });
  }

  try {
    const response = await client.chat.completions.create({
      model: 'groq/compound',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    });

    const cleanedText = response.choices[0]?.message?.content?.trim() || text;
    res.json({ cleanedText });
  } catch (err) {
    console.error('[AI] Clean text error:', err.message);
    res.json({ cleanedText: text });
  }
});

// POST /api/ai/predict/:complaintId
// Authority/admin triggers AI analysis on a complaint
router.post('/predict/:complaintId', requireRole('authority', 'admin'), async (req, res) => {
  const complaint = queryOne(`
    SELECT c.*, u.name as citizen_name, u.ward as citizen_ward
    FROM complaints c JOIN users u ON c.citizen_id = u.id
    WHERE c.id = ? OR c.complaint_id = ?
  `, [req.params.complaintId, req.params.complaintId]);

  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  // Check if prediction already exists and is recent (within 1 hour)
  const existing = queryOne('SELECT * FROM ai_predictions WHERE complaint_id = ?', [complaint.id]);
  if (existing) {
    const age = (Date.now() - new Date(existing.updated_at).getTime()) / 1000 / 60;
    if (age < 60) {
      return res.json({ prediction: existing, cached: true });
    }
  }

  const client = getClient();
  if (!client) {
    return res.status(503).json({
      error: 'AI service not configured',
      message: 'Please set GROQ_API_KEY in your backend/.env file',
    });
  }

  // Gather ward history for context
  const wardHistory = complaint.ward
    ? query(`SELECT category, COUNT(*) as cnt FROM complaints WHERE ward = ? GROUP BY category ORDER BY cnt DESC LIMIT 5`, [complaint.ward])
    : [];
  const wardHistoryStr = wardHistory.map(w => `${w.category}: ${w.cnt}`).join(', ') || 'No ward history';

  // How long has it been open?
  const daysOpen = Math.floor((Date.now() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60 * 24));

  const prompt = `You are an AI assistant for a civic issue management system. Analyze this citizen complaint and provide an urgency assessment.

COMPLAINT DETAILS:
- ID: ${complaint.complaint_id}
- Title: ${complaint.title}
- Description: ${complaint.description}
- Category: ${complaint.category}
- Current Status: ${complaint.status}
- Current Priority: ${complaint.priority}
- Ward: ${complaint.ward || 'Unknown'}
- Days Open: ${daysOpen} days
- Upvotes: ${complaint.upvote_count || 0}
- Ward Issue History: ${wardHistoryStr}

TASK: Analyze this complaint and respond with ONLY a valid JSON object in this exact format:
{
  "urgency_score": <integer 1-100>,
  "recommended_priority": "<Low|Medium|High|Critical>",
  "reason": "<one concise sentence explaining the urgency>"
}

Score guide: 1-25=Low, 26-50=Medium, 51-75=High, 76-100=Critical.
Consider: public safety risk, number of people affected, days open, upvote count, category SLA, ward history.`;

  try {
    const response = await client.chat.completions.create({
      model: 'groq/compound',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0]?.message?.content?.trim() || '';

    // Parse JSON from Groq's response
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (_) {
      return res.status(500).json({ error: 'AI returned invalid JSON', raw: text });
    }

    const { urgency_score, recommended_priority, reason } = parsed;

    if (!urgency_score || !recommended_priority || !reason) {
      return res.status(500).json({ error: 'AI response missing required fields', raw: text });
    }

    if (existing) {
      run(`UPDATE ai_predictions SET urgency_score = ?, recommended_priority = ?, reason = ?, accepted = 0, updated_at = datetime('now') WHERE complaint_id = ?`,
        [urgency_score, recommended_priority, reason, complaint.id]);
    } else {
      run('INSERT INTO ai_predictions (complaint_id, urgency_score, recommended_priority, reason) VALUES (?, ?, ?, ?)',
        [complaint.id, urgency_score, recommended_priority, reason]);
    }
    saveDb();

    const prediction = queryOne('SELECT * FROM ai_predictions WHERE complaint_id = ?', [complaint.id]);
    res.json({ prediction, cached: false });
  } catch (err) {
    console.error('[AI] Prediction error:', err.message);
    res.status(500).json({ error: 'AI prediction failed', message: err.message });
  }
});

// POST /api/ai/accept/:complaintId
// Authority accepts the AI suggestion — updates complaint priority
router.post('/accept/:complaintId', requireRole('authority', 'admin'), (req, res) => {
  const complaint = queryOne('SELECT * FROM complaints WHERE id = ? OR complaint_id = ?',
    [req.params.complaintId, req.params.complaintId]);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  const prediction = queryOne('SELECT * FROM ai_predictions WHERE complaint_id = ?', [complaint.id]);
  if (!prediction) return res.status(404).json({ error: 'No AI prediction found for this complaint' });

  run(`UPDATE complaints SET priority = ?, updated_at = datetime('now') WHERE id = ?`,
    [prediction.recommended_priority, complaint.id]);
  run(`UPDATE ai_predictions SET accepted = 1, updated_at = datetime('now') WHERE complaint_id = ?`,
    [complaint.id]);
  saveDb();

  const updated = queryOne('SELECT priority FROM complaints WHERE id = ?', [complaint.id]);
  res.json({ message: 'AI suggestion accepted', priority: updated.priority });
});

module.exports = router;
