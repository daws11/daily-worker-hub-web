"use client";

import { useAuth } from "./auth-provider";
import { ChatNotificationProvider } from "@/lib/hooks/use-chat-notifications";

/**
 * Wrapper component that integrates ChatNotificationProvider with AuthProvider
 *
 * This component extracts the current user ID from AuthProvider and passes it
 * to ChatNotificationProvider to enable FCM foreground message handling globally.
 *
 * Must be used within AuthProvider's context.
 */
export function ChatNotificationWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  return (
    <ChatNotificationProvider currentUserId={user?.id} enabled={true}>
      {children}
    </ChatNotificationProvider>
  );
}
