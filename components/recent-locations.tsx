"use client";

import { Button } from "@/components/ui/button";
import { formatLocationLabel } from "@/lib/location";
import type { WeatherLocation } from "@/types/location";

type RecentLocationsProps = {
  locations: WeatherLocation[];
  selectedId?: string | null;
  onSelect: (location: WeatherLocation) => void;
  onClear?: () => void;
};

export function RecentLocations({ locations, selectedId, onSelect, onClear }: RecentLocationsProps) {
  if (locations.length === 0) return null;

  return (
    <section aria-label="Recent locations" className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent
        </h2>
        {onClear ? (
          <Button variant="ghost" size="sm" type="button" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </div>
      <ul className="flex flex-wrap gap-2">
        {locations.map((location) => {
          const active = location.id === selectedId;
          return (
            <li key={location.id}>
              <Button
                type="button"
                variant={active ? "default" : "secondary"}
                size="sm"
                onClick={() => onSelect(location)}
                title={formatLocationLabel(location)}
              >
                {location.city}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
