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

  return (
    <>
      <Header title="User Management" />
      <div className="max-w-[1920px] mx-auto w-full px-4 flex flex-col h-[calc(100vh-80px)]">
        <section className="mb-4 mt-4 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-light text-display-ink mb-1">Access Control</h2>
            <p className="text-body-gray text-sm">Manage your team&apos;s access and assignments.</p>
          </div>
          <AddUserForm />
        </section>

        <div className="bg-white rounded-[24px] shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] border border-[#f3f3f3] overflow-hidden flex-1 flex flex-col mb-6">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-ice-mist border-b border-[#e5e5e5]">
                  <th className="px-4 py-3 text-xs font-medium text-body-gray uppercase tracking-wider w-[14%]">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-body-gray uppercase tracking-wider w-[18%]">Email</th>
                  <th className="px-4 py-3 text-xs font-medium text-body-gray uppercase tracking-wider w-[10%]">Phone</th>
                  <th className="px-4 py-3 text-xs font-medium text-body-gray uppercase tracking-wider w-[13%]">Password</th>
                  <th className="px-4 py-3 text-xs font-medium text-body-gray uppercase tracking-wider w-[8%]">Role</th>
                  <th className="px-4 py-3 text-xs font-medium text-body-gray uppercase tracking-wider w-[11%]">Sub Role</th>
                  <th className="px-4 py-3 text-xs font-medium text-body-gray uppercase tracking-wider text-center w-[6%]">Tasks</th>
                  <th className="px-4 py-3 text-xs font-medium text-body-gray uppercase tracking-wider w-[7%]">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-body-gray uppercase tracking-wider text-right w-[13%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f3f3]">
                {profiles?.map(profile => (
                  <tr key={profile.id} className="hover:bg-ice-mist/50 transition-colors">
                    <td className="px-4 py-4 font-semibold text-deep-charcoal text-sm truncate">
                      {profile.full_name}
                    </td>
                    <td className="px-4 py-4 text-ps-blue font-medium text-sm truncate">
                      {profile.email}
                    </td>
                    <td className="px-4 py-4 text-body-gray text-sm truncate">
                      {profile.phone ? `+${profile.phone}` : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <PasswordCell password={profile.plain_password} />
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider
                        ${profile.role === 'admin' ? 'bg-ps-blue/10 text-ps-blue' : 
                          profile.role === 'qc' ? 'bg-commerce-orange/10 text-commerce-orange' : 
                          'bg-ps-cyan/10 text-[#008ba8]'}
                      `}>
                        {profile.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-body-gray text-xs truncate">
                      {profile.sub_role ? profile.sub_role.replace(/_/g, ' ') : '-'}
                    </td>
                    <td className="px-4 py-4 text-center text-deep-charcoal font-semibold text-sm">
                      {profile.task_assignments?.length || 0}
                    </td>
                    <td className="px-4 py-4">
                       {profile.is_active ? (
                         <span className="text-xs font-semibold text-[#2e7d32] bg-[#2e7d32]/10 px-2 py-0.5 rounded-full">Active</span>
                       ) : (
                         <span className="text-xs font-semibold text-mute-gray bg-mute-gray/10 px-2 py-0.5 rounded-full">Inactive</span>
                       )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-0.5">
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
                    <td colSpan={9} className="px-4 py-12 text-center text-body-gray">
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
