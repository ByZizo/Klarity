import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Bookmark,
  Search,
  MessageSquare,
  Paperclip,
  RotateCw,
  Download,
  Plus,
  Send,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { REDACTION_PATTERN_PRESETS, renderPdfPageToCanvas } from '../../utils/pdfEditorEngine';
import { formatFileSize } from '../../utils/documentVaultStorage';

function PdfThumbnailCanvas({ pdfJsDoc, sourcePageNumber, rotationOffset = 0, cropBox = null }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!pdfJsDoc || !canvasRef.current || !sourcePageNumber) return;
    let active = true;
    const targetCanvas = canvasRef.current;

    renderPdfPageToCanvas(
      pdfJsDoc,
      sourcePageNumber,
      targetCanvas,
      0.2,
      rotationOffset,
      cropBox,
      true
    ).catch((err) => {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn(`Thumbnail render error p.${sourcePageNumber}:`, err);
      }
    });

    return () => {
      active = false;
      if (targetCanvas?.__activeRenderTask && !active) {
        try {
          targetCanvas.__activeRenderTask.cancel();
        } catch {}
      }
    };
  }, [pdfJsDoc, sourcePageNumber, rotationOffset, cropBox]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full max-h-full w-auto h-auto object-contain block bg-white"
    />
  );
}

export default function PdfLeftSidebar({
  activeTab,
  onSelectTab,
  visiblePages = [],
  currentPage = 1,
  onSelectPage,
  pageOrder = [],
  pdfJsDoc = null,
  annotations = {},
  outline = [],
  searchQuery = '',
  setSearchQuery,
  searchIsRegex = false,
  setSearchIsRegex,
  searchResults = [],
  isSearching = false,
  onRunSearch,
  onRunPatternSearch,
  onMarkSearchAsRedactions,
  commentsList = [],
  onReplyComment,
  onSelectComment,
  attachments = [],
  onAddAttachmentFile,
  onDownloadAttachment,
  onRemoveAttachment,
  localProfileName = 'Local User',
  readOnlyLocked = false
}) {
  const [replyDrafts, setReplyDrafts] = useState({});

  const tabs = [
    { id: 'thumbnails', label: 'Pages', icon: FileText },
    { id: 'outline', label: 'Outline', icon: Bookmark },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'comments', label: 'Comments', icon: MessageSquare, count: commentsList.length },
    { id: 'attachments', label: 'Files', icon: Paperclip, count: attachments.length }
  ];

  const renderOutlineTree = (nodes, depth = 0) => {
    if (!nodes || nodes.length === 0) return null;
    return (
      <div className="flex flex-col gap-0.5">
        {nodes.map((node, idx) => (
          <div key={`${depth}_${idx}_${node.title}`}>
            <button
              type="button"
              onClick={() => {
                if (node.pageNumber) onSelectPage(node.pageNumber);
              }}
              style={{ paddingLeft: `${10 + depth * 12}px` }}
              className="w-full py-2 pr-2.5 rounded-lg text-left text-[13px] text-[var(--ink)] hover:bg-[var(--surface-hover)] flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <span className="truncate flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                <span className="truncate">{node.title}</span>
              </span>
              {node.pageNumber && (
                <span className="text-[12px] text-[var(--muted)] tabular-nums shrink-0">
                  p.{node.pageNumber}
                </span>
              )}
            </button>
            {node.items?.length > 0 && renderOutlineTree(node.items, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <aside
      aria-label="Document Navigation Sidebar"
      className="w-48 sm:w-52 border-r border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] flex flex-col shrink-0 h-full overflow-hidden"
    >
      {/* 5 Sidebar Tabs */}
      <div
        role="tablist"
        aria-label="Sidebar sections"
        className="grid grid-cols-5 border-b border-[var(--line)] bg-[var(--surface-subtle)] p-1 gap-0.5 shrink-0"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={t.label}
              title={t.label}
              onClick={() => onSelectTab(t.id)}
              className={`relative py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${
                isActive
                  ? 'bg-[var(--surface)] text-[var(--brand)] shadow-2xs border border-[var(--line)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-full">{t.label}</span>
              {t.count > 0 && (
                <span className="absolute top-0.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold flex items-center justify-center">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* 1. THUMBNAILS */}
        {activeTab === 'thumbnails' && (
          <div className="flex flex-col gap-2">
            <div className="text-[12px] font-semibold text-[var(--muted)] flex items-center justify-between px-1">
              <span>Pages ({visiblePages.length})</span>
            </div>
            {visiblePages.map((pNum, idx) => {
              const descriptor = pageOrder[idx];
              const isCurrent = pNum === currentPage;
              const annKey = descriptor?.uid || descriptor?.sourcePageNumber || pNum;
              const pageAnns = annotations[annKey] || [];
              const rot = descriptor?.rotationOffset || 0;
              return (
                <button
                  key={`thumb_${annKey}_${idx}`}
                  type="button"
                  onClick={() => onSelectPage(pNum)}
                  className={`w-full max-w-[132px] mx-auto text-left p-1.5 rounded-lg border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${
                    isCurrent
                      ? 'border-[var(--brand)] bg-[var(--brand-soft)] ring-1 ring-[var(--brand)]/40'
                      : 'border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="aspect-[3/4] bg-white rounded-md border border-slate-300 flex flex-col items-center justify-center relative overflow-hidden shadow-2xs">
                    {pdfJsDoc && descriptor?.sourceType !== 'blank' ? (
                      <>
                        <PdfThumbnailCanvas
                          pdfJsDoc={pdfJsDoc}
                          sourcePageNumber={descriptor?.sourcePageNumber || pNum}
                          rotationOffset={rot}
                          cropBox={descriptor?.cropBox || null}
                        />
                        <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-slate-900/75 text-white text-[10px] font-semibold leading-none">
                          {pNum}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-700 font-semibold text-[13px]">{pNum}</span>
                        {descriptor?.sourceType === 'blank' && (
                          <span className="text-[10px] text-slate-400 mt-0.5">Blank</span>
                        )}
                      </>
                    )}
                    {pageAnns.length > 0 && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold leading-none">
                        {pageAnns.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-[var(--ink)]">
                    <span>Page {pNum}</span>
                    {rot ? (
                      <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                        <RotateCw className="w-2.5 h-2.5" />
                        {rot}°
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 2. OUTLINE / BOOKMARKS */}
        {activeTab === 'outline' && (
          <div className="flex flex-col gap-2">
            <h4 className="text-[13px] font-semibold text-[var(--muted)] px-1">
              Document Outline
            </h4>
            {outline && outline.length > 0 ? (
              renderOutlineTree(outline)
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[var(--line)] text-[13px] text-[var(--muted)] text-center">
                No bookmarks or outline entries embedded in this PDF.
              </div>
            )}
          </div>
        )}

        {/* 3. SEARCH & PATTERN REDACT RESULTS */}
        {activeTab === 'search' && (
          <div className="flex flex-col gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onRunSearch();
              }}
              className="flex flex-col gap-2"
            >
              <label htmlFor="pdf-search-input" className="text-[13px] font-semibold text-[var(--ink)]">
                Find text or pattern
              </label>
              <div className="flex gap-1.5">
                <input
                  id="pdf-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search text or regex..."
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[14px] text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  aria-label="Run search"
                  className="px-3 py-2 rounded-lg bg-[var(--brand)] text-white text-[13px] font-semibold hover:bg-[var(--brand-hover)] cursor-pointer disabled:opacity-50"
                >
                  Go
                </button>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-[var(--muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchIsRegex}
                  onChange={(e) => setSearchIsRegex(e.target.checked)}
                />
                <span>Use regular expression</span>
              </label>
            </form>

            {/* Quick sensitive pattern presets */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--line)]">
              <span className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-wide">
                Quick Patterns
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(REDACTION_PATTERN_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onRunPatternSearch(key)}
                    className="px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[12px] font-medium text-[var(--ink)] text-left truncate cursor-pointer"
                    title={preset.label}
                  >
                    {preset.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {searchResults.length > 0 && !readOnlyLocked && (
              <button
                type="button"
                onClick={onMarkSearchAsRedactions}
                className="w-full py-2 px-3 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/40 text-rose-500 text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Mark all {searchResults.length} matches for Redaction</span>
              </button>
            )}

            <div className="flex flex-col gap-1.5 pt-1">
              {searchResults.length === 0 ? (
                <p className="text-[13px] text-[var(--muted)] text-center py-4">
                  {isSearching ? 'Searching PDF pages...' : 'Enter a query or pick a pattern above.'}
                </p>
              ) : (
                searchResults.map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => onSelectPage(res.pageNumber)}
                    className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] hover:border-[var(--brand)] text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-[12px] font-semibold text-[var(--brand)] mb-0.5">
                      <span className="truncate">{res.matchText}</span>
                      <span>Page {res.pageNumber}</span>
                    </div>
                    <p className="text-[12px] text-[var(--muted)] line-clamp-2">{res.snippet}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. COMMENTS & CALLOUTS */}
        {activeTab === 'comments' && (
          <div className="flex flex-col gap-3">
            <h4 className="text-[13px] font-semibold text-[var(--muted)] px-1">
              Comments &amp; Callouts ({commentsList.length})
            </h4>
            {commentsList.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[var(--line)] text-[13px] text-[var(--muted)] text-center">
                No comments yet. Select Comment or Callout in Edit mode and click the page.
              </div>
            ) : (
              commentsList.map(({ pageNumber, annotation: c }) => (
                <div
                  key={c.id}
                  onClick={() => onSelectComment(pageNumber, c.id)}
                  className="p-3 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] hover:border-[var(--brand)]/60 cursor-pointer flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-[var(--ink)] truncate">
                      {c.author || localProfileName}
                    </span>
                    <span className="text-[var(--brand)] font-semibold">Page {pageNumber}</span>
                  </div>
                  {c.timestampLabel && (
                    <span className="text-[11px] text-[var(--muted)] -mt-1">{c.timestampLabel}</span>
                  )}
                  <p className="text-[13px] text-[var(--ink)] whitespace-pre-wrap">{c.text}</p>

                  {Array.isArray(c.replies) && c.replies.length > 0 && (
                    <div className="pl-2.5 border-l-2 border-[var(--line)] flex flex-col gap-1.5 mt-1">
                      {c.replies.map((r, rIdx) => (
                        <div key={rIdx} className="text-[12px]">
                          <span className="font-semibold text-[var(--ink)]">{r.author}: </span>
                          <span className="text-[var(--muted)]">{r.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!readOnlyLocked && (
                    <form
                      onClick={(e) => e.stopPropagation()}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const val = (replyDrafts[c.id] || '').trim();
                        if (!val) return;
                        onReplyComment(pageNumber, c.id, val);
                        setReplyDrafts((prev) => ({ ...prev, [c.id]: '' }));
                      }}
                      className="flex gap-1 pt-1"
                    >
                      <input
                        type="text"
                        value={replyDrafts[c.id] || ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        placeholder="Reply..."
                        aria-label="Reply to comment"
                        className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[12px] outline-none focus:border-[var(--brand)]"
                      />
                      <button
                        type="submit"
                        aria-label="Send reply"
                        className="p-1.5 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 5. ATTACHMENTS */}
        {activeTab === 'attachments' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-semibold text-[var(--muted)]">
                Embedded Files ({attachments.length})
              </h4>
              {!readOnlyLocked && (
                <label className="px-2.5 py-1.5 rounded-lg bg-[var(--brand)] text-white text-[12px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-[var(--brand-hover)]">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach</span>
                  <input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onAddAttachmentFile(f);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {attachments.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[var(--line)] text-[13px] text-[var(--muted)] text-center">
                No files attached inside this PDF.
              </div>
            ) : (
              attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-[var(--ink)] truncate" title={att.name}>
                      {att.name}
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {formatFileSize(att.size || att.content?.byteLength || 0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDownloadAttachment(att)}
                      title="Download attachment"
                      aria-label={`Download ${att.name}`}
                      className="p-1.5 rounded-lg text-[var(--brand)] hover:bg-[var(--surface-hover)] cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {att.isAdded && !readOnlyLocked && (
                      <button
                        type="button"
                        onClick={() => onRemoveAttachment(att.id)}
                        title="Remove attachment"
                        aria-label={`Remove ${att.name}`}
                        className="p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-500 cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
