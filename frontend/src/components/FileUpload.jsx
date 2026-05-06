import React, { useState, useRef, useCallback } from 'react';
import { API_BASE } from '../config';
import { useAuth } from '../contexts/AuthContext';

function FileUpload({ onFileUpload, onManualEntry, onUrlImport, onGuestUrlImport, credits, onNeedsCredits }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [url, setUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const fileInputRef = useRef(null);
  const { token } = useAuth();

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
  const validateFile = (file) => {
    if (!file) return false;
    if (file.size > MAX_FILE_SIZE) { alert('PDF ist zu gro\u00df (max. 30 MB). Bitte ein kleineres Expos\u00e9 verwenden.'); return false; }
    return true;
  };
  const handleDrop = useCallback((e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file && file.type === 'application/pdf' && validateFile(file)) setSelectedFile(file); }, []);
  const handleFileSelect = useCallback((e) => { const file = e.target.files[0]; if (file && validateFile(file)) setSelectedFile(file); }, []);
  const handleUploadClick = useCallback(() => { if (selectedFile) onFileUpload(selectedFile); }, [selectedFile, onFileUpload]);
  const handleBrowseClick = useCallback(() => { fileInputRef.current?.click(); }, []);

  const handleUrlSubmit = useCallback(async () => {
    if (!url.trim()) return;
    setUrlError('');

    // Guest: save URL and redirect to register
    if (!token && onGuestUrlImport) {
      onGuestUrlImport(url.trim());
      return;
    }

    // Kein Credit -> Paywall vor KI-Call (extract-url kostet pro Aufruf)
    if (credits === 0 && onNeedsCredits) {
      onNeedsCredits();
      return;
    }

    setUrlLoading(true);
    try {
      const res = await fetch(`${API_BASE}/extract-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Fehler beim Laden');
      }
      const data = await res.json();
      if (onUrlImport) {
        onUrlImport(data);
      }
    } catch (err) {
      setUrlError(err.message);
    } finally {
      setUrlLoading(false);
    }
  }, [url, token, onGuestUrlImport, credits, onNeedsCredits, onUrlImport]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fade-in">
      <div className="bg-white rounded-[20px] p-5 md:p-8 border border-[#E8E0D4]">
        <p className="text-[#8C7E6A] text-center text-[13px] mb-4">Expos&eacute; hochladen, Link einf&uuml;gen oder manuell eingeben</p>

        {/* URL Import */}
        <div className="mb-5">
          <label className="text-[13px] font-medium text-[#5C4F3D] mb-2 block">Inserat-Link oder Expos&eacute;-Text einf&uuml;gen</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
              placeholder="https://www.kleinanzeigen.de/s-anzeige/..."
              className="flex-1 px-4 py-3 bg-[#FAF7F2] border border-[#E8E0D4] rounded-[12px] text-[14px] text-[#2C2418] placeholder-[#B5A68C] focus:border-[#7C8B6F] focus:outline-none focus:ring-2 focus:ring-[#7C8B6F]/10"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!url.trim() || urlLoading}
              className="px-5 py-3 bg-[#7C8B6F] text-white font-medium rounded-[12px] hover:bg-[#6B7A5E] transition-all text-[14px] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {urlLoading ? 'Lade...' : 'Importieren'}
            </button>
          </div>
          {urlError && <p className="text-[12px] text-[#B85C5C] mt-2">{urlError}</p>}
          <p className="text-[11px] text-[#B5A68C] mt-1.5">Kleinanzeigen Links funktionieren direkt. Bei ImmoScout24/Immowelt: Expos&eacute;-Text kopieren und einf&uuml;gen.</p>
        </div>

        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-[#E8E0D4]"></div>
          <span className="px-4 text-[12px] text-[#B5A68C] font-medium">oder</span>
          <div className="flex-1 border-t border-[#E8E0D4]"></div>
        </div>

        {/* PDF Upload */}
        <div
          className={`border-2 border-dashed rounded-[16px] p-4 md:p-8 text-center cursor-pointer transition-all duration-300
            ${isDragging ? 'border-[#7C8B6F] bg-[#7C8B6F]/5 scale-[1.02]' : 'border-[#E8E0D4] hover:border-[#B5A68C] hover:bg-[#FAF7F2]'}
            ${selectedFile ? 'border-[#7C8B6F] bg-[#7C8B6F]/5' : ''}`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleBrowseClick}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
          {selectedFile ? (
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-[#7C8B6F] rounded-[12px] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="font-medium text-[#2C2418] text-[15px]">{selectedFile.name}</p>
                <p className="text-[12px] text-[#8C7E6A] mt-0.5">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-[#F5F0E8] rounded-[12px] flex items-center justify-center border border-[#E8E0D4]">
                <svg className="w-6 h-6 text-[#B5A68C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              <div>
                <p className="font-medium text-[#2C2418] text-[15px]">PDF-Expos&eacute; hier ablegen</p>
                <p className="text-[12px] text-[#8C7E6A] mt-1">oder klicken zum Durchsuchen</p>
              </div>
            </div>
          )}
        </div>

        {selectedFile && (
          <button onClick={handleUploadClick} className="mt-6 w-full py-4 bg-[#7C8B6F] text-white font-semibold rounded-full text-[16px] hover:bg-[#6B7A5E] transition-all active:scale-[0.98]">
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Expos&eacute; analysieren
            </span>
          </button>
        )}

        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-[#E8E0D4]"></div>
          <span className="px-4 text-[12px] text-[#B5A68C] font-medium">oder</span>
          <div className="flex-1 border-t border-[#E8E0D4]"></div>
        </div>

        <button onClick={onManualEntry} className="w-full py-4 border border-[#E8E0D4] font-medium rounded-full text-[16px] text-[#5C4F3D] hover:bg-[#F5F0E8] transition-all">
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-[#B5A68C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Daten manuell eingeben
          </span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3 mt-3">
        {[
          { title: 'Transparent', desc: 'Nachvollziehbare Scores' },
          { title: 'Unabh\u00e4ngig', desc: 'Ohne Interessenskonflikte' },
          { title: 'KI-Powered', desc: 'Analyse in Sekunden' }
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-[10px] p-2 md:p-3 border border-[#E8E0D4] text-center">
            <h3 className="font-semibold text-[#2C2418] text-[11px] mb-0.5">{card.title}</h3>
            <p className="text-[9px] md:text-[11px] text-[#8C7E6A]">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FileUpload;
