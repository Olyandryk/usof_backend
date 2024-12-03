const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const router = express.Router();
const db = require('../modules/database');
const { cookieJwtAuth } = require('../middleware/cookieJwtAuth');
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

router.post('/register', async (req, res) => {
    const { login, password, password_confirmation, email } = req.body;
    if (password !== password_confirmation){
        return res.status(400).send({ error: "Passwords do not match" });
    }

    try {
        const hashed_password = await bcrypt.hash(password, 13);
        db.query('INSERT INTO user (login, password, email) VALUES (?,?,?)',
            [login, hashed_password, email],
            (err, result) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).send({ error: "Database error" });
                }
                
                res.status(201).send({ message: "User registered successfully" });
            }
        );
    } catch (error) {
        console.error("Error hashing passwprd:", error);
        res.status(500).send({ error: "Server error" });
    }
});

router.post('/login', (req, res) => {
    const { login, email, password } = req.body;

    if (!login || !email || !password) {
        return res.status(400).send({error: "All fields [login, email, password] are required" });
    }

    db.query(
        'SELECT * FROM user WHERE login = ? AND email = ?',
        [login, email],
        async (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).send({ error: "Database error" });
            }

            if (results.length === 0) {
                return res.status(401).send({ error: "Invalid login credentials" });
            }

            const user = results[0];

            try {
                const isPasswordMatch = await bcrypt.compare(password, user.password);
                if (!isPasswordMatch) {
                    return res.status(401).send({ error: "Invalid login credentials" });
                }

                const token = jwt.sign(
                    { id: user.id, login: user.login, email: user.email, role_id: user.role_id },
                    JWT_SECRET,
                    { expiresIn: '5h' }
                );
                console.log(jwt.verify(token, process.env.JWT_SECRET));

                res.status(200).send({
                    message: "Login successful",
                    token,
                    user: { id: user.id, login: user.login, email: user.email }
                });
            } catch (error) {
                console.error("Error comparing passwords:", error);
                res.status(500).send({error: "Server error" });
            }
        }
    );
});

// router.post('/login', (req, res) => {
//     const { login, email, password } = req.body;

//     if (!login || !email || !password) {
//         return res.status(400).send({error: "All fields [login, email, password] are required" });
//     }

//     db.query(
//         'SELECT * FROM user WHERE login = ? AND email = ?',
//         [login, email],
//         async (err, results) => {
//             if (err) {
//                 console.error("Database error:", err);
//             }

//             if (results.length === 0) {
//                 return res.status(401).send({ error: "Invalid login credentials" });
//             }

//             const user = results[0];

//             try {
//                 const isPasswordMatch = await bcrypt.compare(password, user.password);
//                 if (!isPasswordMatch) {
//                     return res.status(401).send({ error: "Invalid login credentials" });
//                 }

//                 res.status(200).send({ message: "Login successful", user: { id: user.id, login: user.login, email: user.email } });
//             } catch (error) {
//                 console.error("Error comparing passwords:", error);
//                 res.status(500).send({error: "Server error" });
//             }
//         }
//     );
// });

router.post('/logout', (req, res) => {
    res.status(200).send({ message: "User logged out successfully" });
});


// unnoetig
router.get('/protected', cookieJwtAuth, (req, res) => {
    res.status(200).send({ message: `Hello ${req.user.login}, you have access!` });
});

router.post('/password-reset', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send({ error: "Email is required" });
    }

    // Check if the email exists
    db.query('SELECT id FROM user WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send({ error: "Database error" });
        }

        if (results.length === 0) {
            return res.status(404).send({ error: "Email not found" });
        }

        const userId = results[0].id;
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetLink = `http://your-frontend-url.com/password-reset/${resetToken}`;

        // Save the token to the database with an expiration time
        db.query(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
            [userId, resetToken],
            (err) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).send({ error: "Database error" });
                }

                // Send email
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'olga.kurilyuk.cv@gmail.com',
                        pass: 'quqp tfnc cnzl momg',
                    },
                });

                const mailOptions = {
                    from: 'olga.kurilyuk.cv@gmail.com',
                    to: email,
                    subject: 'Password Reset',
                    text: `Click this link to reset your password: ${resetLink}`,
                };

                transporter.sendMail(mailOptions, (error) => {
                    if (error) {
                        console.error("Email error:", error);
                        return res.status(500).send({ error: "Failed to send email" });
                    }

                    res.status(200).send({ message: "Password reset link sent to your email" });
                });
            }
        );
    });
});

router.post('/password-reset/:confirm_token', async (req, res) => {
    const { confirm_token } = req.params;
    const { new_password } = req.body;

    if (!new_password) {
        return res.status(400).send({ error: "New password is required" });
    }

    try {
        // Find the token in the database
        db.query(
            'SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
            [confirm_token],
            async (err, results) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).send({ error: "Database error" });
                }

                if (results.length === 0) {
                    return res.status(400).send({ error: "Invalid or expired token" });
                }

                const userId = results[0].user_id;
                const hashedPassword = await bcrypt.hash(new_password, 13);

                // Update the user's password
                db.query(
                    'UPDATE user SET password = ? WHERE id = ?',
                    [hashedPassword, userId],
                    (err) => {
                        if (err) {
                            console.error("Database error:", err);
                            return res.status(500).send({ error: "Database error" });
                        }

                        // Delete the token after use
                        db.query('DELETE FROM password_reset_tokens WHERE token = ?', [confirm_token]);

                        res.status(200).send({ message: "Password reset successfully" });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ error: "Server error" });
    }
});

module.exports = router;