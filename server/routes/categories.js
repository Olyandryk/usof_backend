const express = require('express');
const router = express.Router();
const db = require('../modules/database');
const { cookieJwtAuth } = require('../middleware/cookieJwtAuth');

// Get all categories
router.get('/', (req, res) => {
    db.query('SELECT * FROM category', (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ categories: result });
    });
});

// Get a category data
router.get('/:categoryId', (req, res) => {
    const { categoryId } = req.params;
    db.query('SELECT * FROM category WHERE id = ?', [categoryId], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.length === 0) return res.status(404).send('Category not found');
        res.json(result[0]);
    });
});

//Get all posts in this category
router.get('/:categoryId/posts', (req, res) => {
    const { categoryId } = req.params;
    db.query(
        `SELECT post.* FROM post 
         JOIN post_category ON post.id = post_category.post_id 
         WHERE post_category.category_id = ?`,
        [categoryId],
        (err, results) => {
            if (err) return res.status(500).send(err);
            res.json({ posts: results });
        }
    );
});

// Create a new category
router.post('/', cookieJwtAuth, (req, res) => {
    const { title } = req.body;

    if (!title) return res.status(400).send({ error: 'Title is required' });

    db.query(
        'INSERT INTO category (title) VALUES (?)',
        [title],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.status(201).send({ id: result.insertId, message: 'Category created' });
        }
    );
});

// Update the category
router.patch('/:categoryId', cookieJwtAuth, (req, res) => {
    const { categoryId } = req.params;
    const { title } = req.body;

    if (!title) return res.status(400).send({ error: 'Title is required' });

    db.query(
        'UPDATE category SET title = ? WHERE id = ?',
        [title, categoryId],
        (err, result) => {
            if (err) return res.status(500).send(err);
            if (result.affectedRows === 0) return res.status(404).send('Category not found');
            res.send('Category updated successfully');
        }
    );
});

// Delete a category
router.delete('/:categoryId', cookieJwtAuth, (req, res) => {
    const { categoryId } = req.params;

    db.query('DELETE FROM category WHERE id = ?', [categoryId], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.affectedRows === 0) return res.status(404).send('Category not found');
        res.send('Category deleted successfully');
    });
});

module.exports = router;