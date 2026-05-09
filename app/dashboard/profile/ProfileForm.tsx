"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, User as UserIcon, Check } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";

interface Props {
  initialName: string;
  initialBio: string;
  initialWebsite: string;
}

export function ProfileForm({ initialName, initialBio, initialWebsite }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [website, setWebsite] = useState(initialWebsite);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const dirty =
    name !== initialName ||
    bio !== initialBio ||
    website !== initialWebsite;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          website: website.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not save changes.");
        setLoading(false);
        return;
      }

      setSaved(true);
      setLoading(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />

      <Input
        label="Display name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        minLength={2}
        maxLength={100}
        leftSlot={<UserIcon className="w-4 h-4" />}
      />

      <div className="w-full">
        <label
          htmlFor="bio"
          className="block text-xs font-medium text-secondary mb-2"
        >
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Tell people about yourself…"
          className="w-full px-4 py-3 bg-input border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:bg-surface focus:border-border-focus transition-all resize-none"
        />
        <p className="mt-1.5 text-xs text-muted">{bio.length}/300</p>
      </div>

      <Input
        label="Website"
        type="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="https://yoursite.com"
        leftSlot={<Globe className="w-4 h-4" />}
      />

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading || !dirty}
          className="min-w-[120px]"
        >
          {loading ? "Saving…" : "Save changes"}
        </Button>
        {saved && !dirty && (
          <span className="inline-flex items-center gap-1.5 text-xs text-accent-light animate-fade-in">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>
    </form>
  );
}
