const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./modules/database');

const app = express();

// Routers
const authRouter = require('./routes/auth')
const userRouter = require('./routes/users');
const postRouter = require('./routes/posts');
const commentRouter = require('./routes/comments');
const categoryRouter = require('./routes/categories');

// Middleware
app.use(express.json());
// jwt
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/posts', postRouter);
app.use('/api/comments', commentRouter);
app.use('/api/categories', categoryRouter);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: err });
});

app.listen(3234, () => {
    console.log("Server is running on port 3234");
});