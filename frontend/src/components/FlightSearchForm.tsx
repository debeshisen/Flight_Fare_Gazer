"use client";

import { useState } from "react";

export type ForecastRequest = {
  source: string;
  destination: string;
  flight_date: string;
};

type Props = {
  onSubmit: (data: ForecastRequest) => void;
  loading: boolean;
};

export function FlightSearchForm({ onSubmit, loading }: Props) {
  const [formData, setFormData] = useState<ForecastRequest>({
    source: "DEL",
    destination: "BOM",
    flight_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const CITIES = [
    { code: "DEL", name: "Delhi (DEL)" },
    { code: "BOM", name: "Mumbai (BOM)" },
    { code: "BLR", name: "Bangalore (BLR)" },
    { code: "CCU", name: "Kolkata (CCU)" },
    { code: "HYD", name: "Hyderabad (HYD)" },
    { code: "MAA", name: "Chennai (MAA)" }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-400">Source City</label>
          <select
            name="source"
            value={formData.source}
            onChange={handleChange}
            className="w-full bg-neutral-900/50 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
          >
            {CITIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-400">Destination City</label>
          <select
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            className="w-full bg-neutral-900/50 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
          >
            {CITIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-400">Flight Date</label>
          <input
            type="date"
            name="flight_date"
            value={formData.flight_date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            className="w-full bg-neutral-900/50 border border-neutral-700 rounded-xl px-4 py-[11px] text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none pointer-events-auto"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || formData.source === formData.destination}
        className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-neutral-900/30 border-t-neutral-900 rounded-full animate-spin"></div>
            <span>Running Stealth Scraper...</span>
          </>
        ) : "Forecast Price"}
      </button>
    </form>
  );
}
