import React, { useState, useRef, useCallback } from 'react';

function FileUpload({ onFileUpload, onManualEntry }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file && file.type === 'application/pdf') setSelectedFile(file); }, []);
  const handleFileSelect = useCallback((e) => { const file = e.target.files[0]; if (file) setSelectedFile(file); }, []);
  const handleUploadClick = useCallback(() => { if (selectedFile) onFileUpload(selectedFile); }, [selectedFile, onFileUpload]);
  const handleBrowseClick = useCallback(() => { fileInputRef.current?.click(); }, []);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fade-in">
      <div className="bg-white rounded-[20px] p-8 md:p-10 border border-[#E8E0D4]">
        <h2 className="text-[28px] font-bold text-[#2C2418] mb-2 text-center">Expose hochladen</h2>
        <p className="text-[#8C7E6A] text-center text-[14px] mb-8">Starten Sie mit der intelligenten Analyse</p>

        <div
          className={`border-2 border-dashed rounded-[16px] p-8 md:p-16 text-center cursor-pointer transition-all duration-300
            ${isDragging ? 'border-[#7C8B6F] bg-[#7C8B6F]/5 scale-[1.02]' : 'border-[#E8E0D4] hover:border-[#B5A68C] hover:bg-[#FAF7F2]'}
            ${selectedFile ? 'border-[#7C8B6F] bg-[#7C8B6F]/5' : ''}`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleBrowseClick}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
          {selectedFile ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-[#7C8B6F] rounded-[16px] flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="font-medium text-[#2C2418] text-[16px]">{selectedFile.name}</p>
                <p className="text-[13px] text-[#8C7E6A] mt-1">{formatFileSize(selectedFile.size)}</p>
              </div>
              <p className="text-[13px] text-[#7C8B6F]">Datei bereit - Klicken zum Andern</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-[#F5F0E8] rounded-[16px] flex items-center justify-center border border-[#E8E0D4]">
                <svg className="w-8 h-8 text-[#B5A68C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              <div>
                <p className="font-medium text-[#2C2418] text-[16px]">PDF-Expose hier ablegen</p>
                <p className="text-[13px] text-[#8C7E6A] mt-2">oder klicken zum Durchsuchen</p>
                <p className="text-[12px] text-[#B5A68C] mt-3">Maximal 10 MB - PDF-Format</p>
              </div>
            </div>
          )}
        </div>

        {selectedFile && (
          <button onClick={handleUploadClick} className="mt-8 w-full py-4 bg-[#7C8B6F] text-white font-semibold rounded-full text-[16px] hover:bg-[#6B7A5E] transition-all active:scale-[0.98]">
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Expose analysieren
            </span>
          </button>
        )}

        <div className="flex items-center my-10">
          <div className="flex-1 border-t border-[#E8E0D4]"></div>
          <span className="px-6 text-[13px] text-[#B5A68C] font-medium">oder</span>
          <div className="flex-1 border-t border-[#E8E0D4]"></div>
        </div>

        <button onClick={onManualEntry} className="w-full py-4 border border-[#E8E0D4] font-medium rounded-full text-[16px] text-[#5C4F3D] hover:bg-[#F5F0E8] transition-all">
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-[#B5A68C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Daten manuell eingeben
          </span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        {[
          { title: 'Transparente Regeln', desc: 'Klare Bewertungskriterien und nachvollziehbare Scores' },
          { title: 'Unabhangig', desc: 'Objektive Analyse ohne Interessenskonflikte' },
          { title: 'KI-Powered', desc: 'Intelligente Analyse in Sekundenschnelle' }
        ].map((card, i) => (
          <div key={i} className={`bg-white rounded-[16px] p-6 border border-[#E8E0D4] fade-in fade-in-delay-${i + 1}`}>
            <h3 className="font-semibold text-[#2C2418] mb-2 text-[16px]">{card.title}</h3>
            <p className="text-[13px] text-[#8C7E6A] leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FileUpload;
