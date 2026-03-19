"use client";

import * as React from "react";
import { Search, RotateCcw, ChevronDown, Filter } from "lucide-react";

const PERIODS = [
  { label: "2024-2025", value: "2024-2025" },
  { label: "2025-2026", value: "2025-2026" },
];

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
];

const AGE_GROUPS = ["U10", "U12", "U14", "U16", "U18", "U20"];
const EVENT_OPTIONS = ["1", "2+", "3+", "4+", "5+", "6+"];
const STATUS_OPTIONS = [
  { label: "Eligible", value: "ELIGIBLE" },
  { label: "Ineligible", value: "INELIGIBLE" },
];

export interface JuniorSearchFiltersState {
  name: string;
  fed: string;
  ageGroup: string;
  gender: string;
  events: string;
  period: string;
  eligibilityStatus: string;
}

interface JuniorSearchFiltersProps {
  onSearch: (filters: Partial<JuniorSearchFiltersState>) => void;
  fedOptions: string[];
  initialState?: Partial<JuniorSearchFiltersState>;
}

export function JuniorSearchFilters({
  onSearch,
  fedOptions,
  initialState,
}: JuniorSearchFiltersProps) {
  const [filters, setFilters] = React.useState({
    name: initialState?.name ?? "",
    fed: initialState?.fed ?? "ALL",
    ageGroup: initialState?.ageGroup ?? "ALL",
    gender: initialState?.gender ?? "ALL",
    events: initialState?.events ?? "ALL",
    period: initialState?.period ?? "ALL",
    eligibilityStatus: initialState?.eligibilityStatus ?? "ALL",
  });

  const updateFilter = (key: keyof JuniorSearchFiltersState, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onSearch(next);
  };

  const handleReset = () => {
    const reset = {
      name: "",
      fed: "ALL",
      ageGroup: "ALL",
      gender: "ALL",
      events: "ALL",
      period: "ALL",
      eligibilityStatus: "ALL",
    };
    setFilters(reset);
    onSearch(reset);
  };

  // Enhanced Select Component with better styling
  const Select = ({ label, value, options, onChange }: any) => (
    <div className="flex flex-col min-w-[120px] sm:min-w-[140px] lg:min-w-[160px]">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 ml-1">
        {label}
      </label>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer pr-8 transition-all hover:bg-accent/30 dark:hover:bg-accent/20"
        >
          <option value="ALL">All</option>
          {options.map((opt: any) => (
            <option key={opt.value || opt} value={opt.value || opt}>
              {opt.label || opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" />
      </div>
    </div>
  );

  return (
    <div className="sticky top-0 z-20 w-full bg-card/95 dark:bg-card/90 backdrop-blur-sm border-b border-border shadow-sm px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Filter Rankings
            </h3>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            title="Reset all filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* Search Input - Full width on mobile, then flex on larger screens */}
        <div className="mb-4">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 ml-1 block">
            Player Search
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, ID, or federation..."
              value={filters.name}
              onChange={(e) => updateFilter("name", e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 pl-10 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/70"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Filter Grid - Responsive layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
          <Select
            label="Period"
            value={filters.period}
            options={PERIODS}
            onChange={(v: any) => updateFilter("period", v)}
          />

          <Select
            label="Age Group"
            value={filters.ageGroup}
            options={AGE_GROUPS}
            onChange={(v: any) => updateFilter("ageGroup", v)}
          />

          <Select
            label="Gender"
            value={filters.gender}
            options={GENDER_OPTIONS}
            onChange={(v: any) => updateFilter("gender", v)}
          />

          <Select
            label="Federation"
            value={filters.fed}
            options={["Limpopo", ...fedOptions]}
            onChange={(v: any) => updateFilter("fed", v)}
          />

          <Select
            label="Events Count"
            value={filters.events}
            options={EVENT_OPTIONS}
            onChange={(v: any) => updateFilter("events", v)}
          />

          <Select
            label="CDC Status"
            value={filters.eligibilityStatus}
            options={STATUS_OPTIONS}
            onChange={(v: any) => updateFilter("eligibilityStatus", v)}
          />

          {/* Reset button for mobile - hidden on larger screens */}
          <div className="sm:hidden flex items-end">
            <button
              onClick={handleReset}
              className="w-full py-2.5 text-sm font-medium rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All Filters
            </button>
          </div>
        </div>

        {/* Active filters indicator */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex flex-wrap gap-2">
            {filters.name && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-primary/10 text-primary rounded-md">
                <span>Name:</span>
                <span className="font-medium">{filters.name}</span>
              </div>
            )}
            {filters.fed !== "ALL" && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-muted text-foreground rounded-md">
                <span>Federation:</span>
                <span className="font-medium">{filters.fed}</span>
              </div>
            )}
            {filters.gender !== "ALL" && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-muted text-foreground rounded-md">
                <span>Gender:</span>
                <span className="font-medium">
                  {filters.gender === "MALE" ? "Male" : "Female"}
                </span>
              </div>
            )}
            {filters.ageGroup !== "ALL" && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-muted text-foreground rounded-md">
                <span>Age Group:</span>
                <span className="font-medium">{filters.ageGroup}</span>
              </div>
            )}
            {filters.events !== "ALL" && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-muted text-foreground rounded-md">
                <span>Events:</span>
                <span className="font-medium">{filters.events}</span>
              </div>
            )}
            {filters.eligibilityStatus !== "ALL" && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-muted text-foreground rounded-md">
                <span>Status:</span>
                <span className="font-medium">
                  {filters.eligibilityStatus === "ELIGIBLE"
                    ? "Eligible"
                    : "Ineligible"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
