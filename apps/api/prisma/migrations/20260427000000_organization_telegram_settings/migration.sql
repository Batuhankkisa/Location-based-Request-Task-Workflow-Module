ALTER TABLE "Organization"
  ADD COLUMN "telegramEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "telegramChatId" TEXT,
  ADD COLUMN "telegramNotificationThreadId" TEXT;
