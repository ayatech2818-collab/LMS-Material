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
    <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#3c3c3c] px-3 py-2">
      <CalendarIcon className="w-4 h-4 text-[#7e7e7e] shrink-0" />
      <input
        type="date"
        value={from}
        onChange={(e) => updateParams(e.target.value, to)}
        className="bg-transparent text-sm text-[#e6e6e6] outline-none [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:invert hover:[&::-webkit-calendar-picker-indicator]:opacity-80 cursor-pointer"
        title="Start Date"
      />
      <span className="text-[#7e7e7e] text-xs font-bold px-1 uppercase tracking-[1px]">to</span>
      <input
        type="date"
        value={to}
        onChange={(e) => updateParams(from, e.target.value)}
        className="bg-transparent text-sm text-[#e6e6e6] outline-none [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:invert hover:[&::-webkit-calendar-picker-indicator]:opacity-80 cursor-pointer"
        title="End Date"
      />
      {hasFilter && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear date filter"
          className="ml-1 p-1 rounded-full text-[#7e7e7e] hover:text-[#e22718] hover:bg-[#e22718]/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
