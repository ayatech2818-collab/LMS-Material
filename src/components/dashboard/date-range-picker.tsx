"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar as CalendarIcon, X } from "lucide-react";

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const updateParams = (newFrom: string, newTo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newFrom) params.set("from", newFrom); else params.delete("from");
    if (newTo) params.set("to", newTo); else params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasFilter = from || to;

  return (
    <div className="flex items-center gap-2 bg-white border border-[#e5e5e5] rounded-[6px] px-3 py-2 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
      <CalendarIcon className="w-4 h-4 text-body-gray shrink-0" />
      <input
        type="date"
        value={from}
        onChange={(e) => updateParams(e.target.value, to)}
        className="bg-transparent text-sm text-deep-charcoal outline-none placeholder:text-mute-gray [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 cursor-pointer"
        title="Start Date"
      />
      <span className="text-body-gray text-xs font-semibold px-1">to</span>
      <input
        type="date"
        value={to}
        onChange={(e) => updateParams(from, e.target.value)}
        className="bg-transparent text-sm text-deep-charcoal outline-none placeholder:text-mute-gray [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 cursor-pointer"
        title="End Date"
      />
      {hasFilter && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear date filter"
          className="ml-1 p-0.5 rounded-full text-body-gray hover:text-warning-red hover:bg-warning-red/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
