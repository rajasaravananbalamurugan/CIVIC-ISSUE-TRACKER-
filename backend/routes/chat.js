const express = require('express');
const Groq = require('groq-sdk');
const { query, queryOne } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

// POST /api/chat
router.post('/', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const userId = req.user.id;
  const userName = req.user.name;
  const userWard = req.user.ward || 'Ward 1';

  // Gather user's complaints for context
  const userComplaints = query(`
    SELECT complaint_id, title, category, status, priority, address, ward, created_at, resolved_at, resolution_note, sla_days, upvote_count
    FROM complaints
    WHERE citizen_id = ?
    ORDER BY created_at DESC
  `, [userId]);

  const complaintContextStr = userComplaints.length === 0
    ? 'No complaints filed yet by this citizen.'
    : userComplaints.map(c => `- [${c.complaint_id}] "${c.title}" | Category: ${c.category} | Status: ${c.status} | Priority: ${c.priority} | Filed: ${c.created_at} | SLA: ${c.sla_days} days | Resolution Note: ${c.resolution_note || 'None'}`).join('\n');

  const systemPrompt = `You are CivicBot, an intelligent and helpful AI Civic Assistant for the CivicTracker platform.
You are assisting citizen: ${userName} (Ward: ${userWard}).

SYSTEM CONTEXT & CATEGORY SLAs:
- Pothole: 7 days SLA
- Garbage: 3 days SLA
- Streetlight: 5 days SLA
- Water Supply: 2 days SLA
- Others: 7 days SLA

CITIZEN'S FILED COMPLAINTS HISTORY:
${complaintContextStr}

YOUR CAPABILITIES & INSTRUCTIONS:
1. Answer citizen queries about their specific complaints (e.g. status, ID, estimated resolution time based on category SLA and filing date).
2. Explain how CivicTracker works (statuses: Pending → In Progress → Resolved / Rejected).
3. Provide general civic help and advice on how to report issues, upvote community issues, and earn civic badges.
4. Be polite, concise, encouraging, and clear. Format responses with markdown bullet points or bold text when helpful.`;

  const client = getClient();
  if (!client) {
    // Demo fallback mode when API key isn't set yet
    const lastUserMsg = messages[messages.length - 1].content;
    let fallbackText = `Hello ${userName}! I'm CivicBot. `;

    if (lastUserMsg.toLowerCase().includes('status') || lastUserMsg.toLowerCase().includes('complaint')) {
      if (userComplaints.length > 0) {
        const latest = userComplaints[0];
        fallbackText += `You have ${userComplaints.length} complaint(s). Your latest complaint **${latest.complaint_id}** ("${latest.title}") is currently **${latest.status}** with ${latest.priority} priority (SLA: ${latest.sla_days} days).`;
      } else {
        fallbackText += `You haven't filed any complaints yet. You can click "File Complaint" in the menu to report an issue!`;
      }
    } else {
      fallbackText += `I'm here to help with your civic complaints, category SLAs, status updates, and neighbourhood issues. (Note: Add your GROQ_API_KEY in backend/.env for live AI responses!)`;
    }

    return res.json({ reply: fallbackText });
  }

  try {
    const formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const response = await client.chat.completions.create({
      model: 'groq/compound',
      max_tokens: 512,
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedMessages
      ]
    });

    const reply = response.choices[0]?.message?.content || 'I apologize, I could not process your request.';
    res.json({ reply });
  } catch (err) {
    console.error('[Chatbot Error]', err.message);
    res.status(500).json({ error: 'Failed to communicate with AI Chatbot', message: err.message });
  }
});

module.exports = router;
