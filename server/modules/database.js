const mysql = require('mysql2')

// Initial connection (without database)
const db = mysql.createConnection({
    host: "localhost",
    user: "okuryliuk",
    password: "securepass",
});

// Connect to MySQL
db.connect(function(err) {
    if (err) throw err;
    console.log("Connected to the database");
});

// Initialize database
const initDatabase = () => {
    db.query("CREATE DATABASE IF NOT EXISTS usof", function(err, result) {
        if (err) {
            console.error("Error creating a database:", err);
            throw err;
        }
        console.log("Database created (if it didn't exist)");

        // Reconnect to the 'usof' database
        db.changeUser({ database: "usof" }, (err) => {
            if (err) throw err;
            console.log("Switched to database 'usof'");

            createTables();
        })
    });
    

}

// Create tables and initialize data
const createTables = () => {
    db.query(`
        CREATE TABLE IF NOT EXISTS role(
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE
        )`, (err) => {
        if (err) throw err;
        console.log("Table role is created");
    });
    
    db.query(`
        INSERT INTO role (name)
        SELECT * FROM (SELECT 'admin' AS name) as tmp
        WHERE NOT EXISTS (SELECT name FROM role WHERE name = 'admin')
        LIMIT 1
    `, (err) => {
        if (err) throw err;
        console.log("Admin role initialized in role table");
    });
    
    db.query(`
        INSERT INTO role (name) 
        SELECT * FROM (SELECT 'user' AS name) AS tmp
        WHERE NOT EXISTS (SELECT name FROM role WHERE name = 'user')
        LIMIT 1
    `, (err) => {
        if (err) throw err;
        console.log("User role initialized in role table");
    });
    
    db.query(`
        CREATE TABLE IF NOT EXISTS user(
            id INT AUTO_INCREMENT PRIMARY KEY,
            login VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(255),
            email VARCHAR(255) NOT NULL UNIQUE,
            avatar VARCHAR(255) DEFAULT '../utils/user_photo.png',
            role_id INT NOT NULL DEFAULT 2, -- Default to 'User' role,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (role_id) REFERENCES role(id)
        )`, (err) => {
        if (err) throw err;
        console.log("Table user is created");
    });
    
    db.query(`
        CREATE TABLE IF NOT EXISTS post(
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            author_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            status ENUM('active', 'inactive'),
            content TEXT NOT NULL,
            FOREIGN KEY (author_id) REFERENCES user(id)
        )`, (err) => {
        if (err) throw err;
        console.log("Table post is created");
    });
    
    db.query(`
        CREATE TABLE IF NOT EXISTS category(
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL UNIQUE,
            description VARCHAR(255) DEFAULT 'No description'
        )`, (err) => {
        if (err) throw err;
        console.log("Table category is created");
    });
    
    db.query(`
        CREATE TABLE IF NOT EXISTS post_category(
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT NOT NULL,
            category_id INT NOT NULL,
            FOREIGN KEY (post_id) REFERENCES post(id),
            FOREIGN KEY (category_id) REFERENCES category(id)
        )`, (err) => {
        if (err) throw err;
        console.log("Table post_category is created");
    });
    
    db.query(`
        CREATE TABLE IF NOT EXISTS comment(
            id INT AUTO_INCREMENT PRIMARY KEY,
            author_id INT NOT NULL,
            post_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            content TEXT NOT NULL,
            FOREIGN KEY (author_id) REFERENCES user(id),
            FOREIGN KEY (post_id) REFERENCES post(id)
        )`, (err) => {
        if (err) throw err;
        console.log("Table comment is created");
    });
    
    db.query(`
        CREATE TABLE IF NOT EXISTS \`like\`(
            id INT AUTO_INCREMENT PRIMARY KEY,
            author_id INT NOT NULL,
            target_id INT NOT NULL,
            target_type ENUM('post', 'comment') not null,
            publish_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            type ENUM('like', 'dislike') NOT NULL,
            UNIQUE (author_id, target_id, target_type),
            FOREIGN KEY (author_id) REFERENCES user(id)
        )`, (err) => {
        if (err) throw err;
        console.log("Table like is created");
    });
    
    db.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES user(id)
        )`, (err) => {
        if (err) throw err;
        console.log("Table like is created");
    });
}

initDatabase();

module.exports = db;