const express = require('express');
const router = express.Router();
const db = require('../modules/database');
const { cookieJwtAuth } = require('../middleware/cookieJwtAuth');

// Get all users
router.get('/', cookieJwtAuth, (req, res) => {
    db.query(
        'SELECT * FROM user', (err, result) => {
            if (err) return res.status(500).send(err);
            res.json(result);
        }
    );
});

// Get user by id
router.get('/:userId', cookieJwtAuth, (req, res) => {
    const { userId } = req.params;

    db.query(
        'SELECT * FROM user WHERE id = ?', [userId], (err, result) => {
            if (err) return res.status(500).send(err);
            if (result.length === 0) return res.status(404).send('User not found');

            res.send(result[0]);
        }
    );
});

// Create a user (only for admins)
router.post('/', cookieJwtAuth, (req, res) => {
    if (req.user.role_id !== 1) {
        return res.status(403).send({ error: 'Access denied' });
    }

    const { login, password, password_confirmation, email, role_id } = req.body;

    db.query(
        'INSERT INTO user (login, password, email, role_id) VALUES (?,?,?,?)',
        [login, password, email, role_id],
        (err, result) => {
            if (err) return res.status(500).send(err);

            res.status(201).send({id: result.insertId, message: 'User created'});
        }
    );
});

router.patch('/:userId', cookieJwtAuth, (req, res) => {
    const { userId } = req.params;
    const { login, full_name, email, role } = req.body;

    // Role change restriction for non-admin users
    if (req.user.role_id !== 1) {
        return res.status(403).send({ error: 'Only admins can change roles' });
    }

    // Build dynamic query
    const updates = [];
    const values = [];

    if (login) {
        updates.push('login = ?');
        values.push(login);
    }
    if (full_name) {
        updates.push('full_name = ?');
        values.push(full_name);
    }
    if (email) {
        updates.push('email = ?');
        values.push(email);
    }
    if (role) {
        updates.push('role_id = ?');
        values.push(role);
    }

    // Check if there's something to update
    if (updates.length === 0) {
        return res.status(400).send({ error: 'No fields provided for update' });
    }

    // Add WHERE condition for userId
    const query = `UPDATE user SET ${updates.join(', ')} WHERE id = ?`;
    values.push(userId);

    // Execute query
    db.query(query, values, (err, result) => {
        if (err) return res.status(500).send({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).send({ error: 'User not found' });

        res.send({ message: 'User successfully updated' });
    });
});



// Update user avatar
router.patch('/avatar', cookieJwtAuth, (req, res) => {
    const { avatar_url } = req.body;

    db.query(
        'UPDATE user SET avatar = ? WHERE id = ?',
        [avatar_url, req.user.id],
        (err) => {
            if (err) return res.status(500).send({ error: 'Database error' });

            res.send({ message: 'Avatar updated successfully' });
        }
    );
});

// Delete a user
router.delete('/:userId', cookieJwtAuth, (req, res) => {
    if (req.user.role_id !== 1) {
        return res.status(403).send({ error: 'Access denied' });
    }

    const { userId } = req.params;

    db.query(
        'DELETE FROM user WHERE id = ?', [userId], (err, result) => {
            if (err) return res.send(500).send({ error: 'Database error' });
            if (result.affectedRows === 0) return res.status(404).send({ error: 'User not found' });
            
            res.send('User deleted successfully');
        }
    );
});

module.exports = router;