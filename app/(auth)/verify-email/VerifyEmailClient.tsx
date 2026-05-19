"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Status = "loading" | "success" | "error";

export function VerifyEmailClient({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [pendingCreator, setPendingCreator] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setPendingCreator(!!data.pendingCreator);
          setStatus("success");
        } else {
          const data = await res.json().catch(() => ({}));
          setErrorMsg(data.error ?? "Verification failed.");
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMsg("Network error — please try again.");
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [email, token]);

  async function resendLink() {
    setStatus("loading");
    try {
      await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setErrorMsg("");
      setStatus("error");
      setErrorMsg("A new link was sent — check your inbox.");
    } catch {
      setErrorMsg("Could not send a new link. Try again later.");
      setStatus("error");
    }
  }

  if (status === "loading") {
    return (
      <div className="text-center py-10 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent-light mx-auto" />
        <p className="text-sm text-muted">Verifying your email…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="inline-flex w-14 h-14 rounded-full bg-info-muted items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-info" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Email verified
        </h1>
        {pendingCreator ? (
          <p className="text-sm text-secondary max-w-sm mx-auto">
            Your Collaborator account is now pending review. An admin
            typically approves new creators within 1 business day — you&apos;ll
            get a notification once you&apos;re approved. You can sign in and
            browse the marketplace in the meantime.
          </p>
        ) : (
          <p className="text-sm text-secondary">
            You&apos;re all set. Sign in to start using your account.
          </p>
        )}
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-semibold text-white gradient-accent shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)] transition-shadow"
          >
            Continue to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4 py-6">
      <div className="inline-flex w-14 h-14 rounded-full bg-rose-500/10 items-center justify-center">
        <XCircle className="w-8 h-8 text-rose-400" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-primary">
        Couldn't verify
      </h1>
      <p className="text-sm text-secondary max-w-sm mx-auto">{errorMsg}</p>
      <div className="pt-2 flex flex-col gap-2 items-center">
        <button
          type="button"
          onClick={resendLink}
          className="text-sm text-accent-light hover:text-accent transition-colors"
        >
          Send a new verification link
        </button>
        <Link
          href="/login"
          className="text-sm text-muted hover:text-secondary transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
