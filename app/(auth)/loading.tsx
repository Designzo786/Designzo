/**
 * Skeleton for the auth pages (login, register, password reset).
 * Renders inside the auth layout's centered card, so it only needs to
 * mirror the form contents.
 */
export default function AuthLoading() {
  return (
    <div className="animate-pulse">
      {/* Heading */}
      <div className="text-center mb-7 space-y-2">
        <div className="h-7 w-44 mx-auto rounded-lg bg-elevated" />
        <div className="h-4 w-56 mx-auto rounded bg-elevated/60" />
      </div>

      {/* OAuth button */}
      <div className="h-11 w-full rounded-lg bg-elevated" />

      {/* Divider */}
      <div className="my-6 h-px bg-border" />

      {/* Form fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="h-3 w-16 rounded bg-elevated/60" />
          <div className="h-11 w-full rounded-lg bg-elevated" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-20 rounded bg-elevated/60" />
          <div className="h-11 w-full rounded-lg bg-elevated" />
        </div>
        <div className="h-11 w-full rounded-lg bg-elevated mt-2" />
      </div>

      {/* Footer link */}
      <div className="h-4 w-48 mx-auto rounded bg-elevated/60 mt-6" />
    </div>
  );
}
