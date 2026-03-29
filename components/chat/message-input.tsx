"use client";

import { useState, useRef, useCallback, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSend: (content: string) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  isConnected?: boolean;
}

export function MessageInput({
  onSend,
  placeholder = "Ketik pesan...",
  disabled = false,
  loading = false,
  isConnected = true,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || sending || disabled || !isConnected) return;

      setSending(true);
      try {
        await onSend(trimmed);
        setValue("");
        inputRef.current?.focus();
      } finally {
        setSending(false);
      }
    },
    [value, sending, disabled, isConnected, onSend],
  );

  const isLoading = loading || sending;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || !isConnected || isLoading}
        className="flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const trimmed = value.trim();
            if (trimmed && !isLoading && isConnected) {
              handleSubmit(e as unknown as FormEvent);
            }
          }
        }}
      />
      <Button
        type="submit"
        disabled={disabled || !value.trim() || !isConnected || isLoading}
        size="icon"
        aria-label="Kirim pesan"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}

interface MessageInputFooterProps {
  isConnected?: boolean;
  helperText?: string;
}

export function MessageInputFooter({
  isConnected = true,
  helperText,
}: MessageInputFooterProps) {
  if (!helperText && isConnected) return null;

  return (
    <p
      className={`text-xs mt-2 ${
        !isConnected
          ? "text-yellow-600 dark:text-yellow-500"
          : "text-muted-foreground"
      }`}
    >
      {helperText || (!isConnected ? "Menunggu koneksi..." : undefined)}
    </p>
  );
}
