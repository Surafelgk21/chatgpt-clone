-- Optional: the backend creates all of this automatically on startup.
-- Run this file manually only if you prefer to set the database up yourself.
-- The database name must match DB_DATABASE in backend/.env.

CREATE DATABASE IF NOT EXISTS `my-gpt`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `my-gpt`;

CREATE TABLE IF NOT EXISTS conversations (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  role        ENUM('user', 'assistant') NOT NULL,
  content     LONGTEXT NOT NULL,
  token_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Only needed if the MySQL user in backend/.env does not exist yet
-- (replace the name and password with the DB_USER / DB_PASSWORD you use):
-- CREATE USER IF NOT EXISTS 'myy-gpt'@'localhost' IDENTIFIED BY 'your_password';
-- GRANT ALL PRIVILEGES ON `my-gpt`.* TO 'myy-gpt'@'localhost';
-- FLUSH PRIVILEGES;
