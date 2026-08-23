"use client";

import { Info, TrendingUp, TrendingDown, Plane } from "lucide-react";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

type Props = {
  result: { 
    live_price: number;
    predicted_future_price: number;
    buy_decision: number; 
    trend: string;
    confidence_score: number;
  } | null;
  loading: boolean;
  error: string | null;
};

export function PredictionResult({ result, loading, error }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-24 h-full">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-dashed border-emerald-500/30 rounded-full animate-[spin_4s_linear_infinite]"></div>
          <div className="absolute inset-2 border-4 border-emerald-500/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
          <Plane className="w-10 h-10 text-emerald-400 opacity-80 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white tracking-tight">Firing up stealth scrapers...</h3>
          <p className="text-neutral-400">Interrogating airline databases...</p>
          <p className="text-emerald-500/60 text-sm font-mono mt-2">(This takes about 10 seconds)</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center h-full flex items-center justify-center min-h-[300px]">
        {error}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center text-neutral-500 flex flex-col items-center justify-center h-full py-20 min-h-[300px]">
        <Info className="w-12 h-12 mb-4 opacity-50" />
        <p>Enter details to see the live scraped price and Prophet ML forecast.</p>
      </div>
    );
  }

  const isBuy = result.buy_decision === 1;
  const isHighConfidence = result.confidence_score > 80;
  const isMedConfidence = result.confidence_score >= 65 && result.confidence_score <= 80;
  const pathColor = isHighConfidence ? '#10b981' : isMedConfidence ? '#eab308' : '#ef4444';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col justify-center min-h-[300px]">
      
      {/* Live Price Banner */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Plane className="w-32 h-32 transform rotate-45" />
        </div>
        <h2 className="text-lg text-neutral-300 font-medium tracking-wide uppercase mb-2">Live Scraped Price</h2>
        <div className="text-6xl font-black text-white tracking-tighter drop-shadow-md">
          ₹{result.live_price.toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Recommendation Widget */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg space-y-4">
          <h3 className="text-lg text-neutral-400 font-medium uppercase tracking-wide">AI Verdict</h3>
          
          <div className={`px-8 py-4 rounded-2xl border-2 ${isBuy ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]'}`}>
            <div className="text-3xl font-black tracking-tight uppercase">
              {isBuy ? 'BUY NOW' : 'WAIT'}
            </div>
          </div>
          
          <p className="text-neutral-400 text-sm leading-relaxed mt-2">
            {isBuy ? "Prophet ML detects a RISING trend." : "Prophet ML detects a FALLING trend."}
          </p>
        </div>

        {/* Cart Wheel Confidence Widget */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg space-y-4">
          <h3 className="text-lg text-neutral-400 font-medium uppercase tracking-wide">Confidence</h3>
          <div className="w-32 h-32 md:w-40 md:h-40 relative">
            <CircularProgressbar 
              value={result.confidence_score} 
              text={`${result.confidence_score}%`}
              styles={buildStyles({
                pathColor: pathColor,
                textColor: '#fff',
                trailColor: '#262626',
                textSize: '24px'
              })}
            />
          </div>
        </div>
        
        {/* Prophet Forecast Details */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 shadow-lg flex flex-col items-center justify-center text-center space-y-4">
          <h3 className="text-lg text-neutral-400 font-medium uppercase tracking-wide flex items-center gap-2">
            14-Day Forecast
          </h3>
          
          <div className="text-4xl md:text-5xl font-black text-white tracking-tighter">
            ₹{result.predicted_future_price.toLocaleString()}
          </div>
          
          <div className={`flex items-center gap-2 font-bold px-4 py-2 rounded-lg ${result.trend === 'RISING' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {result.trend === 'RISING' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span>Trend is {result.trend}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
