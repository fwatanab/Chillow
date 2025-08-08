CREATE TABLE `users` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `email` varchar(255) UNIQUE NOT NULL,
  `nickname` varchar(50) NOT NULL,
  `friend_code` varchar(20) UNIQUE NOT NULL,
  `avatar_url` text,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `messages` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `sender_id` int,
  `receiver_id` int,
  `content` text NOT NULL,
  `created_at` datetime
);

CREATE TABLE `message_reads` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `message_id` int,
  `reader_id` int,
  `read_at` datetime
);

CREATE TABLE `friends` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `friend_id` int
);

CREATE TABLE `friend_requests` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `requester_id` int,
  `receiver_id` int,
  `status` enum('pending','accepted','rejected') NOT NULL,
  `created_at` datetime,
  `updated_at` datetime
);

ALTER TABLE `messages` ADD FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
ON UPDATE CASCADE;

ALTER TABLE `messages` ADD FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`)
ON UPDATE CASCADE;

ALTER TABLE `message_reads` ADD FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `message_reads` ADD FOREIGN KEY (`reader_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `friends` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `friends` ADD FOREIGN KEY (`friend_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `friend_requests` ADD FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `friend_requests` ADD FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
