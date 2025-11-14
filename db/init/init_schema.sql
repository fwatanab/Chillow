-- Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `nickname` VARCHAR(50) NOT NULL,
  `friend_code` VARCHAR(20) UNIQUE NOT NULL,
  `avatar_url` TEXT,
  `role` VARCHAR(20) NOT NULL DEFAULT 'user',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Messages
CREATE TABLE IF NOT EXISTS `messages` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `sender_id` BIGINT UNSIGNED NOT NULL,
  `receiver_id` BIGINT UNSIGNED NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_messages_sender` (`sender_id`),
  INDEX `idx_messages_receiver` (`receiver_id`)
) ENGINE=InnoDB;

-- Message Reads
CREATE TABLE IF NOT EXISTS `message_reads` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `message_id` BIGINT UNSIGNED NOT NULL,
  `reader_id` BIGINT UNSIGNED NOT NULL,
  `read_at` DATETIME NULL,
  INDEX `idx_reads_message` (`message_id`),
  INDEX `idx_reads_reader` (`reader_id`)
) ENGINE=InnoDB;

-- Friends
CREATE TABLE IF NOT EXISTS `friends` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `friend_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `ux_user_friend` (`user_id`,`friend_id`),
  INDEX `idx_friends_user` (`user_id`),
  INDEX `idx_friends_friend` (`friend_id`)
) ENGINE=InnoDB;

-- Friend Requests
-- ※ENUMを使う場合：declined を入れる
CREATE TABLE IF NOT EXISTS `friend_requests` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `requester_id` BIGINT UNSIGNED NOT NULL,
  `receiver_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_fr_req_requester` (`requester_id`),
  INDEX `idx_fr_req_receiver` (`receiver_id`)
) ENGINE=InnoDB;

-- 外部キー
ALTER TABLE `messages`
  ADD CONSTRAINT `fk_messages_sender`
  FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_messages_receiver`
  FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

ALTER TABLE `message_reads`
  ADD CONSTRAINT `fk_reads_message`
  FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reads_reader`
  FOREIGN KEY (`reader_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `friends`
  ADD CONSTRAINT `fk_friends_user`
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_friends_friend`
  FOREIGN KEY (`friend_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `friend_requests`
  ADD CONSTRAINT `fk_fr_requester`
  FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_fr_receiver`
  FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
