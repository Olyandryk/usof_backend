const express = require('express');
const router = express.Router();
const db = require('../modules/database');
const { cookieJwtAuth } = require('../middleware/cookieJwtAuth');

// Pagination
const PAGE_SIZE = 10;

// Get all posts
router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * PAGE_SIZE;

    db.query(
        'SELECT * FROM post LIMIT ? OFFSET ?', [PAGE_SIZE, offset],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ posts: result, page});
        }
    );
});

// Get post by id
router.get('/:postId', (req, res) => {
    const { postId } = req.params;

    db.query(
        'SELECT * FROM post WHERE id = ?', [postId],
        (err, result) => {
            if (err) return res.status(500).send(err);
            if (result.length === 0) return res.status(404).send({ error: "Post not found" });
            res.json(result[0]);
        }
    );
});

// Get all comments for a specific post
router.get('/:postId/comments', (req, res) => {
    const { postId } = req.params;

    db.query(
        'SELECT * FROM comment WHERE post_id = ?', [postId],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ comments: result });
        }
    );
});

// Create a new comment for a post
router.post('/:postId/comments', cookieJwtAuth, (req,res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const author_id = req.user.id;

    if (!content) return res.status(400).send({ error: "Content is required" });

    db.query(
        'INSERT INTO comment (author_id, post_id, content) VALUES (?, ?, ?)',
        [author_id, postId, content],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.status(201).send({ id: result.insertId, message: "Comment created" });
        }
    );
});

//Get all categories for a specific post
router.get('/:postId/categories', (req, res) => {
    const { postId } = req.params;

    db.query(
        `SELECT category.* FROM category
        JOIN post_category ON category.id = post_category.category_id
        WHERE post_category.post_id = ?`,
        [postId],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ categories: result });
        }
    );
});

// Get all likes for a specific post
router.get('/:postId/like', (req, res) => {
    const { postId } = req.params;

    db.query(
        'SELECT * FROM `like` WHERE target_id = ?', [postId],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ likes: result });
        }
    );
});

// Create a new like for a post
router.post('/:postId/like', cookieJwtAuth, (req, res) => {
    const { postId } = req.params;
    const { type } = req.body;
    const author_id = req.user.id;

    db.query(
        'INSERT INTO `like` (author_id, target_id, target_type, type) VALUES (?, ?, ?, ?)', [author_id, postId, 'post', type],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.status(201).send({ id: result.insertId, message: "Like added" });
        }
    );
});

// Create a post
router.post('/', cookieJwtAuth, (req, res) => {
    const { title, content, categories } = req.body;
    const author_id = req.user.id;

    if(!title || !content || !categories) {
        return res.status(400).send({ error: "Title, content, and categories are required" });
    }

    if (!Array.isArray(categories)) {
        return res.status(400).send({ error: "Categories must be an array" });
    }

    db.query(
        'INSERT INTO post (author_id, title, content) VALUES (?,?,?)',
        [author_id, title, content],
        (err, result) => {
            if (err) return res.status(500).send(err);

                const postId = result.insertId;
                const categoryInserts = categories.map(cat => [postId, cat]);

                db.query(
                    'INSERT INTO post_category (post_id, category_id) VALUES ?',
                    [categoryInserts],
                    (err) => {
                        if (err) return res.status(500).send(err);
                        res.status(201).send({ id: postId, message: "Post created" });
                    }
                );
        }
    );
});

// Update a post
router.patch('/:postId', cookieJwtAuth, (req, res) => {
    const { postId } = req.params;
    const { title, content, status, categories } = req.body;

    if (!Array.isArray(categories)) {
        return res.status(400).send({ error: "Categories must be an array" });
    }

    // Check if the user is authorized to update the post
    db.query(
        'SELECT * FROM post WHERE id = ? AND author_id = ?',
        [postId, req.user.id],
        (err, result) => {
            if (err) return res.status(500).send(err);
            if (result.length === 0) return res.status(403).send("Access denied or post not found");

            // Build dynamic UPDATE query
            const fields = [];
            const values = [];

            if (title !== undefined) {
                fields.push('title = ?');
                values.push(title);
            }
            if (content !== undefined) {
                fields.push('content = ?');
                values.push(content);
            }
            if (status !== undefined) {
                fields.push('status = ?');
                values.push(status);
            }

            // If there are fields to update
            if (fields.length > 0) {
                const updateQuery = `UPDATE post SET ${fields.join(', ')} WHERE id = ?`;
                values.push(postId);

                db.query(updateQuery, values, (err) => {
                    if (err) return res.status(500).send(err);

                    if (categories) {
                        // Update categories if provided
                        db.query(
                            'DELETE FROM post_category WHERE post_id = ?',
                            [postId],
                            (err) => {
                                if (err) return res.status(500).send(err);

                                const categoryValues = categories.map((cat) => [postId, cat]);
                                db.query(
                                    'INSERT INTO post_category (post_id, category_id) VALUES ?',
                                    [categoryValues],
                                    (err) => {
                                        if (err) return res.status(500).send(err);
                                        res.send("Post updated successfully");
                                    }
                                );
                            }
                        );
                    } else {
                        res.send("Post updated successfully");
                    }
                });
            } else if (categories) {
                // Only update categories
                db.query(
                    'DELETE FROM post_category WHERE post_id = ?',
                    [postId],
                    (err) => {
                        if (err) return res.status(500).send(err);

                        const categoryValues = categories.map((cat) => [postId, cat]);
                        db.query(
                            'INSERT INTO post_category (post_id, category_id) VALUES ?',
                            [categoryValues],
                            (err) => {
                                if (err) return res.status(500).send(err);
                                res.send("Post updated successfully");
                            }
                        );
                    }
                );
            } else {
                res.send("No fields to update");
            }
        }
    );
});


// Delete a post
router.delete('/:postId', cookieJwtAuth, (req, res) => {
    const { postId } = req.params;

    db.query('SELECT * FROM post WHERE id = ? AND author_id = ?', [postId, req.user.id], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.length === 0) return res.status(403).send('Access denied or post not found');

        db.query('DELETE FROM post WHERE id = ?', [postId], (deleteErr) => {
            if (err) return res.status(500).send(err);
            res.send('Post deleted successfully');
        });
    });
});

// Delete a like under a post
router.delete('/:postId/like', cookieJwtAuth, (req, res) => {
    const { postId } = req.params;

    db.query(
        'DELETE FROM `like` WHERE target_id = ? AND author_id = ?',
        [postId, req.user.id],
        (err, result) => {
            if (err) return res.status(500).send(err);
            if (result.affectedRows === 0) return res.status(404).send('Like not found');
            res.send('Like removed successfully');
        }
    );
});

module.exports = router;