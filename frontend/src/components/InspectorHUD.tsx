import React, { useState } from 'react';
import type { MatchPayload } from '../types/telemetry';
import { Shield, Skull, CloudRain, Gem, Crosshair, User, Clock, Users } from 'lucide-react';

interface InspectorHUDProps {
  match: MatchPayload | null;
  currentTime: number;
  selectedPlayerId?: string;
  onSelectPlayer: (playerId: string) => void;
  onJumpToTime: (t: number) => void;
}

export const InspectorHUD: React.FC<InspectorHUDProps> = ({
  match,
  currentTime,
  selectedPlayerId,
  onSelectPlayer,
  onJumpToTime,
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'events'>('events');

  if (!match) return null;

  // Filter events that have occurred up to currentTime
  const pastEvents = match.events.filter(e => e.t <= currentTime);
  const recentEvents = pastEvents.slice(-25).reverse();

  // Summary counts
  const totalKills = match.events.filter(e => e.event === 'Kill' || e.event === 'BotKill').length;
  const stormDeaths = match.events.filter(e => e.event === 'KilledByStorm').length;

  return (
    <div className="flex flex-col h-[680px] bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden text-white">
      {/* Top Header: Match High-Level Metrics */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Match Overview</span>
          <span className="text-[11px] font-mono text-slate-400">{match.date.replace('_', ' ')}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <h2 className="text-lg font-bold truncate max-w-[200px]" title={match.match_id}>
            {match.match_id.substring(0, 12)}...
          </h2>
          <span className="text-xs font-mono text-slate-300">
            {Math.floor(match.duration / 60)}m {Math.floor(match.duration % 60)}s
          </span>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          <div className="bg-slate-800/70 p-2 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-center text-cyan-400 mb-0.5">
              <Users size={14} />
            </div>
            <div className="text-sm font-bold">{match.human_count}</div>
            <div className="text-[9px] text-slate-400 uppercase">Humans</div>
          </div>

          <div className="bg-slate-800/70 p-2 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-center text-amber-400 mb-0.5">
              <Shield size={14} />
            </div>
            <div className="text-sm font-bold">{match.bot_count}</div>
            <div className="text-[9px] text-slate-400 uppercase">Bots</div>
          </div>

          <div className="bg-slate-800/70 p-2 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-center text-red-400 mb-0.5">
              <Skull size={14} />
            </div>
            <div className="text-sm font-bold">{totalKills}</div>
            <div className="text-[9px] text-slate-400 uppercase">Kills</div>
          </div>

          <div className="bg-slate-800/70 p-2 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-center text-purple-400 mb-0.5">
              <CloudRain size={14} />
            </div>
            <div className="text-sm font-bold">{stormDeaths}</div>
            <div className="text-[9px] text-slate-400 uppercase">Storm</div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 text-xs font-semibold bg-slate-950/40">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-2.5 text-center transition border-b-2 ${
            activeTab === 'events'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Live Event Feed ({pastEvents.length}/{match.events.length})
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 py-2.5 text-center transition border-b-2 ${
            activeTab === 'roster'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Player Roster ({match.players.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs font-mono">
        {activeTab === 'events' ? (
          recentEvents.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              <Clock size={24} className="mx-auto mb-2 opacity-50" />
              <p>No events recorded yet.</p>
              <p className="text-[10px] mt-1">Press Play or scrub timeline to advance match.</p>
            </div>
          ) : (
            recentEvents.map((ev, i) => {
              const isCurrent = Math.abs(ev.t - currentTime) <= 2.0;
              return (
                <div
                  key={i}
                  onClick={() => onJumpToTime(ev.t)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isCurrent
                      ? 'bg-cyan-950/50 border-cyan-500/80 shadow-md shadow-cyan-900/30'
                      : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {renderEventBadge(ev.event)}
                    <div className="truncate">
                      <div className="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
                        <span>{ev.event}</span>
                        <span className="text-[10px] font-normal text-slate-400">({ev.is_bot ? 'Bot' : 'Human'})</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{ev.user_id}</p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 shrink-0 ml-2">
                    <span className="text-cyan-400 font-bold">{formatSeconds(ev.t)}</span>
                    <span className="block text-slate-500">{ev.elevation}m</span>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Player Roster Tab */
          match.players.map(p => {
            const isSelected = p.user_id === selectedPlayerId;
            return (
              <div
                key={p.user_id}
                onClick={() => onSelectPlayer(isSelected ? '' : p.user_id)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-cyan-900/60 border-cyan-400 text-white shadow-lg shadow-cyan-900/40'
                    : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      p.is_bot ? 'bg-amber-400' : 'bg-cyan-400'
                    }`}
                  />
                  <div className="truncate">
                    <div className="font-bold text-[11px] flex items-center gap-1.5">
                      <span className="truncate max-w-[150px]">{p.user_id}</span>
                      <span className={`text-[9px] px-1 rounded ${p.is_bot ? 'bg-amber-950 text-amber-300' : 'bg-cyan-950 text-cyan-300'}`}>
                        {p.is_bot ? 'BOT' : 'HUMAN'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{p.trajectory.length} telemetry points</span>
                  </div>
                </div>
                <button
                  className={`text-[10px] px-2 py-0.5 rounded font-sans transition ${
                    isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {isSelected ? 'Isolated' : 'Isolate'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

function renderEventBadge(event: string) {
  if (event === 'Kill' || event === 'BotKill') {
    return <Skull size={15} className="text-red-400 shrink-0" />;
  }
  if (event === 'Killed' || event === 'BotKilled') {
    return <Crosshair size={15} className="text-rose-400 shrink-0" />;
  }
  if (event === 'KilledByStorm') {
    return <CloudRain size={15} className="text-purple-400 shrink-0" />;
  }
  if (event === 'Loot') {
    return <Gem size={15} className="text-emerald-400 shrink-0" />;
  }
  return <User size={15} className="text-slate-400 shrink-0" />;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
