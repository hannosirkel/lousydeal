"use client";

import { useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { emitAnalyticsEvent } from "../../lib/analytics";

export function FunnelForm({ action, event, className, children }: {
  readonly action: (data: FormData, redirectAfter?: boolean) => Promise<void>;
  readonly event: "merch_added" | "bad_discount_accepted";
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(submission: FormEvent<HTMLFormElement>): void {
    submission.preventDefault();
    if (pending) return;
    const data = new FormData(submission.currentTarget);
    startTransition(async () => {
      await action(data, false);
      emitAnalyticsEvent(event, { routeClass: "cart" });
      router.push("/cart");
      router.refresh();
    });
  }
  // The original server-action reference preserves the no-script POST/redirect.
  return <form action={action} onSubmit={submit} className={className} aria-busy={pending}>{children}</form>;
}
