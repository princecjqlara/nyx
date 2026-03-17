'use client';
import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { api } from '@/lib/api';

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    Papa.parse(f, {
      header: true,
      preview: 10,
      skipEmptyLines: true,
      complete: (results) => {
        setColumns(results.meta.fields || []);
        setPreview(results.data as Record<string, string>[]);
      },
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.txt'))) {
      handleFile(f);
    }
  }, [handleFile]);

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const text = await file.text();
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/leads/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, csvContent: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: `Successfully uploaded ${data.leadsCreated} leads and created ${data.tasksCreated} call tasks.` });
        setFile(null);
        setPreview([]);
        setColumns([]);
      } else {
        setResult({ success: false, message: data.error || 'Upload failed' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    }
    setUploading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Upload Leads</h1>
        <p className="page-subtitle">Import contacts from a CSV file to create call tasks automatically</p>
      </div>

      {result && (
        <div className="success-banner" style={result.success ? {} : { background: 'var(--accent-rose-glow)', borderColor: 'rgba(244,63,94,0.2)' }}>
          {result.success ? <CheckCircle /> : <AlertCircle style={{ color: 'var(--accent-rose)' }} />}
          <p style={result.success ? {} : { color: 'var(--accent-rose)' }}>{result.message}</p>
        </div>
      )}

      <div className="card fade-in">
        <div className="card-body">
          {!file ? (
            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <div className="upload-zone-icon">
                <Upload />
              </div>
              <div className="upload-zone-title">Drop your CSV file here</div>
              <div className="upload-zone-subtitle">or click to browse · supports .csv and .txt files</div>
            </div>
          ) : (
            <>
              <div className="preview-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="stat-icon indigo" style={{ width: '36px', height: '36px' }}>
                    <FileSpreadsheet style={{ width: '18px', height: '18px' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{file.name}</div>
                    <div className="preview-count">
                      Showing <strong>{preview.length}</strong> rows preview · {columns.length} columns detected
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setFile(null); setPreview([]); setColumns([]); }}>
                    Change File
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={uploadFile} disabled={uploading}>
                    {uploading ? <><span className="spinner"></span> Uploading...</> : <><Upload style={{ width: '14px', height: '14px' }} /> Upload & Create Tasks</>}
                  </button>
                </div>
              </div>

              <div className="preview-container">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        {columns.map(col => <th key={col}>{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i}>
                          {columns.map(col => <td key={col}>{row[col] || '—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card fade-in stagger-2" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <span className="card-title">CSV Format Guide</span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Your CSV should contain at least a <strong>name</strong> and <strong>phone</strong> column. Optional columns: <strong>email</strong>, <strong>company</strong>, <strong>notes</strong>.
          </p>
          <div className="transcript-box">
{`name,phone,email,company,notes
Maria Santos,+639171234567,maria@example.com,Santos Trading,Interested in premium
Juan dela Cruz,+639181234567,juan@example.com,Cruz Corp,Follow up`}
          </div>
        </div>
      </div>
    </div>
  );
}
