const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/persons/search?q=...&limit=20
// Global person search across all trees
router.get('/search', requireAuth, async (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q || q.trim().length < 1) {
    return res.status(400).json({ error: 'يرجى إدخال نص للبحث' });
  }

  const searchTerm = `%${q.trim()}%`;
  const maxResults = Math.min(parseInt(limit) || 20, 50);

  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.first_name, p.family_name, p.gender, p.status,
              p.birth_date, p.death_date, p.father_id, p.home_tree_id,
              f.first_name AS father_first_name,
              ft.name AS home_tree_name, ft.slug AS home_tree_slug
       FROM persons p
       LEFT JOIN persons f ON f.id = p.father_id
       LEFT JOIN family_trees ft ON ft.id = p.home_tree_id
       WHERE p.first_name ILIKE $1 OR p.family_name ILIKE $1
       ORDER BY p.first_name, p.family_name
       LIMIT $2`,
      [searchTerm, maxResults]
    );

    res.json({ persons: rows });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'خطأ في البحث' });
  }
});

module.exports = router;
