"use client";

import { useEffect, useState } from "react";

type HackerFare = {
  route: string;
  price: number;
  savings_percent: number;
};

type Props = {
  source: string;
  dest: string;
  days_left: number;
};

export function HackerFares({ source, dest, days_left }: Props) {
  const [fares, setFares] = useState<HackerFare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/hacker-fares?source=${source}&dest=${dest}&days_left=${days_left}`)
      .then((res) => res.json())
      .then((data) => {
        setFares(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [source, dest, days_left]);

  return (
    <div className="pt-8 border-t border-neutral-800">
      <h2 className="text-2xl font-semibold mb-6 text-white text-center">
        Hacker Fares: Live Split-Route Deals
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-neutral-800/30 border border-neutral-800 p-6 rounded-2xl h-40 animate-pulse shadow-lg flex flex-col space-y-4">
              <div className="h-6 bg-neutral-700/50 rounded w-1/2"></div>
              <div className="h-4 bg-neutral-700/50 rounded w-full"></div>
              <div className="h-4 bg-neutral-700/50 rounded w-3/4"></div>
            </div>
          ))
        ) : fares.length > 0 ? (
          fares.map((fare, idx) => (
            <div key={idx} className="bg-gradient-to-br from-neutral-800 to-neutral-800/50 border border-emerald-500/20 shadow-lg p-6 rounded-2xl group hover:border-emerald-500/50 transition-colors">
              <div className="text-emerald-400 font-bold text-3xl mb-2 group-hover:scale-105 transition-transform origin-left">
                Save {fare.savings_percent}%
              </div>
              <div className="text-white font-bold text-xl mb-1">
                ₹{fare.price.toLocaleString()}
              </div>
              <div className="text-neutral-300 font-medium">{fare.route}</div>
              <div className="text-xs text-neutral-500 mt-4 uppercase tracking-wider font-semibold">
                Multi-city itinerary
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center text-neutral-500 py-8">
            No hacker fares found for this route.
          </div>
        )}
      </div>
    </div>
  );
}
