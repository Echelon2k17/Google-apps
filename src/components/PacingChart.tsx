import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Activity } from 'lucide-react';
import { Scene } from '../types/video';

interface PacingChartProps {
  scenes: Scene[];
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
}

type ChartViewMode = 'combined' | 'intensity' | 'duration';

export const PacingChart: React.FC<PacingChartProps> = ({
  scenes,
  activeSceneIndex,
  onSelectScene,
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('combined');

  if (!scenes || scenes.length === 0) return null;

  const chartData = scenes.map((scene, idx) => {
    const fallbackIntensity = Math.min(
      95,
      Math.max(35, 45 + Math.round((idx / Math.max(1, scenes.length - 1)) * 45))
    );
    return {
      index: idx,
      label: `S${idx + 1}`,
      heading: scene.heading || `Scene ${idx + 1}`,
      duration: scene.duration,
      intensity: scene.emotionalIntensity ?? fallbackIntensity,
      transition: scene.transition || 'fade',
    };
  });

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const avgDuration = (totalDuration / scenes.length).toFixed(1);
  const peakIntensity = Math.max(...chartData.map((d) => d.intensity));

  return (
    <div className="bg-zinc-900/75 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Pacing & Emotional Intensity
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Total {totalDuration}s · Avg {avgDuration}s per scene · Peak {peakIntensity}% intensity
          </p>
        </div>

        {/* View Mode Filter */}
        <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setViewMode('combined')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
              viewMode === 'combined'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Combined
          </button>
          <button
            type="button"
            onClick={() => setViewMode('intensity')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
              viewMode === 'intensity'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Intensity
          </button>
          <button
            type="button"
            onClick={() => setViewMode('duration')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
              viewMode === 'duration'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Duration
          </button>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
            onClick={(state) => {
              if (state && typeof state.activeTooltipIndex === 'number') {
                onSelectScene(state.activeTooltipIndex);
              }
            }}
          >
            <defs>
              <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />

            <XAxis
              dataKey="label"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
            />

            {(viewMode === 'combined' || viewMode === 'duration') && (
              <YAxis
                yAxisId="duration"
                orientation="left"
                domain={[0, 16]}
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickFormatter={(v) => `${v}s`}
                axisLine={false}
                tickLine={false}
              />
            )}

            {(viewMode === 'combined' || viewMode === 'intensity') && (
              <YAxis
                yAxisId="intensity"
                orientation={viewMode === 'combined' ? 'right' : 'left'}
                domain={[0, 100]}
                stroke="#71717a"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
            )}

            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs space-y-1">
                    <div className="font-semibold text-zinc-100">
                      Scene {d.index + 1}: {d.heading}
                    </div>
                    <div className="text-zinc-400 flex items-center space-x-3">
                      <span>
                        Duration: <strong className="text-amber-400">{d.duration}s</strong>
                      </span>
                      <span>
                        Intensity: <strong className="text-red-400">{d.intensity}%</strong>
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 capitalize">
                      Transition: {d.transition} · Click to edit
                    </div>
                  </div>
                );
              }}
            />

            {(viewMode === 'combined' || viewMode === 'duration') && (
              <Bar
                yAxisId="duration"
                dataKey="duration"
                barSize={26}
                radius={[4, 4, 0, 0]}
                className="cursor-pointer"
              >
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={idx === activeSceneIndex ? '#f59e0b' : '#3f3f46'}
                  />
                ))}
              </Bar>
            )}

            {(viewMode === 'combined' || viewMode === 'intensity') && (
              <Area
                yAxisId="intensity"
                type="monotone"
                dataKey="intensity"
                stroke="#ef4444"
                strokeWidth={2.5}
                fill="url(#intensityGradient)"
                dot={{ r: 3.5, fill: '#ef4444', strokeWidth: 0 }}
                activeDot={{ r: 5.5, fill: '#f87171', stroke: '#fff', strokeWidth: 1.5 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
        <div className="flex items-center space-x-4">
          {(viewMode === 'combined' || viewMode === 'duration') && (
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
              <span>Scene Duration (active highlighted)</span>
            </span>
          )}
          {(viewMode === 'combined' || viewMode === 'intensity') && (
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-0.5 bg-red-500 inline-block" />
              <span>Emotional Intensity (%)</span>
            </span>
          )}
        </div>
        <span className="hidden sm:inline text-zinc-500">Click any scene to focus</span>
      </div>
    </div>
  );
};
