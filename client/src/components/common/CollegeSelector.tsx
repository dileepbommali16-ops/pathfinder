import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  VERIFIED_COLLEGES,
  formatCollegeWithLocation,
  type CollegeEntry,
} from "../../data/colleges";

interface CollegeSelectorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: "settings" | "onboarding";
}

export const CollegeSelector: React.FC<CollegeSelectorProps> = ({
  id = "settings-college",
  value,
  onChange,
  placeholder = "Search college / university or city (e.g. NRI University, Vijayawada)...",
  variant = "settings",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const searchTerm = (open ? query : "").trim().toLowerCase();

  const filteredColleges = useMemo(() => {
    const q = searchTerm || (open && query === "" ? "" : "");
    if (!q) return VERIFIED_COLLEGES;
    return VERIFIED_COLLEGES.filter((c) => {
      const haystack = [
        c.name,
        c.shortName,
        c.location,
        c.city,
        c.state,
        c.status,
        ...(c.aliases || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [searchTerm, open, query]);

  const matchedCollege = useMemo(() => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    return VERIFIED_COLLEGES.find(
      (c) =>
        formatCollegeWithLocation(c).toLowerCase() === normalized ||
        c.name.toLowerCase() === normalized
    );
  }, [value]);

  const handleSelect = (entry: CollegeEntry) => {
    onChange(formatCollegeWithLocation(entry));
    setQuery("");
    setOpen(false);
  };

  const isOnboarding = variant === "onboarding";

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          id={id}
          name={id}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          value={open && query !== "" ? query : value}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next);
            if (!open) setOpen(true);
          }}
          className={
            isOnboarding
              ? "w-full rounded-lg border border-[#27272A] bg-[#0E0E12] px-3.5 py-2.5 pr-20 text-sm text-[#FAFAFA] placeholder-[#52525B] outline-none transition-colors focus:border-[#A1A1AA]"
              : "w-full rounded-lg border border-[#27272A] bg-[#0E0E12] px-3.5 py-2.5 pr-20 text-xs text-[#FAFAFA] placeholder-[#52525B] outline-none transition-colors focus:border-[#A1A1AA]"
          }
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          {value && (
            <button
              type="button"
              aria-label="Clear selected college"
              onClick={() => {
                onChange("");
                setQuery("");
                setOpen(true);
              }}
              className="rounded px-2 py-1 text-[11px] font-medium text-[#A1A1AA] transition-colors hover:bg-[#18181B] hover:text-[#FAFAFA]"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            aria-label="Toggle verified colleges list"
            onClick={() => setOpen((prev) => !prev)}
            className="rounded px-2 py-1 font-mono text-[10px] text-[#A1A1AA] transition-colors hover:bg-[#18181B] hover:text-[#FAFAFA]"
          >
            {open ? "Close" : "List"}
          </button>
        </div>
      </div>

      {matchedCollege && !open && (
        <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[11px] text-[#A1A1AA]">
          <span className="truncate">{matchedCollege.location}</span>
          <span className="shrink-0 rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] text-[#D4D4D8]">
            {matchedCollege.status}
          </span>
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-1.5 overflow-hidden rounded-xl border border-[#27272A] bg-[#0C0C0E] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#1F1F23] bg-[#0C0C0E] px-3.5 py-2 font-mono text-[11px] text-[#71717A] tabular-nums">
            <span>{filteredColleges.length} colleges &amp; universities (or type any name)</span>
          </div>

          <div className="max-h-64 divide-y divide-[#1F1F23] overflow-y-auto bg-[#0C0C0E]">
            {filteredColleges.length > 0 ? (
              filteredColleges.map((entry) => {
                const isSelected =
                  formatCollegeWithLocation(entry).toLowerCase() === value.trim().toLowerCase() ||
                  entry.name.toLowerCase() === value.trim().toLowerCase();

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(entry);
                    }}
                    className={`flex w-full flex-col gap-1 px-3.5 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "bg-[#18181E] text-[#FAFAFA]"
                        : "bg-[#0C0C0E] text-[#E4E4E7] hover:bg-[#141418]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium leading-snug text-[#FAFAFA]">
                        {entry.name}
                      </span>
                      <span className="shrink-0 rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] text-[#D4D4D8]">
                        {entry.status}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-[#A1A1AA]">{entry.location}</div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-xs text-[#A1A1AA]">
                No match in curated list — keep typing to save{" "}
                <span className="font-semibold text-[#FAFAFA]">"{query}"</span>.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
