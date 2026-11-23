import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
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
  Check,
  KeyRound,
  PenTool
} from 'lucide-react';
import { Button, Card, EmptyState, ConfirmDialog, Pill, PaginationBar } from './ui';
const PdfEditorModal = React.lazy(() => import('./PdfEditorModal'));
import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  loadDocumentFolders,
  saveDocumentFolders,
  formatFileSize
} from '../utils/documentVaultStorage';

export default function DocumentVaultPage({
  onShowToast,
  onDocumentsCountChange,
  activeVaultSection = 'documents',
  onSelectVaultSection,
  passwordsCount = 0,
  localProfile = {},
  isLocalOnlyMode = false
}) {
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
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);

  // Upload modal form state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDataUrl, setUploadDataUrl] = useState('');
  const [docName, setDocName] = useState('');
  const [docFolder, setDocFolder] = useState('');
  const [newDocFolderInput, setNewDocFolderInput] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit modal custom folder state
  const [editingIsNewFolder, setEditingIsNewFolder] = useState(false);
  const [editingNewFolderInput, setEditingNewFolderInput] = useState('');
  const [editingNewFile, setEditingNewFile] = useState(null);

  const fileInputRef = useRef(null);
  const pdfFileInputRef = useRef(null);
  const [editingPdfDoc, setEditingPdfDoc] = useState(null);

  const handleOpenPdfFromDisk = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setEditingPdfDoc({
        id: `doc_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        fileSize: file.size,
        dataUrl: event.target.result,
        folder: selectedFolder !== 'All' ? selectedFolder : 'Financial'
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSavePdfToVault = async (editedDoc) => {
    await saveDocument(editedDoc);
    const updatedDocs = await getAllDocuments();
    setDocuments(updatedDocs || []);
    if (onDocumentsCountChange) onDocumentsCountChange(updatedDocs?.length || 0);
    notify('Document successfully saved to Vault!');
  };

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

  const handleOpenUploadModal = () => {
    if (selectedFolder !== 'All' && folders.includes(selectedFolder)) {
      setDocFolder(selectedFolder);
    } else if (folders.length > 0) {
      setDocFolder(folders[0]);
    } else {
      setDocFolder('__CREATE_NEW__');
    }
    setNewDocFolderInput('');
    setUploadError('');
    setIsUploadModalOpen(true);
  };

  const handleSaveUpload = async (e) => {
    e.preventDefault();
    if (!uploadDataUrl || !uploadFile) {
      setUploadError('Please select or drop a file to upload.');
      return;
    }

    if (docFolder === '__CREATE_NEW__' && !newDocFolderInput.trim()) {
      setUploadError('Please enter a name for the new folder.');
      return;
    }

    const title = docName.trim() || uploadFile.name;
    const targetFolder = (docFolder === '__CREATE_NEW__' ? newDocFolderInput.trim() : docFolder.trim()) || 'General';

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
    const defaultFolder = (selectedFolder !== 'All' && folders.includes(selectedFolder))
      ? selectedFolder
      : (folders[0] || '__CREATE_NEW__');
    setDocFolder(defaultFolder);
    setNewDocFolderInput('');
    setDocNotes('');
    setUploadError('');
    setIsSaving(false);
  };

  // Edit document metadata (name, folder, notes)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;

    if (editingIsNewFolder && !editingNewFolderInput.trim()) {
      notify('Please enter a name for the folder', 'warning');
      return;
    }

    try {
      const finalFolder = (editingIsNewFolder ? editingNewFolderInput.trim() : (editingDoc.folder || '')).trim() || 'General';
      const updated = {
        ...editingDoc,
        folder: finalFolder,
        updatedAt: new Date().toISOString()
      };
      await saveDocument(updated);

      if (!folders.includes(finalFolder)) {
        const nextFolders = Array.from(new Set([...folders, finalFolder]));
        setFolders(nextFolders);
        saveDocumentFolders(nextFolders);
      }

      const nextDocs = documents.map(d => d.id === updated.id ? updated : d);
      setDocuments(nextDocs);
      notify('Document updated');
      setEditingDoc(null);
      setEditingIsNewFolder(false);
      setEditingNewFolderInput('');
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

  // Compute folder counts & detailed stats
  const folderCounts = useMemo(() => {
    const counts = { All: documents.length };
    folders.forEach(f => {
      counts[f] = documents.filter(d => (d.folder || '').toLowerCase() === f.toLowerCase()).length;
    });
    return counts;
  }, [documents, folders]);

  const folderStats = useMemo(() => {
    const stats = {};
    folders.forEach(f => {
      const docsInFolder = documents.filter(d => (d.folder || '').toLowerCase() === f.toLowerCase());
      const totalSize = docsInFolder.reduce((sum, d) => sum + (d.fileSize || 0), 0);
      const sorted = [...docsInFolder].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
      stats[f] = {
        count: docsInFolder.length,
        size: totalSize,
        latestDate: sorted[0] ? (sorted[0].date || sorted[0].createdAt) : null,
        documents: docsInFolder
      };
    });
    return stats;
  }, [documents, folders]);

  const sortedFolders = useMemo(() => {
    const list = [...folders];
    list.sort((a, b) => {
      const statA = folderStats[a] || { count: 0, size: 0, latestDate: 0 };
      const statB = folderStats[b] || { count: 0, size: 0, latestDate: 0 };
      if (sortBy === 'name') {
        return a.localeCompare(b);
      }
      if (sortBy === 'size') {
        return statB.size - statA.size;
      }
      if (sortBy === 'oldest') {
        return new Date(statA.latestDate || 0) - new Date(statB.latestDate || 0);
      }
      return new Date(statB.latestDate || 0) - new Date(statA.latestDate || 0);
    });
    return list;
  }, [folders, folderStats, sortBy]);

  const unfiledDocuments = useMemo(() => {
    const known = new Set(folders.map(f => f.toLowerCase()));
    return filteredDocuments.filter(d => !d.folder || !known.has(d.folder.toLowerCase()));
  }, [filteredDocuments, folders]);

  const [docPageSize, setDocPageSize] = useState(36);

  const docFilterKey = `${selectedFolder}:${searchQuery}:${sortBy}:${filteredDocuments.length}:${docPageSize}`;
  const [docPageState, setDocPageState] = useState({ key: docFilterKey, page: 1 });
  const docPage = docPageState.key === docFilterKey ? docPageState.page : 1;
  const setDocPage = (nextPage) => setDocPageState({ key: docFilterKey, page: nextPage });

  const totalUnfiledPages = Math.max(1, Math.ceil(unfiledDocuments.length / docPageSize));
  const safeUnfiledPage = Math.min(docPage, totalUnfiledPages);
  const paginatedUnfiledDocuments = unfiledDocuments.slice(
    (safeUnfiledPage - 1) * docPageSize,
    safeUnfiledPage * docPageSize
  );

  const totalFilteredDocPages = Math.max(1, Math.ceil(filteredDocuments.length / docPageSize));
  const safeFilteredDocPage = Math.min(docPage, totalFilteredDocPages);
  const paginatedFilteredDocuments = filteredDocuments.slice(
    (safeFilteredDocPage - 1) * docPageSize,
    safeFilteredDocPage * docPageSize
  );

  const totalBytes = useMemo(() => {
    return documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
  }, [documents]);

  const renderDocumentCard = (doc) => {
    const badge = getFileBadge(doc.fileType, doc.fileName);
    const IconComp = badge.icon;

    return (
      <Card
        key={doc.id}
        className="klarity-virtual-row p-4 flex flex-col justify-between hover:border-[#1B4B91]/50 hover:shadow-md transition-all group"
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
              {(doc.fileType?.includes('pdf') || doc.fileName?.toLowerCase().endsWith('.pdf')) && (
                <button
                  type="button"
                  onClick={() => setEditingPdfDoc(doc)}
                  title="Open in PDF Editor"
                  className="p-1.5 rounded-[6px] text-[#1B4B91] hover:bg-[#1B4B91]/10 cursor-pointer"
                >
                  <PenTool className="w-4 h-4" />
                </button>
              )}
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
                onClick={() => {
                  setEditingDoc(doc);
                  setEditingIsNewFolder(false);
                  setEditingNewFolderInput('');
                }}
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
          <span
            className="inline-flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-[6px] bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-[11px] cursor-pointer hover:bg-amber-500/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFolder(doc.folder);
            }}
            title={`View folder "${doc.folder}"`}
          >
            <Folder className="w-3.5 h-3.5 fill-amber-400 text-amber-600 dark:fill-amber-500 dark:text-amber-400" />
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
  };

  const renderDocumentRow = (doc) => {
    const badge = getFileBadge(doc.fileType, doc.fileName);
    const IconComp = badge.icon;

    return (
      <div
        key={doc.id}
        className="klarity-virtual-row p-3.5 flex items-center justify-between gap-4 hover:bg-[var(--surface-subtle)] transition-colors group"
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
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 shrink-0 cursor-pointer hover:bg-amber-500/20 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFolder(doc.folder);
                }}
                title={`View folder "${doc.folder}"`}
              >
                <Folder className="w-3.5 h-3.5 fill-amber-400 text-amber-600 dark:fill-amber-500 dark:text-amber-400" />
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
          {(doc.fileType?.includes('pdf') || doc.fileName?.toLowerCase().endsWith('.pdf')) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingPdfDoc(doc)}
              title="Open in PDF Editor"
              className="text-[#1B4B91] hover:bg-[#1B4B91]/10"
            >
              <PenTool className="w-4 h-4" />
              <span className="hidden md:inline">Edit</span>
            </Button>
          )}
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
            onClick={() => {
              setEditingDoc(doc);
              setEditingIsNewFolder(false);
              setEditingNewFolderInput('');
            }}
            title="Edit details"
          >
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteConfirmDoc(doc)}
            title="Delete document"
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderFolderCard = (folderName) => {
    const stat = folderStats[folderName] || { count: 0, size: 0, latestDate: null };

    return (
      <Card
        key={`folder-card-${folderName}`}
        onClick={() => setSelectedFolder(folderName)}
        className="p-5 flex flex-col justify-between hover:border-amber-500/60 hover:shadow-lg transition-all cursor-pointer group bg-[var(--surface)] relative overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Large Amber Folder Icon */}
          <div className="w-12 h-12 rounded-[12px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all shadow-xs">
            <Folder className="w-7 h-7 fill-amber-400 text-amber-600 dark:fill-amber-500 dark:text-amber-300" />
          </div>

          {/* Folder Quick Actions */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setDocFolder(folderName);
                setNewDocFolderInput('');
                setUploadError('');
                setIsUploadModalOpen(true);
              }}
              title={`Add document to ${folderName}`}
              className="p-1.5 rounded-[6px] text-[var(--muted)] hover:text-[#1B4B91] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            {stat.count === 0 && (
              <button
                type="button"
                onClick={() => handleDeleteFolder(folderName)}
                title={`Delete empty folder "${folderName}"`}
                className="p-1.5 rounded-[6px] text-[var(--muted)] hover:text-rose-500 hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-[16px] text-[var(--ink)] group-hover:text-[#1B4B91] transition-colors truncate">
            {folderName}
          </h3>
          <p className="text-[12px] text-[var(--muted)] mt-1 flex items-center gap-1.5">
            <span>{stat.count} document{stat.count === 1 ? '' : 's'}</span>
            {stat.size > 0 && (
              <>
                <span>•</span>
                <span>{formatFileSize(stat.size)}</span>
              </>
            )}
          </p>
        </div>

        <div className="pt-3 mt-3 border-t border-[var(--line)] flex items-center justify-between text-[11px] text-[var(--muted)]">
          <span className="text-[#1B4B91] font-medium group-hover:underline flex items-center gap-1">
            <span>Open folder</span>
            <span className="text-[13px]">→</span>
          </span>
          {stat.latestDate && (
            <span>{new Date(stat.latestDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
        </div>
      </Card>
    );
  };

  const renderFolderRow = (folderName) => {
    const stat = folderStats[folderName] || { count: 0, size: 0, latestDate: null };

    return (
      <div
        key={`folder-row-${folderName}`}
        onClick={() => setSelectedFolder(folderName)}
        className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-[10px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-all shrink-0 shadow-xs">
            <Folder className="w-5 h-5 fill-amber-400 text-amber-600 dark:fill-amber-500 dark:text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[15px] text-[var(--ink)] group-hover:text-[#1B4B91] transition-colors truncate">
                {folderName}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                {stat.count} document{stat.count === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[var(--muted)] truncate mt-0.5">
              <span>Folder</span>
              {stat.size > 0 && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(stat.size)}</span>
                </>
              )}
              {stat.latestDate && (
                <>
                  <span>•</span>
                  <span>Updated {new Date(stat.latestDate).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedFolder(folderName)}
          >
            <span>Open</span>
            <span className="text-[13px]">→</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDocFolder(folderName);
              setNewDocFolderInput('');
              setUploadError('');
              setIsUploadModalOpen(true);
            }}
            title={`Add document to ${folderName}`}
          >
            <Plus className="w-4 h-4" />
          </Button>
          {stat.count === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteFolder(folderName)}
              title={`Delete empty folder "${folderName}"`}
              className="text-rose-500 hover:text-rose-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Action and Filter Toolbar */}
      <Card className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Compact Icon Switcher (Passwords / Documents) & Flexible Search Bar */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {onSelectVaultSection && (
            <div className="flex items-center bg-[var(--surface-subtle)] p-1 rounded-[10px] border border-[var(--line)] shrink-0">
              <button
                type="button"
                onClick={() => onSelectVaultSection('passwords')}
                title={`Passwords (${passwordsCount})`}
                aria-label={`Passwords (${passwordsCount})`}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-[8px] font-medium text-[13px] transition-all cursor-pointer ${
                  activeVaultSection === 'passwords'
                    ? 'bg-[var(--surface)] text-[#1B4B91] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span className={`text-[11px] min-w-[18px] text-center px-1.5 py-0.5 rounded-full font-semibold leading-none ${
                  activeVaultSection === 'passwords'
                    ? 'bg-[#1B4B91]/15 text-[#1B4B91]'
                    : 'bg-[var(--line)] text-[var(--muted)]'
                }`}>
                  {passwordsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectVaultSection('documents')}
                title={`Documents (${documents.length})`}
                aria-label={`Documents (${documents.length})`}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-[8px] font-medium text-[13px] transition-all cursor-pointer ${
                  activeVaultSection === 'documents'
                    ? 'bg-[var(--surface)] text-[#1B4B91] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className={`text-[11px] min-w-[18px] text-center px-1.5 py-0.5 rounded-full font-semibold leading-none ${
                  activeVaultSection === 'documents'
                    ? 'bg-[#1B4B91]/15 text-[#1B4B91]'
                    : 'bg-[var(--line)] text-[var(--muted)]'
                }`}>
                  {documents.length}
                </span>
              </button>
            </div>
          )}

          {/* Search Bar (Flexible Width) */}
          <div className="relative flex-1 min-w-[160px]">
            <label htmlFor="doc-vault-search" className="sr-only">Search documents</label>
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="doc-vault-search"
              type="text"
              placeholder="Search documents by name, folder, or notes..."
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
        </div>

        {/* Right: Sort Dropdown, View Toggles & Primary Action Button */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
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

          {/* PDF Editor File Picker & Button */}
          <input
            type="file"
            ref={pdfFileInputRef}
            accept="application/pdf"
            className="hidden"
            onChange={handleOpenPdfFromDisk}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => pdfFileInputRef.current?.click()}
            title="Open any PDF in the built-in PDF Editor"
            className="hidden sm:inline-flex items-center gap-1.5 border-[var(--line)] hover:border-[#1B4B91]/50 text-[var(--ink)]"
          >
            <PenTool className="w-4 h-4 text-[#1B4B91]" />
            <span>PDF Editor</span>
          </Button>

          {/* Upload Document Primary Button (Anchored Prominently on the Far Right) */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenUploadModal}
          >
            <Plus className="w-4 h-4" />
            <span>Add document</span>
          </Button>
        </div>
      </Card>

      {/* Folder Selection Bar / Dropdown Menu */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Dropdown Menu for All Documents / Folders */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-[10px] text-[13px] font-medium border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-amber-500/40 shadow-xs cursor-pointer transition-all"
            >
              <Folder className={`w-4 h-4 shrink-0 ${selectedFolder === 'All' ? 'text-blue-500 fill-blue-500/30' : 'text-amber-500 fill-amber-400'}`} />
              <span className="font-semibold">
                {selectedFolder === 'All' ? 'All Documents' : selectedFolder}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                selectedFolder === 'All'
                  ? 'bg-[#1B4B91]/15 text-[#1B4B91]'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              }`}>
                {selectedFolder === 'All' ? (folderCounts.All || 0) : (folderCounts[selectedFolder] || 0)}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-[var(--muted)] transition-transform ${isFolderDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFolderDropdownOpen && (() => {
              const hasDeletableFolder = folders.some((f) => (folderCounts[f] || 0) === 0);
              return (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsFolderDropdownOpen(false)}
                />
                <Card padding="p-0" className="absolute left-0 top-full mt-1.5 w-64 py-1.5 z-40 flex flex-col shadow-xl border border-[var(--line)]">
                  <div className="px-3 py-1.5 border-b border-[var(--line)] flex items-center justify-between text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                    <span>Select Folder</span>
                    <span>{folders.length} folder{folders.length === 1 ? '' : 's'}</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto flex flex-col gap-0.5 px-1.5 py-1">
                    {/* All Documents Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFolder('All');
                        setIsFolderDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-[8px] text-[13px] font-medium flex items-center justify-between text-left cursor-pointer transition-colors ${
                        selectedFolder === 'All'
                          ? 'bg-[#1B4B91]/10 text-[#1B4B91]'
                          : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedFolder === 'All' ? (
                          <Check className="w-3.5 h-3.5 text-[#1B4B91] shrink-0" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-blue-500 fill-blue-500/30 shrink-0" />
                        )}
                        <span className="truncate">All Documents</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[var(--surface-subtle)] text-[var(--muted)] min-w-[26px] text-center tabular-nums">
                          {folderCounts.All || 0}
                        </span>
                        {hasDeletableFolder && <span className="w-5 h-5 shrink-0" aria-hidden="true" />}
                      </div>
                    </button>

                    {/* Each Folder Option */}
                    {folders.map(f => {
                      const isSelected = selectedFolder === f;
                      const count = folderCounts[f] || 0;
                      return (
                        <div
                          key={f}
                          className={`w-full px-3 py-2 rounded-[8px] text-[13px] font-medium flex items-center justify-between text-left cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#1B4B91]/10 text-[#1B4B91]'
                              : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                          }`}
                          onClick={() => {
                            setSelectedFolder(f);
                            setIsFolderDropdownOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-[#1B4B91] shrink-0" />
                            ) : (
                              <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                            )}
                            <span className="truncate">{f}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[var(--surface-subtle)] text-[var(--muted)] min-w-[26px] text-center tabular-nums">
                              {count}
                            </span>
                            {hasDeletableFolder && (
                              count === 0 ? (
                                <button
                                  type="button"
                                  title={`Delete empty folder "${f}"`}
                                  onClick={() => handleDeleteFolder(f)}
                                  className="w-5 h-5 flex items-center justify-center text-[var(--muted)] hover:text-rose-500 rounded transition-colors cursor-pointer shrink-0"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              ) : (
                                <span className="w-5 h-5 shrink-0" aria-hidden="true" />
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-1.5 mt-1 border-t border-[var(--line)] px-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-[#1B4B91]"
                      onClick={() => {
                        setIsFolderDropdownOpen(false);
                        setIsNewFolderModalOpen(true);
                      }}
                    >
                      <FolderPlus className="w-4 h-4 text-amber-500" />
                      <span>Create new folder</span>
                    </Button>
                  </div>
                </Card>
              </>
              );
            })()}
          </div>

          {/* Breadcrumb / Back button if inside a folder */}
          {selectedFolder !== 'All' && (
            <button
              type="button"
              onClick={() => setSelectedFolder('All')}
              className="text-[13px] text-[#1B4B91] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>← Back to All Documents</span>
            </button>
          )}
        </div>

        {/* Right side New Folder Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsNewFolderModalOpen(true)}
          className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
        >
          <FolderPlus className="w-4 h-4 text-amber-500" />
          <span>New folder</span>
        </Button>
      </div>

      {/* Active Folder Header Banner */}
      {selectedFolder !== 'All' && (
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface-subtle)] border-l-4 border-l-amber-500 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[10px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
              <Folder className="w-6 h-6 fill-amber-400 text-amber-600 dark:fill-amber-500 dark:text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-[17px] text-[var(--ink)]">{selectedFolder}</h2>
                <span className="text-[12px] px-2 py-0.5 rounded-full font-medium bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]">
                  {folderCounts[selectedFolder] || 0} document{(folderCounts[selectedFolder] || 0) === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-[12px] text-[var(--muted)]">Folder • Document Vault</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setDocFolder(selectedFolder);
                setNewDocFolderInput('');
                setUploadError('');
                setIsUploadModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Add document to {selectedFolder}</span>
            </Button>
            {folderCounts[selectedFolder] === 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDeleteFolder(selectedFolder)}
                className="text-rose-500 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete folder</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Main Documents Content Canvas */}
      {selectedFolder === 'All' && !searchQuery.trim() ? (
        /* Root / All Documents View: Grouped into Folders */
        folders.length === 0 && documents.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No documents in your vault"
            description="Add receipts, tax filings, insurance policies, or legal deeds to keep them safe and organized."
            actionLabel="Upload document"
            onAction={handleOpenUploadModal}
          />
        ) : folders.length > 0 ? (
          <div className="flex flex-col gap-6">
            {/* Folders Grid / List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedFolders.map(renderFolderCard)}
                {paginatedUnfiledDocuments.map(renderDocumentCard)}
              </div>
            ) : (
              <Card className="divide-y divide-[var(--line)] overflow-hidden">
                {sortedFolders.map(renderFolderRow)}
                {paginatedUnfiledDocuments.map(renderDocumentRow)}
              </Card>
            )}
            {unfiledDocuments.length > docPageSize && (
              <Card padding="p-0" className="mt-4 overflow-hidden">
                <PaginationBar
                  totalItems={unfiledDocuments.length}
                  pageSize={docPageSize}
                  currentPage={safeUnfiledPage}
                  onPageChange={setDocPage}
                  onPageSizeChange={(size) => {
                    setDocPageSize(size);
                    setDocPage(1);
                  }}
                  pageSizeOptions={[24, 36, 72]}
                  itemLabel="documents"
                />
              </Card>
            )}
          </div>
        ) : (
          /* Folders empty, but documents exist without folders */
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedFilteredDocuments.map(renderDocumentCard)}
              </div>
            ) : (
              <Card className="divide-y divide-[var(--line)] overflow-hidden">
                {paginatedFilteredDocuments.map(renderDocumentRow)}
              </Card>
            )}
            {filteredDocuments.length > docPageSize && (
              <Card padding="p-0" className="mt-4 overflow-hidden">
                <PaginationBar
                  totalItems={filteredDocuments.length}
                  pageSize={docPageSize}
                  currentPage={safeFilteredDocPage}
                  onPageChange={setDocPage}
                  onPageSizeChange={(size) => {
                    setDocPageSize(size);
                    setDocPage(1);
                  }}
                  pageSizeOptions={[24, 36, 72]}
                  itemLabel="documents"
                />
              </Card>
            )}
          </>
        )
      ) : (
        /* Specific Folder View OR Active Search View */
        filteredDocuments.length === 0 ? (
          <EmptyState
            icon={Folder}
            title={searchQuery ? 'No matching documents found' : `No documents in "${selectedFolder}"`}
            description={
              searchQuery
                ? `We couldn't find any documents matching "${searchQuery}". Try a different keyword.`
                : `This folder is currently empty. Click below to add documents into "${selectedFolder}".`
            }
            actionLabel={selectedFolder !== 'All' ? `Add document to ${selectedFolder}` : 'Upload document'}
            onAction={handleOpenUploadModal}
          />
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedFilteredDocuments.map(renderDocumentCard)}
              </div>
            ) : (
              <Card className="divide-y divide-[var(--line)] overflow-hidden">
                {paginatedFilteredDocuments.map(renderDocumentRow)}
              </Card>
            )}
            {filteredDocuments.length > docPageSize && (
              <Card padding="p-0" className="mt-4 overflow-hidden">
                <PaginationBar
                  totalItems={filteredDocuments.length}
                  pageSize={docPageSize}
                  currentPage={safeFilteredDocPage}
                  onPageChange={setDocPage}
                  onPageSizeChange={(size) => {
                    setDocPageSize(size);
                    setDocPage(1);
                  }}
                  pageSizeOptions={[24, 36, 72]}
                  itemLabel="documents"
                />
              </Card>
            )}
          </>
        )
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
                    onChange={(e) => {
                      setDocFolder(e.target.value);
                      if (e.target.value === '__CREATE_NEW__') {
                        setNewDocFolderInput('');
                      }
                    }}
                    className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91] cursor-pointer"
                  >
                    {folders.map(f => (
                      <option key={f} value={f}>📁 {f}</option>
                    ))}
                    {folders.length > 0 && <option disabled>──────────</option>}
                    <option value="__CREATE_NEW__">📁+ Create new folder...</option>
                  </select>

                  {docFolder === '__CREATE_NEW__' && (
                    <div className="mt-2 relative">
                      <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 fill-amber-400" />
                      <input
                        type="text"
                        autoFocus
                        required
                        placeholder="Enter new folder name (e.g. Taxes, Leases)..."
                        value={newDocFolderInput}
                        onChange={(e) => setNewDocFolderInput(e.target.value)}
                        className="w-full bg-[var(--surface-subtle)] border border-amber-500/50 rounded-[8px] pl-9 pr-3.5 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
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
                {(previewDoc.fileType?.includes('pdf') || previewDoc.fileName?.toLowerCase().endsWith('.pdf')) && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const doc = previewDoc;
                      setPreviewDoc(null);
                      setEditingPdfDoc(doc);
                    }}
                    title="Open and annotate in Klarity PDF Editor"
                    className="bg-[#1B4B91] hover:bg-[#2563eb]"
                  >
                    <PenTool className="w-4 h-4" />
                    <span>Edit PDF</span>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload(previewDoc)}
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const doc = previewDoc;
                    setPreviewDoc(null);
                    setEditingDoc(doc);
                    setEditingIsNewFolder(false);
                    setEditingNewFolderInput('');
                    setEditingNewFile(null);
                  }}
                  title="Edit details"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const doc = previewDoc;
                    setPreviewDoc(null);
                    setDeleteConfirmDoc(doc);
                  }}
                  title="Delete document"
                  className="hover:text-rose-500 hover:border-rose-300"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span className="hidden sm:inline text-rose-500">Delete</span>
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
            <div className="flex-1 w-full bg-[var(--surface-subtle)] dark:bg-[#0a0a0c] overflow-auto flex items-center justify-center p-2">
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
                  loading="lazy"
                  decoding="async"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="p-8 text-center text-[var(--ink)] flex flex-col items-center gap-3">
                  <File className="w-16 h-16 text-[var(--muted)]" />
                  <p className="text-lg font-medium">{previewDoc.name}</p>
                  <p className="text-sm text-[var(--muted)]">
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
                  value={editingIsNewFolder ? '__CREATE_NEW__' : (editingDoc.folder || (folders[0] || '__CREATE_NEW__'))}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setEditingIsNewFolder(true);
                      setEditingNewFolderInput('');
                    } else {
                      setEditingIsNewFolder(false);
                      setEditingDoc({ ...editingDoc, folder: e.target.value });
                    }
                  }}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91] cursor-pointer"
                >
                  {Array.from(new Set([...folders, editingDoc.folder].filter(Boolean))).map(f => (
                    <option key={f} value={f}>📁 {f}</option>
                  ))}
                  {folders.length > 0 && <option disabled>──────────</option>}
                  <option value="__CREATE_NEW__">📁+ Create new folder...</option>
                </select>

                {editingIsNewFolder && (
                  <div className="mt-2 relative">
                    <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 fill-amber-400" />
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Enter new folder name..."
                      value={editingNewFolderInput}
                      onChange={(e) => {
                        setEditingNewFolderInput(e.target.value);
                        setEditingDoc({ ...editingDoc, folder: e.target.value });
                      }}
                      className="w-full bg-[var(--surface-subtle)] border border-amber-500/50 rounded-[8px] pl-9 pr-3.5 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div className="p-2.5 rounded-[8px] bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5 text-[12px] text-amber-800 dark:text-amber-300 font-medium truncate">
                    <Folder className="w-3.5 h-3.5 fill-amber-400 text-amber-600 shrink-0" />
                    <span className="truncate">In folder: <strong>{editingIsNewFolder ? (editingNewFolderInput || 'New folder') : (editingDoc.folder || 'General')}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const f = editingIsNewFolder ? editingNewFolderInput.trim() : (editingDoc.folder || '');
                      setEditingDoc(null);
                      setDocFolder(f || folders[0] || '__CREATE_NEW__');
                      setNewDocFolderInput('');
                      setUploadError('');
                      setIsUploadModalOpen(true);
                    }}
                    className="text-[12px] text-[#1B4B91] hover:underline font-semibold cursor-pointer shrink-0"
                  >
                    + Add document to this folder
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                  Attached File
                </label>
                <label className="flex items-center justify-between p-2.5 bg-[var(--surface-subtle)] border border-[var(--line)] hover:border-[#1B4B91] rounded-[8px] cursor-pointer transition-colors text-[13px]">
                  <div className="flex items-center gap-2 text-[var(--muted)] truncate">
                    <UploadCloud className="w-4 h-4 text-[#1B4B91] shrink-0" />
                    <span className="truncate">{editingNewFile ? editingNewFile.name : `${editingDoc.fileName || 'Attached file'} (${formatFileSize(editingDoc.fileSize)})`}</span>
                  </div>
                  <span className="text-[12px] font-medium text-[#1B4B91] shrink-0">Replace</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.txt,.csv,.xlsx,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setEditingNewFile(f);
                          setEditingDoc(prev => ({
                            ...prev,
                            fileName: f.name,
                            fileType: f.type || 'application/octet-stream',
                            fileSize: f.size,
                            dataUrl: ev.target.result
                          }));
                        };
                        reader.readAsDataURL(f);
                      }
                    }}
                  />
                </label>
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
              {/* Visual Folder Logo Preview */}
              <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-[12px]">
                <div className="w-12 h-12 rounded-[10px] bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
                  <Folder className="w-7 h-7 fill-amber-400 text-amber-600 dark:fill-amber-500 dark:text-amber-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[15px] text-[var(--ink)] truncate">
                    {newFolderNameInput.trim() || 'New Folder'}
                  </p>
                  <p className="text-[12px] text-[var(--muted)]">Folder • Document Vault</p>
                </div>
              </div>

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
        open={Boolean(deleteConfirmDoc)}
        isOpen={Boolean(deleteConfirmDoc)}
        title="Delete Document"
        message={`Are you sure you want to permanently delete "${deleteConfirmDoc?.name}" from your vault? This cannot be undone.`}
        confirmLabel="Delete Document"
        variant="danger"
        onConfirm={handleDeleteDocument}
        onCancel={() => setDeleteConfirmDoc(null)}
      />

      {/* Full-featured PDF Editor Modal */}
      {editingPdfDoc && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[100] bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center text-[15px]">
              Loading PDF Editor...
            </div>
          }
        >
          <PdfEditorModal
            isOpen={Boolean(editingPdfDoc)}
            onClose={() => setEditingPdfDoc(null)}
            initialDocument={editingPdfDoc}
            onSaveToVault={handleSavePdfToVault}
            onShowToast={notify}
            localProfile={localProfile}
            isLocalOnlyMode={isLocalOnlyMode}
          />
        </Suspense>
      )}
    </div>
  );
}
