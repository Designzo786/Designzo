"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User as UserIcon,
  CreditCard,
  Building,
  FileImage,
  X,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import {
  isValidAadhaar,
  isValidPan,
  isValidIfsc,
  isValidBankAccount,
  normalizeAadhaar,
  normalizePan,
  normalizeIfsc,
} from "@/lib/kyc";
import { formatFileSize } from "@/lib/utils";

const MAX_DOC_BYTES = 5 * 1024 * 1024;

interface Props {
  initialLegalName: string;
  initialAadhaar: string;
  initialPan: string;
  initialBankAccountName: string;
  initialBankAccount: string;
  initialBankIfsc: string;
  initialBankName: string;
}

export function KycForm(props: Props) {
  const router = useRouter();

  const [legalName, setLegalName] = useState(props.initialLegalName);
  const [aadhaar, setAadhaar] = useState(props.initialAadhaar);
  const [pan, setPan] = useState(props.initialPan);
  const [bankAccountName, setBankAccountName] = useState(
    props.initialBankAccountName
  );
  const [bankAccount, setBankAccount] = useState(props.initialBankAccount);
  const [bankIfsc, setBankIfsc] = useState(props.initialBankIfsc);
  const [bankName, setBankName] = useState(props.initialBankName);

  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (legalName.trim().length < 2) {
      return setError("Enter your full legal name.");
    }
    if (!isValidAadhaar(aadhaar)) {
      return setError("Aadhaar number must be 12 digits.");
    }
    if (!isValidPan(pan)) {
      return setError("PAN must be in the format ABCDE1234F.");
    }
    if (bankAccountName.trim().length < 2) {
      return setError("Enter the name on your bank account.");
    }
    if (!isValidBankAccount(bankAccount)) {
      return setError("Bank account number must be 9–18 digits.");
    }
    if (!isValidIfsc(bankIfsc)) {
      return setError("IFSC must be in the format ABCD0EF1234.");
    }
    if (bankName.trim().length < 2) {
      return setError("Enter your bank name.");
    }
    if (!aadhaarFront) return setError("Upload the front of your Aadhaar card.");
    if (!aadhaarBack) return setError("Upload the back of your Aadhaar card.");
    if (!panFile) return setError("Upload your PAN card.");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("legalName", legalName.trim());
      fd.append("aadhaarNumber", normalizeAadhaar(aadhaar));
      fd.append("panNumber", normalizePan(pan));
      fd.append("bankAccountName", bankAccountName.trim());
      fd.append("bankAccount", bankAccount.replace(/\s/g, ""));
      fd.append("bankIfsc", normalizeIfsc(bankIfsc));
      fd.append("bankName", bankName.trim());
      fd.append("aadhaarFront", aadhaarFront);
      fd.append("aadhaarBack", aadhaarBack);
      fd.append("pan", panFile);

      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Submission failed. Please try again.");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-xl border border-info/20 bg-info-muted p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-info shrink-0 mt-0.5" />
        <div className="text-xs text-secondary leading-relaxed">
          <strong className="text-primary">Your data is encrypted in transit.</strong>{" "}
          Only you and our verification team can see your full Aadhaar, PAN,
          and bank details. Documents are stored privately and access is
          logged.
        </div>
      </div>

      {/* ─── Personal information ─────────────────────────────────────────── */}
      <Section title="Personal information" icon={UserIcon}>
        <Input
          label="Full legal name (as on Aadhaar)"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
          placeholder="Jane Janeesha Doe"
        />
      </Section>

      {/* ─── Aadhaar ─────────────────────────────────────────────────────── */}
      <Section title="Aadhaar card" icon={CreditCard}>
        <Input
          label="Aadhaar number"
          value={aadhaar}
          onChange={(e) => setAadhaar(e.target.value)}
          required
          maxLength={14}
          placeholder="1234 5678 9012"
          hint="12 digits — spaces optional"
          inputMode="numeric"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <FilePicker
            label="Front of Aadhaar"
            file={aadhaarFront}
            onPick={setAadhaarFront}
          />
          <FilePicker
            label="Back of Aadhaar"
            file={aadhaarBack}
            onPick={setAadhaarBack}
          />
        </div>
      </Section>

      {/* ─── PAN ─────────────────────────────────────────────────────────── */}
      <Section title="PAN card" icon={CreditCard}>
        <Input
          label="PAN number"
          value={pan}
          onChange={(e) => setPan(e.target.value.toUpperCase())}
          required
          maxLength={10}
          placeholder="ABCDE1234F"
          hint="10 characters: 5 letters + 4 digits + 1 letter"
        />
        <FilePicker
          label="PAN card image"
          file={panFile}
          onPick={setPanFile}
        />
      </Section>

      {/* ─── Bank ────────────────────────────────────────────────────────── */}
      <Section title="Bank account (for payouts)" icon={Building}>
        <Input
          label="Account holder name"
          value={bankAccountName}
          onChange={(e) => setBankAccountName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
          placeholder="As printed on your bank statement"
          hint="Should match your legal name above"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Account number"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            required
            maxLength={20}
            placeholder="9–18 digit account number"
            inputMode="numeric"
          />
          <Input
            label="IFSC code"
            value={bankIfsc}
            onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
            required
            maxLength={11}
            placeholder="HDFC0001234"
          />
        </div>
        <Input
          label="Bank name"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
          placeholder="HDFC Bank"
        />
      </Section>

      <FormError message={error} />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={loading} className="min-w-[160px]">
          {loading ? "Submitting…" : "Submit for verification"}
        </Button>
        <p className="text-xs text-muted">
          Reviews typically complete within 2 business days.
        </p>
      </div>
    </form>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof UserIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <Icon className="w-4 h-4 text-accent-light" />
        <h2 className="text-sm font-semibold text-primary">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FilePicker({
  label,
  file,
  onPick,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Document must be an image (PNG, JPEG, or WebP).");
      return;
    }
    if (f.size > MAX_DOC_BYTES) {
      alert(`Document is too large (max ${formatFileSize(MAX_DOC_BYTES)}).`);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    onPick(f);
  }

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onPick(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="block text-xs font-medium text-secondary mb-2">
        {label}
      </label>

      {file ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-elevated">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="w-12 h-12 rounded-md object-cover bg-canvas"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-primary truncate">
              {file.name}
            </div>
            <div className="text-[11px] text-muted">
              {formatFileSize(file.size)}
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            aria-label="Remove document"
            className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={`${label}-input`}
          className="flex flex-col items-center justify-center gap-1.5 px-4 py-5 rounded-lg border-2 border-dashed border-border bg-surface/50 hover:border-accent/40 hover:bg-elevated cursor-pointer transition-colors"
        >
          <FileImage className="w-5 h-5 text-muted" />
          <div className="text-xs font-medium text-secondary">
            Click to upload
          </div>
          <div className="text-[10px] text-muted">PNG/JPG · max 5 MB</div>
        </label>
      )}

      <input
        id={`${label}-input`}
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
