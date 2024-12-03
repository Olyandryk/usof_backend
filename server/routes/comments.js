const express = require('express');
const router = express.Router();
const db = require('../modules/database');
const { cookieJwtAuth } = require('../middleware/cookieJwtAuth'); 

// Get comment by id
router.get('/', (req, res) => {
    const { commentId } = req.params;
    db.query(
        'SELECT * FROM comment WHERE id = ?', [commentId], (err, result) => {
            if (err) return res.status(500).send(err);
            if (result.length === 0) return res.status(404).json({ error: "Comment not found" });
            res.json({ comment: result[0] });
        }
    );
});

// Get all likes for a comment
router.get('/:commentId/like', (req, res) => {
    const { commentId } = req.params;

    db.query(
        `SELECT * FROM \`like\` WHERE target_type = 'comment' AND target_id = ?`,
        [commentId],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ likes: result });
        }
    );
});

// Create a new like for a specific comment
router.post('/:commentId/like', cookieJwtAuth, (req, res) => {
    const { commentId } = req.params;
    const { type } = req.body;
    const userId = req.user.id;

    if (!type || !['like', 'dislike'].includes(type)) {
        return res.status(400).json({ error: "Invalid type" });
    }

    db.query(
        `INSERT INTO \`like\` (author_id, target_id, target_type, type)
        VALUES (?, ?, 'comment', ?)
        ON DUPLICATE KEY UPDATE type = ?`,
        [userId, commentId, type, type], // Ensure `type` is either 'like' or 'dislike'
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: "You have already liked or disliked this comment" });
                }
                return res.status(500).send(err);
            }
            res.status(201).json({ id: result.insertId, message: "Like or dislike updated for the comment" });
        }
    );
    
});

// Update a comment
router.put('/:commentId', (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: "Content is required" });

    db.query(
        'UPDATE comment SET content = ? WHERE id = ?',
        [content, commentId],
        (err, result) => {
            if (err) return res.status(500).send(err);
            if (result.affectedRows === 0) return res.status(404).json({ error: "Comment not found" });
            res.json({ message: "Comment updated successfully" });
        }
    );
});

// Delete a comment
router.delete('/:commentId', (req, res) => {
    const { commentId } = req.params;

    db.query(
        'DELETE FROM comment WHERE id = ?',
        [commentId],
        (err, result) => {
            if (err) return res.status(500).send(err);
            if (result.affectedRows === 0) return res.status(404).json({ error: "Comment not found" });
            res.json({ message: "Comment deleted successfully" });
        }
    );
});

// Delete a like under a comment
router.delete('/:commentId/like', cookieJwtAuth, (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    db.query(
        `DELETE FROM \`like\`
         WHERE author_id = ? AND target_id = ? AND target_type = 'comment'`, 
        [userId, commentId], 
        (err, result) => {
            if (err) return res.status(500).send(err);
            if (result.affectedRows === 0) return res.status(404).json({ error: "Like not found under the comment" });
            res.json({ message: "Like deleted successfully" });
        }
    );
});

module.exports = router;