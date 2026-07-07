import React, { useRef } from 'react';

interface TranscriptUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export const TranscriptUploader: React.FC<TranscriptUploaderProps> = ({ file, onFileChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) return;

    const ext = selected.name.toLowerCase();
    if (!ext.endsWith('.txt') && !ext.endsWith('.pdf')) {
      return; // accept attribute already restricts this, but guard anyway
    }
    onFileChange(selected);
  };

  const handleRemove = () => {
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    const ext = dropped.name.toLowerCase();
    if (!ext.endsWith('.txt') && !ext.endsWith('.pdf')) return;
    onFileChange(dropped);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf"
        onChange={handleFileSelect}
        className="hidden"
        id="transcript-file-input"
      />

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="
            flex flex-col items-center justify-center gap-3
            border-2 border-dashed border-accent/40 rounded-xl p-10
            cursor-pointer text-center
            hover:border-accent hover:bg-accent/5
            transition-all duration-200
          "
        >
          <span className="text-4xl">📂</span>
          <div>
            <p className="text-sm font-medium text-text-primary">
              Click to browse or drag & drop
            </p>
            <p className="text-xs text-text-muted mt-1">
              Supports <span className="font-semibold">.txt</span> and{' '}
              <span className="font-semibold">.pdf</span> files
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="btn-primary text-sm py-2 px-4 mt-1"
          >
            Browse Files
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-accent/30">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">
              {file.name.endsWith('.pdf') ? '📕' : '📄'}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
              <p className="text-xs text-text-muted">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="ml-3 flex-shrink-0 w-7 h-7 rounded-full bg-surface flex items-center justify-center
                       text-text-muted hover:text-danger hover:bg-danger/10 transition-colors text-sm"
            title="Remove file"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
