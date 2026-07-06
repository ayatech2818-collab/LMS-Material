import { createAdminClient } from "@/lib/supabase/admin";
import { Header } from "@/components/shared/header";
import { AddUserForm } from "@/components/admin/add-user-modal";
import { UserActionMenu } from "@/components/admin/user-action-menu";
import { MessageCircle } from "lucide-react";
import { PasswordCell } from "@/components/admin/password-cell";

export const revalidate = 0;

export default async function UsersPage() {
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*, task_assignments(id)")
    .order("created_at", { ascending: false });

  const { data: history } = await supabase
    .from("task_history")
    .select("changed_by, action")
    .in("action", ["submitted", "qc_approved_script", "qc_approved_video"]);

  const completedCounts = new Map<string, number>();
  if (history) {
    history.forEach(h => {
      if (h.changed_by) {
        completedCounts.set(h.changed_by, (completedCounts.get(h.changed_by) || 0) + 1);
      }
    });
  }

  return (
    <>
      <Header title="User Management" />
      <div className="max-w-[1920px] mx-auto w-full flex flex-col">
        <section className="mb-4 mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-xs font-bold text-[#7e7e7e] tracking-[3px] uppercase mb-1">Access Control</h2>
            <p className="text-[#bbbbbb] text-sm">Manage your team&apos;s access and assignments.</p>
          </div>
          <AddUserForm />
        </section>

        <div className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-hidden flex flex-col mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#0d0d0d] border-b border-[#3c3c3c]">
                  <th className="px-4 py-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px]">Name</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px]">Email</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px] hidden lg:table-cell">Phone</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px] hidden lg:table-cell">Password</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px]">Role</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px] hidden xl:table-cell">Sub Role</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px] text-center">Tasks Done</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px]">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3c3c3c]">
                {profiles?.map(profile => (
                  <tr key={profile.id} className="hover:bg-[#262626] transition-colors">
                    <td className="px-4 py-4 font-semibold text-[#e6e6e6] text-sm truncate max-w-[120px]">
                      {profile.full_name}
                    </td>
                    <td className="px-4 py-4 text-[#0066b1] font-medium text-sm truncate max-w-[160px]">
                      {profile.email}
                    </td>
                    <td className="px-4 py-4 text-[#bbbbbb] text-sm truncate hidden lg:table-cell">
                      {profile.phone ? `+${profile.phone}` : '-'}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <PasswordCell password={profile.plain_password} />
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border
                        ${profile.role === 'admin' ? 'border-[#0066b1] text-[#0066b1]' :
                          profile.role === 'qc' ? 'border-[#e22718] text-[#e22718]' :
                          'border-[#1c69d4] text-[#1c69d4]'}
                      `}>
                        {profile.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#7e7e7e] text-xs truncate hidden xl:table-cell">
                      {profile.sub_role ? profile.sub_role.replace(/_/g, ' ') : '-'}
                    </td>
                    <td className="px-4 py-4 text-center text-[#e6e6e6] font-bold text-sm">
                      {completedCounts.get(profile.id) || 0}
                    </td>
                    <td className="px-4 py-4">
                      {profile.is_active ? (
                        <span className="text-[10px] font-bold text-[#0fa336] border border-[#0fa336] px-2 py-0.5 uppercase tracking-wider">Active</span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#7e7e7e] border border-[#3c3c3c] px-2 py-0.5 uppercase tracking-wider">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {profile.phone && profile.plain_password && (
                          <a
                            href={`https://wa.me/${profile.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Your login credentials:\n\nEmail: ${profile.email}\nPassword: ${profile.plain_password}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Send credentials via WhatsApp"
                            className="p-1.5 hover:bg-[#25D366]/10 rounded-full transition-colors text-[#25D366]"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <UserActionMenu userId={profile.id} email={profile.email} isActive={profile.is_active} />
                      </div>
                    </td>
                  </tr>
                ))}

                {(!profiles || profiles.length === 0) && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-[#7e7e7e]">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
