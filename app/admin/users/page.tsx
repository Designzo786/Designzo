import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { UserRoleSelect } from "./UserRoleSelect";
import { UserSearch } from "./UserSearch";
import { auth } from "@/lib/auth";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const session = await auth();
  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { assets: true, purchases: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Users
          </h1>
          <p className="text-sm text-muted mt-1">
            {query
              ? `${users.length} result${users.length === 1 ? "" : "s"} for "${query}"`
              : `${users.length} user${users.length === 1 ? "" : "s"} on the platform.`}
          </p>
        </div>
        <UserSearch initialQuery={query} />
      </header>

      {users.length === 0 ? (
        <div className="rounded-xl border border-border border-dashed bg-surface/50 p-12 text-center text-sm text-muted">
          {query
            ? `No users match "${query}".`
            : "No users on the platform yet."}
        </div>
      ) : (
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-160 text-sm">
          <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="text-left font-medium px-4 py-3">User</th>
              <th className="text-left font-medium px-4 py-3">Activity</th>
              <th className="text-left font-medium px-4 py-3">Joined</th>
              <th className="text-right font-medium px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const isSelf = session?.user.id === u.id;
              return (
                <tr key={u.id} className="hover:bg-elevated/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={u.image} name={u.name ?? u.email} size={32} />
                      <div className="min-w-0">
                        <div className="font-medium text-primary truncate max-w-[200px]">
                          {u.name ?? "Unnamed"}{" "}
                          {isSelf && (
                            <span className="text-xs text-muted">(you)</span>
                          )}
                        </div>
                        <div className="text-xs text-muted truncate max-w-[200px]">
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary text-xs">
                    {u._count.assets} uploads · {u._count.purchases} purchases
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <UserRoleSelect
                      userId={u.id}
                      currentRole={u.role}
                      disabled={isSelf}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
      )}
    </div>
  );
}
