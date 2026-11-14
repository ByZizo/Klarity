import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Folder,
  FolderPlus,
  Plus,
  Search,
  Trash2,
  Edit3,
  Download,
  Eye,
  X,
  UploadCloud,
  ChevronDown,
  LayoutGrid,
  List,
  Calendar,
  AlertCircle,
  Tag,
  ArrowUpDown,
  Check
} from 'lucide-react';
import { Button, Card, EmptyState, ConfirmDialog, Pill } from './ui';
import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  loadDocumentFolders,
  saveDocumentFolders,
  formatFileSize,
  DEFAULT_DOCUMENT_FOLDERS
} from '../utils/documentVaultStorage';

export default function DocumentVaultPage({ onShowToast, onDocumentsCountChange }) {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState(() => loadDocumentFolders());
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name' | 'size'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('klarity_vault_doc_view') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState(null);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');

  // Upload modal form state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDataUrl, setUploadDataUrl] = useState('');
  const [docName, setDocName] = useState('');
  const [docFolder, setDocFolder] = useState('Taxes');
  const [docNotes, setDocNotes] = useState('');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Load documents on mount
  useEffect(() => {
    let active = true;
    async function fetchDocs() {
      setIsLoading(true);
      try {
        const docs = await getAllDocuments();
        if (active) {
          setDocuments(docs || []);
          if (onDocumentsCountChange) onDocumentsCountChange(docs?.length || 0);
        }
      } catch (err) {
        console.error('Error loading documents:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    fetchDocs();
    return () => {
      active = false;
    };
  }, []);

  const notify = (msg, type = 'success') => {
    if (onShowToast) {
      onShowToast(msg, type);
    }
  };

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('klarity_vault_doc_view', mode);
    } catch {}
  };

  // Process chosen or dropped file
  const handleProcessFile = (file) => {
    if (!file) return;
    setUploadError('');

    // 35MB soft limit to ensure smooth memory management
    if (file.size > 35 * 1024 * 1024) {
      setUploadError('File is too large. Please select a document under 35 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadFile(file);
      setUploadDataUrl(e.target.result);
      if (!docName.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setDocName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    };
    reader.onerror = () => {
      setUploadError('Could not read the selected file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleSaveUpload = async (e) => {
    e.preventDefault();
    if (!uploadDataUrl || !uploadFile) {
      setUploadError('Please select or drop a file to upload.');
      return;
    }

    const title = docName.trim() || uploadFile.name;
    const targetFolder = docFolder.trim() || 'Other';

    setIsSaving(true);
    setUploadError('');

    try {
      const newDoc = {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: title,
        folder: targetFolder,
        fileName: uploadFile.name,
        fileType: uploadFile.type || 'application/octet-stream',
        fileSize: uploadFile.size,
        dataUrl: uploadDataUrl,
        notes: docNotes.trim(),
        date: docDate || new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString()
      };

      await saveDocument(newDoc);
      const updatedDocs = [newDoc, ...documents];
      setDocuments(updatedDocs);
      if (onDocumentsCountChange) onDocumentsCountChange(updatedDocs.length);

      // Add folder if it's new
      if (!folders.includes(targetFolder)) {
        const updatedFolders = Array.from(new Set([...folders, targetFolder]));
        setFolders(updatedFolders);
        saveDocumentFolders(updatedFolders);
      }

      notify(`Saved document "${title}"`);
      handleCloseUploadModal();
    } catch (err) {
      setUploadError(err.message || 'Failed to save document. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
    setUploadDataUrl('');
    setDocName('');
    setDocFolder(selectedFolder !== 'All' ? selectedFolder : (folders[0] || 'Taxes'));
    setDocNotes('');
    setUploadError('');
    setIsSaving(false);
  };

  // Edit document metadata (name, folder, notes)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;

    try {
      const updated = {
        ...editingDoc,
        updatedAt: new Date().toISOString()
      };
      await saveDocument(updated);

      const nextDocs = documents.map(d => d.id === updated.id ? updated : d);
      setDocuments(nextDocs);
      notify('Document updated');
      setEditingDoc(null);
    } catch {
      notify('Failed to update document', 'error');
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteConfirmDoc) return;
    try {
      await deleteDocument(deleteConfirmDoc.id);
      const nextDocs = documents.filter(d => d.id !== deleteConfirmDoc.id);
      setDocuments(nextDocs);
      if (onDocumentsCountChange) onDocumentsCountChange(nextDocs.length);
      notify(`Removed "${deleteConfirmDoc.name}"`);
    } catch {
      notify('Failed to delete document', 'error');
    } finally {
      setDeleteConfirmDoc(null);
    }
  };

  const handleDownload = (doc) => {
    if (!doc || !doc.dataUrl) return;
    try {
      const a = document.createElement('a');
      a.href = doc.dataUrl;
      a.download = doc.fileName || `${doc.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      notify(`Downloading ${doc.name}`);
    } catch {
      notify('Could not initiate download', 'error');
    }
  };

  const handleCreateNewFolder = (e) => {
    e.preventDefault();
    const clean = newFolderNameInput.trim();
    if (!clean) return;

    if (folders.some(f => f.toLowerCase() === clean.toLowerCase())) {
      notify('A folder with this name already exists', 'warning');
      return;
    }

    const nextFolders = [...folders, clean];
    setFolders(nextFolders);
    saveDocumentFolders(nextFolders);
    setSelectedFolder(clean);
    setIsNewFolderModalOpen(false);
    setNewFolderNameInput('');
    notify(`Created folder "${clean}"`);
  };

  const handleDeleteFolder = (folderName) => {
    if (DEFAULT_DOCUMENT_FOLDERS.includes(folderName)) {
      notify('Default folders cannot be deleted', 'warning');
      return;
    }
    const count = documents.filter(d => d.folder === folderName).length;
    if (count > 0) {
      notify(`Cannot delete folder containing ${count} document${count === 1 ? '' : 's'}. Move or delete documents first.`, 'warning');
      return;
    }
    const nextFolders = folders.filter(f => f !== folderName);
    setFolders(nextFolders);
    saveDocumentFolders(nextFolders);
    if (selectedFolder === folderName) setSelectedFolder('All');
    notify(`Removed folder "${folderName}"`);
  };

  // Helper to determine file icon and styling
  const getFileBadge = (fileType = '', fileName = '') => {
    const type = (fileType || '').toLowerCase();
    const name = (fileName || '').toLowerCase();

    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return {
        icon: FileText,
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        label: 'PDF'
      };
    }
    if (type.includes('image') || /\.(png|jpe?g|webp|svg|gif)$/i.test(name)) {
      return {
        icon: FileImage,
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-500/10 dark:bg-purple-500/20',
        label: 'IMAGE'
      };
    }
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv') || /\.(xlsx?|csv)$/i.test(name)) {
      return {
        icon: FileSpreadsheet,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        label: 'SPREADSHEET'
      };
    }
    return {
      icon: File,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      label: 'DOC'
    };
  };

  // Filtered and sorted documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    if (selectedFolder !== 'All') {
      result = result.filter(d => d.folder === selectedFolder);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(d =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.fileName && d.fileName.toLowerCase().includes(q)) ||
        (d.folder && d.folder.toLowerCase().includes(q)) ||
        (d.notes && d.notes.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0);
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'size') {
        return (b.fileSize || 0) - (a.fileSize || 0);
      }
      return 0;
    });

    return result;
  }, [documents, selectedFolder, searchQuery, sortBy]);

  // Compute folder counts
  const folderCounts = useMemo(() => {
    const counts = { All: documents.length };
    folders.forEach(f => {
      counts[f] = documents.filter(d => d.folder === f).length;
    });
    return counts;
  }, [documents, folders]);

  const totalBytes = useMemo(() => {
    return documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
  }, [documents]);

  return (
    <div className="flex flex-col gap-5">
      {/* Action and Filter Toolbar */}
      <Card className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <label htmlFor="doc-vault-search" className="sr-only">Search documents</label>
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="doc-vault-search"
            type="text"
            placeholder="Search by name, folder, notes, or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] pl-9 pr-8 py-1.5 text-[14px] text-[var(--ink)] placeholder-[var(--muted)] outline-none focus:border-[#1B4B91]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controls: Sort, View Layout, Add New Folder & Add Document */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[var(--surface-subtle)] px-2.5 py-1 rounded-[8px] border border-[var(--line)] text-[13px]">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--muted)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-[var(--ink)] font-medium outline-none cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name (A–Z)</option>
              <option value="size">File size</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[var(--surface-subtle)] p-0.5 rounded-[8px] border border-[var(--line)]">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              title="Grid view"
              className={`p-1.5 rounded-[6px] transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--surface)] text-[#1B4B91] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              title="List view"
              className={`p-1.5 rounded-[6px] transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[var(--surface)] text-[#1B4B91] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Create New Folder */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsNewFolderModalOpen(true)}
          >
            <FolderPlus className="w-4 h-4" />
            <span>New folder</span>
          </Button>

          {/* Upload Document Primary Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setDocFolder(selectedFolder !== 'All' ? selectedFolder : (folders[0] || 'Taxes'));
              setIsUploadModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Add document</span>
          </Button>
        </div>
      </Card>

      {/* Folders Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button
          type="button"
          onClick={() => setSelectedFolder('All')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all shrink-0 cursor-pointer border ${
            selectedFolder === 'All'
              ? 'bg-[#1B4B91] text-white border-[#1B4B91] shadow-xs'
              : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>All Documents</span>
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
            selectedFolder === 'All' ? 'bg-white/20 text-white' : 'bg-[var(--line)] text-[var(--ink)]'
          }`}>
            {folderCounts.All || 0}
          </span>
        </button>

        {folders.map(f => {
          const isSelected = selectedFolder === f;
          const isCustom = !DEFAULT_DOCUMENT_FOLDERS.includes(f);
          const count = folderCounts[f] || 0;

          return (
            <div key={f} className="flex items-center group shrink-0">
              <button
                type="button"
                onClick={() => setSelectedFolder(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1B4B91] text-white border-[#1B4B91] shadow-xs'
                    : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{f}</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[var(--line)] text-[var(--ink)]'
                }`}>
                  {count}
                </span>
              </button>

              {/* Delete empty custom folder button */}
              {isCustom && count === 0 && (
                <button
                  type="button"
                  title={`Delete empty folder "${f}"`}
                  onClick={() => handleDeleteFolder(f)}
                  className="ml-1 p-1 text-[var(--muted)] hover:text-rose-500 rounded-full hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Documents Content Canvas */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? 'No matching documents found' : selectedFolder !== 'All' ? `No documents in "${selectedFolder}"` : 'No documents in your vault'}
          description={
            searchQuery
              ? `We couldn't find any documents matching "${searchQuery}". Try a different keyword.`
              : 'Add receipts, tax filings, insurance policies, or legal deeds to keep them safe and organized.'
          }
          actionLabel="Upload document"
          onAction={() => {
            setDocFolder(selectedFolder !== 'All' ? selectedFolder : (folders[0] || 'Taxes'));
            setIsUploadModalOpen(true);
          }}
        />
      ) : viewMode === 'grid' ? (
        /* Grid View Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => {
            const badge = getFileBadge(doc.fileType, doc.fileName);
            const IconComp = badge.icon;

            return (
              <Card
                key={doc.id}
                className="p-4 flex flex-col justify-between hover:border-[#1B4B91]/50 hover:shadow-md transition-all group"
              >
                <div>
                  {/* Card Header: Badge & Quick Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className={`p-2.5 rounded-[10px] ${badge.bg} ${badge.color} shrink-0`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        title="Preview document"
                        className="p-1.5 rounded-[6px] text-[var(--muted)] hover:text-[#1B4B91] hover:bg-[var(--surface-subtle)] cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        title="Download file"
                        className="p-1.5 rounded-[6px] text-[var(--muted)] hover:text-[#1B4B91] hover:bg-[var(--surface-subtle)] cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDoc(doc)}
                        title="Edit details"
                        className="p-1.5 rounded-[6px] text-[var(--muted)] hover:text-[#1B4B91] hover:bg-[var(--surface-subtle)] cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmDoc(doc)}
                        title="Delete document"
                        className="p-1.5 rounded-[6px] text-[var(--muted)] hover:text-rose-500 hover:bg-[var(--surface-subtle)] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Document Title & File Details */}
                  <h3
                    onClick={() => setPreviewDoc(doc)}
                    title={doc.name}
                    className="font-semibold text-[15px] text-[var(--ink)] line-clamp-1 cursor-pointer hover:text-[#1B4B91]"
                  >
                    {doc.name}
                  </h3>
                  <p className="text-[12px] text-[var(--muted)] line-clamp-1 mt-0.5" title={doc.fileName}>
                    {doc.fileName || 'Document file'}
                  </p>

                  {/* Notes snippet if present */}
                  {doc.notes && (
                    <p className="text-[12px] text-[var(--muted)] bg-[var(--surface-subtle)] p-2 rounded-[6px] mt-2.5 line-clamp-2">
                      {doc.notes}
                    </p>
                  )}
                </div>

                {/* Card Footer: Folder Tag & File Meta */}
                <div className="pt-3 mt-3 border-t border-[var(--line)] flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--ink)]">
                    <Folder className="w-3 h-3 text-[#1B4B91]" />
                    <span>{doc.folder}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>•</span>
                    <span>{doc.date ? new Date(doc.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View Layout */
        <Card className="divide-y divide-[var(--line)] overflow-hidden">
          {filteredDocuments.map((doc) => {
            const badge = getFileBadge(doc.fileType, doc.fileName);
            const IconComp = badge.icon;

            return (
              <div
                key={doc.id}
                className="p-3.5 flex items-center justify-between gap-4 hover:bg-[var(--surface-subtle)] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-[8px] ${badge.bg} ${badge.color} shrink-0`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        onClick={() => setPreviewDoc(doc)}
                        className="font-semibold text-[14px] text-[var(--ink)] truncate cursor-pointer hover:text-[#1B4B91]"
                      >
                        {doc.name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--ink)] shrink-0 border border-[var(--line)]">
                        <Folder className="w-3 h-3 text-[#1B4B91]" />
                        <span>{doc.folder}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-[var(--muted)] truncate mt-0.5">
                      <span>{doc.fileName}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>Uploaded {doc.date ? new Date(doc.date).toLocaleDateString() : ''}</span>
                      {doc.notes && (
                        <>
                          <span>•</span>
                          <span className="italic truncate">{doc.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* List Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewDoc(doc)}
                    title="Preview document"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden md:inline">View</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingDoc(doc)}
                    title="Edit details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmDoc(doc)}
                    title="Delete document"
                    className="hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Footer Storage Usage Metric */}
      {documents.length > 0 && (
        <div className="flex items-center justify-between text-[12px] text-[var(--muted)] px-1 pt-1">
          <span>
            Showing {filteredDocuments.length} of {documents.length} document{documents.length === 1 ? '' : 's'}
          </span>
          <span>
            Total vault storage: <strong className="text-[var(--ink)]">{formatFileSize(totalBytes)}</strong>
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Upload Document Modal                                                     */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="fixed inset-0" onClick={handleCloseUploadModal} />
          <Card className="relative w-full max-w-lg p-6 shadow-2xl z-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2 text-[var(--ink)] font-semibold text-[17px]">
                <UploadCloud className="w-5 h-5 text-[#1B4B91]" />
                <span>Add Document to Vault</span>
              </div>
              <button
                type="button"
                onClick={handleCloseUploadModal}
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[13px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUpload} className="flex flex-col gap-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[12px] p-6 text-center cursor-pointer transition-all ${
                  isDraggingFile
                    ? 'border-[#1B4B91] bg-[#1B4B91]/5 scale-[1.01]'
                    : uploadFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-[var(--line)] hover:border-[#1B4B91] bg-[var(--surface-subtle)]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.txt,.csv,.xlsx,.doc,.docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleProcessFile(f);
                  }}
                  className="hidden"
                />

                {uploadFile ? (
                  <div className="flex flex-col items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-8 h-8" />
                    <span className="font-semibold text-[14px] text-[var(--ink)]">{uploadFile.name}</span>
                    <span className="text-[12px] text-[var(--muted)]">
                      {formatFileSize(uploadFile.size)} • Click to replace file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="w-9 h-9 text-[var(--muted)]" />
                    <div>
                      <span className="font-semibold text-[14px] text-[#1B4B91]">Click to browse</span>
                      <span className="text-[14px] text-[var(--muted)]"> or drag & drop document</span>
                    </div>
                    <span className="text-[12px] text-[var(--muted)]">
                      Supports PDF, PNG, JPG, Spreadsheets, and Text (up to 35 MB)
                    </span>
                  </div>
                )}
              </div>

              {/* Document Title */}
              <div>
                <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2025 W2 Tax Form, State Farm Auto Policy"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
                />
              </div>

              {/* Folder Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                    Folder / Category
                  </label>
                  <select
                    value={docFolder}
                    onChange={(e) => setDocFolder(e.target.value)}
                    className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91] cursor-pointer"
                  >
                    {folders.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                    Document Date / Tax Year
                  </label>
                  <input
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
                  />
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                  Notes / Policy Details (optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Policy #94821, renewal date Nov 2027, $500 deductible..."
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] p-3 text-[13px] text-[var(--ink)] placeholder-[var(--muted)] outline-none focus:border-[#1B4B91] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line)]">
                <Button type="button" variant="secondary" onClick={handleCloseUploadModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving || !uploadFile}>
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Encrypting & Saving...' : 'Save to Vault'}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Inline Document Preview Modal                                             */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col p-4 sm:p-6 items-center justify-center">
          <div className="fixed inset-0" onClick={() => setPreviewDoc(null)} />
          <div className="relative w-full max-w-5xl h-[88vh] bg-[var(--surface)] border border-[var(--line)] rounded-[16px] shadow-2xl z-10 flex flex-col overflow-hidden">
            {/* Modal Header Bar */}
            <div className="px-5 py-3.5 border-b border-[var(--line)] bg-[var(--surface-subtle)] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-[8px] bg-[#1B4B91]/10 text-[#1B4B91]">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-[16px] text-[var(--ink)] truncate">
                    {previewDoc.name}
                  </h2>
                  <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
                    <span>{previewDoc.fileName}</span>
                    <span>•</span>
                    <span>{previewDoc.folder}</span>
                    <span>•</span>
                    <span>{formatFileSize(previewDoc.fileSize)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload(previewDoc)}
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Frame Body */}
            <div className="flex-1 w-full bg-[#0a0a0c] overflow-auto flex items-center justify-center p-2">
              {previewDoc.fileType?.includes('pdf') || previewDoc.fileName?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.dataUrl}
                  title={previewDoc.name}
                  className="w-full h-full border-0 rounded-lg bg-white"
                />
              ) : previewDoc.fileType?.includes('image') || /\.(png|jpe?g|webp|svg|gif)$/i.test(previewDoc.fileName) ? (
                <img
                  src={previewDoc.dataUrl}
                  alt={previewDoc.name}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="p-8 text-center text-white flex flex-col items-center gap-3">
                  <File className="w-16 h-16 text-slate-400" />
                  <p className="text-lg font-medium">{previewDoc.name}</p>
                  <p className="text-sm text-slate-400">
                    Direct inline preview is not supported for this file type.
                  </p>
                  <Button variant="primary" onClick={() => handleDownload(previewDoc)}>
                    <Download className="w-4 h-4" />
                    <span>Download file to view</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Edit Document Metadata Modal                                              */}
      {/* ========================================================================= */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="fixed inset-0" onClick={() => setEditingDoc(null)} />
          <Card className="relative w-full max-w-md p-6 shadow-2xl z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <span className="font-semibold text-[16px] text-[var(--ink)]">Edit Document Details</span>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="text-[var(--muted)] hover:text-[var(--ink)] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5">
              <div>
                <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={editingDoc.name}
                  onChange={(e) => setEditingDoc({ ...editingDoc, name: e.target.value })}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                  Folder / Category
                </label>
                <select
                  value={editingDoc.folder}
                  onChange={(e) => setEditingDoc({ ...editingDoc, folder: e.target.value })}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91] cursor-pointer"
                >
                  {folders.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                  Notes / Details
                </label>
                <textarea
                  rows="3"
                  value={editingDoc.notes || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, notes: e.target.value })}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] p-2.5 text-[13px] text-[var(--ink)] outline-none focus:border-[#1B4B91] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line)]">
                <Button type="button" variant="secondary" onClick={() => setEditingDoc(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Create New Folder Modal                                                   */}
      {/* ========================================================================= */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="fixed inset-0" onClick={() => setIsNewFolderModalOpen(false)} />
          <Card className="relative w-full max-w-sm p-5 shadow-2xl z-10 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <span className="font-semibold text-[15px] text-[var(--ink)] flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-[#1B4B91]" />
                <span>Create New Folder</span>
              </span>
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--ink)] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewFolder} className="flex flex-col gap-3">
              <div>
                <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Estate Planning, Travel Passes, Warranty Cards"
                  value={newFolderNameInput}
                  onChange={(e) => setNewFolderNameInput(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsNewFolderModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Create Folder
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmDoc)}
        title="Delete Document"
        message={`Are you sure you want to permanently delete "${deleteConfirmDoc?.name}" from your vault? This cannot be undone.`}
        confirmLabel="Delete Document"
        variant="danger"
        onConfirm={handleDeleteDocument}
        onCancel={() => setDeleteConfirmDoc(null)}
      />
    </div>
  );
}
