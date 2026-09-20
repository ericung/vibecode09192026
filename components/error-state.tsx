"use client";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  hint?: string;
};

/**
 * Friendly error card (Phase 5, Prompt 18).
 * Single user-facing message — never server internals.
 */
export function ErrorState({ message, onRetry, retrying, hint }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center" role="alert">
      <span aria-hidden="true" className="text-3xl leading-none">
        ⚠
      </span>
      <p className="max-w-sm text-sm font-medium text-foreground">{message}</p>
      {hint ? <p className="max-w-sm text-xs text-muted-foreground">{hint}</p> : null}
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" disabled={retrying} onClick={onRetry}>
          {retrying ? "Retrying…" : "Try again"}
        </Button>
      ) : null}
    </div>
  );
}
