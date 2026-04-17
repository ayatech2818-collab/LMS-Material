"use client";

type ProductivityTableProps = {
  data: {
    fullName: string;
    role: string;
    subRole: string;
    tasksAssigned: number;
  }[];
};

export function ProductivityTable({ data }: ProductivityTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#f3f3f3]">
            <th className="pb-3 text-sm font-semibold text-deep-charcoal">Employee Name</th>
            <th className="pb-3 text-sm font-semibold text-deep-charcoal">Role</th>
            <th className="pb-3 text-sm font-semibold text-deep-charcoal">Sub-Role</th>
            <th className="pb-3 text-sm font-semibold text-deep-charcoal text-right">Tasks Handled</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {data.map((row, i) => (
            <tr key={i} className="border-b border-[#f3f3f3] hover:bg-ice-mist transition-colors">
              <td className="py-4 font-medium text-display-ink">{row.fullName}</td>
              <td className="py-4 text-body-gray capitalize">{row.role}</td>
              <td className="py-4 text-body-gray capitalize">{row.subRole ? row.subRole.replace(/_/g, ' ') : '-'}</td>
              <td className="py-4 text-ps-blue font-semibold text-right">{row.tasksAssigned}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-body-gray">
                No user productivity data available yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
