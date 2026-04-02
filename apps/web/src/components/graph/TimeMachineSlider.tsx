import React from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface TimeMachineSliderProps {
  min: number;
  max: number;
  value: number;
  label?: string;
  onChange: (value: number) => void;
  onPlayPause?: () => void;
  isPlaying?: boolean;
}

export function TimeMachineSlider({ 
  min, 
  max, 
  value, 
  label,
  onChange, 
  onPlayPause, 
  isPlaying 
}: TimeMachineSliderProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[450px] bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-gray-200/50 ring-1 ring-black/5 transition-all hover:ring-black/10">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Git History Time Machine</span>
        </div>
        {label && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-600 border border-blue-100">
            {label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onPlayPause}
          className={clsx(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all active:scale-95",
            isPlaying 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
              : "bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-200"
          )}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between px-0.5 text-[9px] font-bold text-gray-400 font-mono uppercase">
            <span>Genesis</span>
            <span>Present</span>
          </div>
        </div>

        <button
          onClick={() => onChange(max)}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-900 transition-all active:scale-95"
          title="Snap to Present"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
