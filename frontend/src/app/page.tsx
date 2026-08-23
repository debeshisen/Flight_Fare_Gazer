'use client';

import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

interface HackerOption {
  price: number;
  hub: string;
  duration: string;
  airline: string;
}



interface ForecastResult {
  live_price: number;
  flight_details: {
    airline: string;
    departure: string;
    routing_type: string;
    is_smart_route: boolean;
  };
  hacker_routes: { cheapest: HackerOption | null; fastest: HackerOption | null } | null;
  price_insights: { level: string; typical_range: number[] } | null;
  predicted_future_price: number;
  target_drop_date: string;
  target_date_prediction: number;
  buy_decision: number;
  confidence_score: number;
  trend: string;
  days_to_holiday: number;
  is_weekend: boolean;
  price_history: Array<{ date: string; past_price?: number; future_price?: number }>;
}

const TODAY_STR = new Date().toISOString().split('T')[0];

const LOADING_MESSAGES = [
  "Scraping live airline data via SerpApi...",
  "Running XGBoost & Random Forest models...",
  "Analyzing cyclical date features...",
  "Hunting for virtual interlining hacker fares...",
  "Finalizing predictive forecast...",
];

export default function FareGazerDashboard() {
  const [loading, setLoading]         = useState(false);
  const [loadingText, setLoadingText]   = useState(LOADING_MESSAGES[0]);
  const [loadingStep, setLoadingStep]   = useState(0);
  const [error, setError]             = useState<string | null>(null);
  const [results, setResults]         = useState<ForecastResult | null>(null);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setLoadingText(LOADING_MESSAGES[0]);
    setLoadingStep(0);

    // Cycle loading messages every 1.5 s and advance the flight track
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      setLoadingText(LOADING_MESSAGES[msgIndex]);
      setLoadingStep(msgIndex);
    }, 1500);

    const formData = new FormData(e.currentTarget);
    const payload = {
      source:      formData.get('source'),
      destination: formData.get('destination'),
      flight_date: formData.get('flight_date'),
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to fetch flight data');
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const verdictState = results?.buy_decision ?? -1; // 0=WAIT, 1=BUY, 2=POOR VALUE
  const isBuy = verdictState === 1;

  const calculateMarkerPosition = (price: number, range: number[]) => {
    if (!range || range.length !== 2) return 50;
    const [low, high] = range;
    const minBound = low * 0.7;
    const maxBound = high * 1.3;
    const pct = ((price - minBound) / (maxBound - minBound)) * 100;
    return Math.max(5, Math.min(95, pct));
  };

  const markerPosition = results?.price_insights?.typical_range
    ? calculateMarkerPosition(results.live_price, results.price_insights.typical_range)
    : 50;

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">✈ Fare-Gazer <span className="text-blue-400">v5</span></h1>
          <p className="text-gray-400 mt-2">Stacking Ensemble ML · SerpApi Live Data</p>
        </div>

        {/* ── Search Form ────────────────────────────────────────────────── */}
        <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Source (IATA)</label>
              <input
                name="source" required placeholder="DEL" maxLength={3}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white uppercase placeholder-gray-600"
                onChange={e => { e.target.value = e.target.value.toUpperCase(); }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Destination (IATA)</label>
              <input
                name="destination" required placeholder="BOM" maxLength={3}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white uppercase placeholder-gray-600"
                onChange={e => { e.target.value = e.target.value.toUpperCase(); }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Flight Date</label>
              <input name="flight_date" type="date" required
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white [color-scheme:dark]" />
            </div>
            <button disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50">
              {loading ? 'Analyzing...' : 'Forecast Price'}
            </button>
          </form>
        </div>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* ── Loading ────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-neutral-900/50 rounded-xl border border-neutral-800 mt-6 w-full px-8">

            {/* Runway / Progress Track */}
            <div className="w-full max-w-md relative mb-8">
              {/* Background track */}
              <div className="w-full h-1 bg-neutral-700 rounded-full absolute top-1/2 -translate-y-1/2"></div>

              {/* Gliding airplane + contrail */}
              <div
                className="relative z-10 flex items-center justify-end transition-all duration-1000 ease-in-out"
                style={{ width: `${((loadingStep + 1) / LOADING_MESSAGES.length) * 100}%` }}
              >
                {/* Glowing contrail behind the plane */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 w-full rounded-full opacity-60 shadow-[0_0_10px_rgba(37,99,235,0.9)]"></div>

                {/* Airplane icon — rotated to fly right */}
                <svg
                  className="w-8 h-8 text-blue-400 rotate-90 translate-x-4 drop-shadow-lg flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </div>
            </div>

            {/* Cycling status text */}
            <p className="text-blue-400 font-mono text-sm tracking-widest uppercase animate-pulse">{loadingText}</p>
          </div>
        )}

        {/* ── Results Dashboard ──────────────────────────────────────────── */}
        {results && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Live Price + Flight Details */}
            <div className="md:col-span-3 bg-neutral-800 p-6 rounded-xl border border-neutral-700 flex justify-between items-center">
              <div>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Live Scraped Price</p>
                <p className="text-5xl font-black text-white">₹{results.live_price.toLocaleString('en-IN')}</p>
                {results.flight_details && (
                  <>
                    <p className="text-gray-400 text-sm mt-1">
                      ✈️ {results.flight_details.airline}
                      {results.flight_details.departure !== 'N/A' && ` · ${results.flight_details.departure}`}
                      {` · ${results.flight_details.routing_type}`}
                    </p>

                  </>
                )}
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Target Date AI Forecast</p>
                <p className="text-3xl font-bold text-blue-400">
                  ₹{(results.target_date_prediction ?? results.predicted_future_price).toLocaleString('en-IN')}
                </p>
                <p className="text-sm mt-1 text-gray-400">Raw ML output</p>
              </div>
            </div>

            {/* ── Hacker Fare Cards ─────────────────────────────────────────── */}
            {results.hacker_routes ? (
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.hacker_routes.cheapest && (
                  <div className="bg-neutral-800 border border-emerald-800/50 rounded-xl p-5">
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">⚡ Option 1: Max Savings</p>
                    <p className="text-2xl font-black text-white">
                      ₹{results.hacker_routes.cheapest.price.toLocaleString('en-IN')}
                      <span className="text-gray-400 text-base font-normal ml-2">{results.hacker_routes.cheapest.airline}</span>
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Via {results.hacker_routes.cheapest.hub} · {results.hacker_routes.cheapest.duration} total
                    </p>
                  </div>
                )}
                {results.hacker_routes.fastest && (
                  <div className="bg-neutral-800 border border-blue-800/50 rounded-xl p-5">
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">⏱️ Option 2: Fastest Layover</p>
                    <p className="text-2xl font-black text-white">
                      ₹{results.hacker_routes.fastest.price.toLocaleString('en-IN')}
                      <span className="text-gray-400 text-base font-normal ml-2">{results.hacker_routes.fastest.airline}</span>
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Via {results.hacker_routes.fastest.hub} · {results.hacker_routes.fastest.duration} total
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="md:col-span-3 bg-neutral-800/50 border border-neutral-700 p-4 rounded-xl flex items-center justify-center text-center">
                <p className="text-gray-400 text-sm">
                  <span className="text-emerald-500 mr-2">✓ Route Optimized:</span>
                  No cheaper connecting flights found. Your direct flight is the best value.
                </p>
              </div>
            )}

            {/* ── Price Insights Gauge ────────────────────────────────── */}
            {results.price_insights && results.price_insights.typical_range?.length === 2 && (
              <div className="md:col-span-3 bg-neutral-800 p-6 rounded-xl border border-neutral-700">
                <div className="mb-1">
                  <h3 className="text-lg font-bold">
                    Prices are currently{' '}
                    <span className={
                      results.price_insights.level === 'high' ? 'text-red-400' :
                      results.price_insights.level === 'low'  ? 'text-emerald-400' :
                      'text-amber-400'
                    }>{results.price_insights.level}</span>
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Typical range: ₹{results.price_insights.typical_range[0].toLocaleString('en-IN')} – ₹{results.price_insights.typical_range[1].toLocaleString('en-IN')}
                  </p>
                </div>
                {/* Gauge bar with floating marker */}
                <div className="relative w-full h-3 rounded-full flex mt-8 mb-6 overflow-visible">
                  <div className="h-full bg-emerald-500 w-1/3 rounded-l-full"></div>
                  <div className="h-full bg-amber-400 w-1/3 border-x border-neutral-800"></div>
                  <div className="h-full bg-red-500 w-1/3 rounded-r-full"></div>
                  {/* Dynamically positioned You marker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap shadow-lg border border-blue-400"
                    style={{ left: `${markerPosition}%` }}
                  >
                    ₹{results.live_price.toLocaleString('en-IN')} (You)
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Low</span><span>Typical</span><span>High</span>
                </div>
              </div>
            )}

            {/* AI Confidence Gauge */}
            <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 flex flex-col items-center justify-center text-center">
              <h2 className="text-xl font-bold mb-6">AI Verdict</h2>
              <div className="w-40 h-40 mb-4">
                {results.confidence_score !== undefined ? (
                  <CircularProgressbar
                    value={results.confidence_score}
                    text={`${results.confidence_score}%`}
                    styles={buildStyles({
                      textColor: '#fff',
                      pathColor: verdictState === 0 ? '#10b981' : verdictState === 1 ? '#3b82f6' : '#ef4444',
                      trailColor: '#262626',
                      textSize: '18px',
                    })}
                  />
                ) : (
                  <p className="text-gray-500 mt-16">Calculating...</p>
                )}
              </div>
              <h2 className={`text-2xl font-black mt-4 ${
                verdictState === 0 ? 'text-emerald-500' :
                verdictState === 1 ? 'text-blue-500' :
                'text-red-500'
              }`}>
                {verdictState === 0 ? 'WAIT' :
                 verdictState === 1 ? 'BUY NOW' :
                 'POOR VALUE'}
              </h2>

              {verdictState === 0 && (
                <p className="text-gray-400 text-sm mt-2 text-center">Cheapest alternative: ₹{results.predicted_future_price.toLocaleString('en-IN')} on {results.target_drop_date}</p>
              )}
              {verdictState === 1 && (
                <p className="text-gray-400 text-sm mt-2 text-center">Prices are stable. Safe to book now.</p>
              )}
              {verdictState === 2 && (
                <p className="text-red-400/80 text-sm mt-2 text-center px-4">Prices have spiked abnormally high. Book only if travel is urgent.</p>
              )}

              {/* ── XAI Breakdown ─────────────────────────────────────── */}
              <div className="mt-6 pt-4 border-t border-neutral-700 w-full px-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-left">Confidence Factors</p>
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-gray-400">Model Agreement</span>
                  <span className="text-emerald-500 font-semibold">High ✓</span>
                </div>
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-gray-400">Market Volatility</span>
                  <span className={results.confidence_score < 85 ? 'text-amber-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                    {results.confidence_score < 85 ? '⚠ Penalty Applied' : 'Stable ✓'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-gray-400">Time to Departure</span>
                  <span className={results.confidence_score < 90 ? 'text-amber-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                    {results.confidence_score < 90 ? '⚠ Distance Penalty' : 'Optimal ✓'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-gray-400">Holiday Proximity</span>
                  <span className={results.days_to_holiday <= 7 ? 'text-amber-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                    {results.days_to_holiday <= 7 ? '⚠ Surge Risk (Nearby)' : 'Clear ✓'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Day of Week</span>
                  <span className={results.is_weekend ? 'text-amber-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                    {results.is_weekend ? '⚠ Weekend Premium' : 'Weekday ✓'}
                  </span>
                </div>
              </div>
            </div>



            {/* Dual-Line Recharts Graph */}
            <div className="md:col-span-2 bg-neutral-800 p-6 rounded-xl border border-neutral-700 h-96 flex flex-col">
              <h2 className="text-xl font-bold mb-4">Flexible Departure Date Prices</h2>
              <div className="flex-1 w-full">
                {Array.isArray(results.price_history) && results.price_history.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results.price_history}>
                      <XAxis
                        dataKey="date"
                        stroke="#a3a3a3"
                        fontSize={11}
                        tickFormatter={(tick) => tick.substring(5)}
                      />
                      <YAxis
                        stroke="#a3a3a3"
                        fontSize={11}
                        domain={['dataMin - 500', 'dataMax + 500']}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px' }}
                        formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                      />
                      <Legend
                        formatter={(value) => value === 'past_price' ? 'Historical' : 'Forecast'}
                        wrapperStyle={{ color: '#a3a3a3', fontSize: 12 }}
                      />
                      <ReferenceLine
                        x={TODAY_STR}
                        stroke="#a3a3a3"
                        strokeDasharray="3 3"
                        label={{ position: 'top', value: 'Today', fill: '#a3a3a3', fontSize: 11 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="past_price"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="future_price"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Awaiting sufficient data to plot trend...
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
