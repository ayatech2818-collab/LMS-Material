"use client";

type ProductivityTableProps = {
  data: {
    fullName: string;
    role: string;
    subRole: string;
    tasksAssigned: number;
    tasksDone: number;
  }[];
};

export function ProductivityTable({ data }: ProductivityTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#3c3c3c]">
            <th className="pb-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px]">Employee Name</th>
            <th className="pb-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px]">Role</th>
            <th className="pb-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px] hidden sm:table-cell">Sub-Role</th>
            <th className="pb-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px] text-center">Active</th>
            <th className="pb-3 text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px] text-right">Completed</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {data.map((row, i) => (
            <tr key={i} className="border-b border-[#3c3c3c] hover:bg-[#262626] transition-colors">
              <td className="py-3 font-medium text-[#e6e6e6]">{row.fullName}</td>
              <td className="py-3 text-[#bbbbbb] capitalize text-xs">{row.role}</td>
              <td className="py-3 text-[#bbbbbb] capitalize text-xs hidden sm:table-cell">{row.subRole ? row.subRole.replace(/_/g, ' ') : '-'}</td>
              <td className="py-3 text-[#e6e6e6] font-bold text-center">{row.tasksAssigned}</td>
              <td className="py-3 text-[#0fa336] font-bold text-right">{row.tasksDone}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-[#7e7e7e] text-sm">
                No user productivity data available yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
