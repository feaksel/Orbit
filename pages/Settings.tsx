
import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, AlertTriangle, Check, HardDrive, Shield, Palette, Sparkles } from 'lucide-react';
import { exportData, importData, clearAllData } from '../services/storageService';
import { THEMES, ThemeId, applyTheme, getStoredTheme } from '../services/themeService';

export const Settings: React.FC = () => {
  const [importStatus, setImportStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('emerald');

  useEffect(() => {
      setCurrentTheme(getStoredTheme());
  }, []);

  const handleThemeChange = (id: ThemeId) => {
      applyTheme(id);
      setCurrentTheme(id);
  };

  const handleExport = () => {
    const jsonString = exportData();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orbit_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = await importData(content);
        if (result.success) {
          setImportStatus({ type: 'success', msg: result.message });
          // Optional: reload page to reflect changes after a short delay
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setImportStatus({ type: 'error', msg: result.message });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
      if (window.confirm("WARNING: This will delete ALL your custom data and reset the app to defaults. This cannot be undone. Are you sure?")) {
          clearAllData();
          window.location.reload();
      }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8 animate-fade-in pb-24 md:pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400">Customize your experience and manage data.</p>
      </div>

      {/* Theme Section */}
      <div className="bg-dark-card rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Palette className="text-orbit-500" /> Appearance
              </h2>
          </div>
          <div className="p-6">
              <p className="text-sm text-slate-400 mb-4">Choose an accent theme for your workspace.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                      <button
                        key={id}
                        onClick={() => handleThemeChange(id)}
                        className={`group relative p-3 rounded-xl border transition-all flex flex-col items-center gap-3 overflow-hidden ${
                            currentTheme === id 
                            ? 'bg-slate-800 border-orbit-500 ring-1 ring-orbit-500/50' 
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                        }`}
                      >
                          <div 
                            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform group-hover:scale-110 ${currentTheme === id ? 'scale-110' : ''}`}
                            style={{ 
                                background: `linear-gradient(135deg, ${THEMES[id].colors[400]}, ${THEMES[id].colors[600]})` 
                            }}
                          >
                              {currentTheme === id && <Check className="w-5 h-5 text-white" />}
                          </div>
                          <div className="text-center">
                              <div className={`text-xs font-bold uppercase tracking-wide ${currentTheme === id ? 'text-white' : 'text-slate-400'}`}>
                                  {THEMES[id].name}
                              </div>
                          </div>
                          {/* Active Glow */}
                          {currentTheme === id && (
                              <div className="absolute inset-0 bg-orbit-500/5 pointer-events-none" />
                          )}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Export Section */}
      <div className="bg-dark-card rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <HardDrive className="text-orbit-500" /> Data Management
              </h2>
          </div>
          
          <div className="p-6 space-y-6">
              {/* Privacy Badge */}
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-4">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 shrink-0">
                    <Shield className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">Local-First Privacy</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Orbit stores data <strong>only on this device</strong>. 
                        We do not see your contacts. Use Export/Import to move data between devices.
                    </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                  <div className="flex-1">
                      <h3 className="text-white font-medium mb-1">Export Backup</h3>
                      <p className="text-sm text-slate-400">
                          Download a JSON file containing all your people, circles, and tasks.
                      </p>
                  </div>
                  <button 
                    onClick={handleExport}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all"
                  >
                      <Download className="w-4 h-4" /> Download
                  </button>
              </div>

              <div className="h-px bg-slate-700/50 w-full"></div>

              <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                  <div className="flex-1">
                      <h3 className="text-white font-medium mb-1">Import Backup</h3>
                      <p className="text-sm text-slate-400">
                          Restore from a previously exported JSON file. 
                          <span className="text-yellow-500 block mt-1 text-xs">⚠️ Overwrites current data.</span>
                      </p>
                      {importStatus && (
                          <div className={`mt-3 text-sm flex items-center gap-2 ${importStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                              {importStatus.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                              {importStatus.msg}
                          </div>
                      )}
                  </div>
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all border border-slate-600 hover:border-slate-500">
                      <Upload className="w-4 h-4" /> Restore File
                      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
              </div>
          </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 rounded-2xl border border-red-500/20 overflow-hidden">
          <div className="p-6">
              <h2 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5" /> Danger Zone
              </h2>
              <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                  <p className="text-sm text-slate-400">
                      Permanently delete all your local data and reset the application.
                  </p>
                  <button 
                    onClick={handleClearData}
                    className="text-red-400 hover:text-white hover:bg-red-600 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all border border-red-500/30"
                  >
                      <Trash2 className="w-4 h-4" /> Reset Application
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};
