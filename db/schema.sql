CREATE TABLE IF NOT EXISTS `user` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `emailVerified` tinyint(1) NOT NULL DEFAULT 0,
  `image` text NULL,
  `createdAt` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  `username` varchar(60) NULL,
  `jabatan` varchar(80) NULL,
  `bio` text NULL,
  `website` varchar(200) NULL,
  `medsos` text NULL,
  `wpUserId` int NULL,
  `ppmaTermId` int NULL,
  `avatarMediaId` int NULL,
  `profilLengkap` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_email` (`email`),
  UNIQUE KEY `user_username` (`username`),
  KEY `user_wpUserId` (`wpUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `session` (
  `id` varchar(36) NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `token` varchar(255) NOT NULL,
  `createdAt` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  `ipAddress` varchar(64) NULL,
  `userAgent` text NULL,
  `userId` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token` (`token`),
  KEY `session_userId` (`userId`),
  CONSTRAINT `session_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `account` (
  `id` varchar(36) NOT NULL,
  `accountId` varchar(255) NOT NULL,
  `providerId` varchar(64) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `accessToken` text NULL,
  `refreshToken` text NULL,
  `idToken` text NULL,
  `accessTokenExpiresAt` datetime(3) NULL,
  `refreshTokenExpiresAt` datetime(3) NULL,
  `scope` text NULL,
  `password` text NULL,
  `createdAt` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `account_userId` (`userId`),
  KEY `account_provider` (`providerId`, `accountId`),
  CONSTRAINT `account_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `verification` (
  `id` varchar(36) NOT NULL,
  `identifier` varchar(255) NOT NULL,
  `value` text NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `verification_identifier` (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rateLimit` (
  `id` varchar(36) NOT NULL,
  `key` varchar(255) NULL,
  `count` int NULL,
  `lastRequest` bigint NULL,
  PRIMARY KEY (`id`),
  KEY `rateLimit_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `log_akun` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` varchar(36) NOT NULL,
  `aksi` varchar(40) NOT NULL,
  `ip` varchar(64) NULL,
  `waktu` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `log_akun_user` (`userId`, `waktu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gagal_masuk` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `ip` varchar(64) NULL,
  `waktu` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `gagal_masuk_email` (`email`, `waktu`),
  KEY `gagal_masuk_waktu` (`waktu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `naskah` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `judul` varchar(200) NOT NULL DEFAULT '',
  `dek` varchar(300) NOT NULL DEFAULT '',
  `kategoriId` int NULL,
  `tag` text NOT NULL,
  `gambarUtamaId` int NULL,
  `isi` longtext NOT NULL,
  `wpPostId` int NULL,
  `status` enum('draf','dikirim','revisi') NOT NULL DEFAULT 'draf',
  `dibuat` datetime(3) NOT NULL,
  `diubah` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `naskah_user` (`userId`, `diubah`),
  CONSTRAINT `naskah_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_langganan` (
  `id` varchar(36) NOT NULL,
  `endpoint` varchar(1024) NOT NULL,
  `kunciEndpoint` char(64) NOT NULL,
  `p256dh` varchar(200) NOT NULL,
  `auth` varchar(100) NOT NULL,
  `semua` tinyint(1) NOT NULL DEFAULT 0,
  `userId` varchar(36) NULL,
  `gagal` int NOT NULL DEFAULT 0,
  `dibuat` datetime(3) NOT NULL,
  `diubah` datetime(3) NOT NULL,
  `terakhirKirim` datetime(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `push_langganan_endpoint` (`kunciEndpoint`),
  KEY `push_langganan_semua` (`semua`),
  KEY `push_langganan_user` (`userId`),
  CONSTRAINT `push_langganan_user` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_kategori` (
  `langgananId` varchar(36) NOT NULL,
  `kategoriId` int NOT NULL,
  PRIMARY KEY (`langgananId`, `kategoriId`),
  KEY `push_kategori_kategori` (`kategoriId`),
  CONSTRAINT `push_kategori_langganan` FOREIGN KEY (`langgananId`) REFERENCES `push_langganan` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_kirim` (
  `postId` int NOT NULL,
  `judul` varchar(200) NOT NULL,
  `target` int NOT NULL DEFAULT 0,
  `terkirim` int NOT NULL DEFAULT 0,
  `gagal` int NOT NULL DEFAULT 0,
  `mulai` datetime(3) NOT NULL,
  `selesai` datetime(3) NULL,
  PRIMARY KEY (`postId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
