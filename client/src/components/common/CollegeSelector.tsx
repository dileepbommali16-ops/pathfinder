import React, { useEffect, useMemo, useRef, useState } from "react";
import { Building, ChevronDown, MapPin, Search, X } from "lucide-react";
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
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
        {isOnboarding && (
          <Building className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        )}
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
              ? "w-full rounded-2xl border border-white/15 bg-black py-3 pl-10 pr-16 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:border-white focus:ring-2 focus:ring-white/15"
              : "w-full rounded-xl border border-white/[0.12] bg-black px-3.5 py-2.5 pr-14 text-xs text-white placeholder-slate-500 outline-none transition-colors focus:border-white"
          }
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {value && (
            <button
              type="button"
              aria-label="Clear selected college"
              onClick={() => {
                onChange("");
                setQuery("");
                setOpen(true);
              }}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            aria-label="Toggle verified colleges list"
            onClick={() => setOpen((prev) => !prev)}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180 text-white" : ""}`}
            />
          </button>
        </div>
      </div>

      {matchedCollege && !open && (
        <div className="mt-1.5 flex items-center gap-1.5 px-1 text-[11px] text-slate-300">
          <MapPin className="h-3 w-3 shrink-0 text-[#2B2024]" />
          <span className="truncate">{matchedCollege.location}</span>
          <span className="ml-auto shrink-0 rounded-full border border-white/15 bg-black px-2 py-0.5 text-[10px] font-semibold text-white">
            {matchedCollege.status}
          </span>
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-1.5 overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl shadow-black/90">
          <div className="flex items-center justify-between border-b border-white/10 bg-black px-3 py-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Search className="h-3 w-3 text-[#2B2024]" />
              {filteredColleges.length} verified campuses (or type any college name)
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white">
              Real Locations
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.07] bg-black">
            {filteredColleges.length > 0 ? (
              filteredColleges.map((entry) => {
                const isSelected =
                  formatCollegeWithLocation(entry).toLowerCase() ===
                    value.trim().toLowerCase() ||
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
                        ? "bg-white/[0.10] text-white"
                        : "bg-black text-slate-100 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-white leading-snug">
                        {entry.name}
                      </span>
                      <span className="shrink-0 rounded-full border border-white/15 bg-black px-2 py-0.5 text-[10px] font-medium text-slate-200">
                        {entry.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <MapPin className="h-3 w-3 shrink-0 text-[#2B2024]" />
                      <span className="truncate">{entry.location}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-xs text-slate-400">
                No match in curated list — press Enter or keep typing to save{" "}
                <span className="font-semibold text-white">"{query}"</span>.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
