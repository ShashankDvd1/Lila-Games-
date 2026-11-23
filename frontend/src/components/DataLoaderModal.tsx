import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Upload, CheckCircle2, Calendar, X } from 'lucide-react';

interface PartitionInfo {
  date: string;
  match_count: number;
  player_count: number;
  event_count: number;
  map_count: number;
}

import { API_BASE_URL } from '../services/api';

interface DatasetInfo {
  engine: string;
  status: string;
  total_events: number;
  total_matches: number;
  total_players: number;
  partitions: PartitionInfo[];
  data_directory: string;
}

interface DataLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReloaded: () => void;
}

export const DataLoaderModal: React.FC<DataLoaderModalProps> = ({ isOpen, onClose, onDataReloaded }) => {
  const [info, setInfo] = useState<DatasetInfo | null>(null);
  const [reloading, setReloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchDatasetInfo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dataset/info`);
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch dataset info:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDatasetInfo();
    }
  }, [isOpen]);

  const handleReload = async () => {
    try {
      setReloading(true);
      setMessage(null);
      const res = await fetch(`${API_BASE_URL}/api/dataset/reload`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        setMessage('DuckDB engine successfully re-scanned and re-indexed all Parquet partitions!');
        onDataReloaded();
      } else {
        setMessage('Failed to reload telemetry data.');
      }
    } catch {
      setMessage('Network error connecting to telemetry engine.');
    } finally {
      setReloading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setMessage(null);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/api/dataset/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setMessage(`Uploaded and parsed '${file.name}' into telemetry engine!`);
        await fetchDatasetInfo();
        onDataReloaded();
      } else {
        setMessage('Error parsing uploaded telemetry file.');
      }
    } catch {
      setMessage('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Database size={18} />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white">Parquet Telemetry Loader & Parser</h2>
              <p className="text-[11px] text-slate-400 font-mono">Embedded DuckDB Analytical Query Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {message && (
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 px-3.5 py-2.5 rounded-xl text-xs">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <span>{message}</span>
            </div>
          )}

          {/* Engine Status Banner */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <p className="text-xs font-bold text-white">DuckDB In-Memory Columnar Database</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {info ? `${info.total_events.toLocaleString()} Events | ${info.total_matches} Matches | ${info.total_players} Unique Players` : 'Loading engine stats...'}
                </p>
              </div>
            </div>
            <button
              onClick={handleReload}
              disabled={reloading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-lg shadow-cyan-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={reloading ? 'animate-spin' : ''} />
              <span>{reloading ? 'Parsing...' : 'Re-parse Data'}</span>
            </button>
          </div>

          {/* Parsed Partitions Table */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
              <span>Parsed Date Partitions (Parquet Directories)</span>
              <span className="text-[11px] text-slate-400">{info?.partitions.length || 0} Partitions Online</span>
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 text-xs">
              {info?.partitions.map(p => (
                <div key={p.date} className="flex items-center justify-between p-3 hover:bg-slate-900/40 transition">
                  <div className="flex items-center gap-2.5">
                    <Calendar size={14} className="text-cyan-400" />
                    <div>
                      <p className="font-mono font-bold text-slate-200">{p.date.replace('_', ' ')}</p>
                      <p className="text-[10px] text-slate-500">{p.map_count} Maps included</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right font-mono text-[11px]">
                    <div>
                      <p className="font-bold text-white">{p.match_count}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Matches</p>
                    </div>
                    <div>
                      <p className="font-bold text-cyan-400">{p.event_count.toLocaleString()}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Events</p>
                    </div>
                    <div>
                      <p className="font-bold text-amber-400">{p.player_count}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Players</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Custom Parquet File */}
          <div className="bg-slate-950 p-4 rounded-xl border border-dashed border-slate-700/80 flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400">
              <Upload size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Load New Telemetry (.parquet or .nakama-0)</p>
              <p className="text-[11px] text-slate-400">Upload additional match files into DuckDB query engine</p>
            </div>
            <label className="mt-2 cursor-pointer bg-slate-800 hover:bg-slate-700 text-cyan-300 px-4 py-1.5 rounded-xl text-xs font-medium border border-slate-700 transition">
              <span>{uploading ? 'Parsing File...' : 'Select Parquet File'}</span>
              <input
                type="file"
                accept=".parquet,.nakama-0"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <span>Target Directory: <code className="text-cyan-400">backend/data/*/*.nakama-0</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
