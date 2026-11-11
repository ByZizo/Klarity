import React from 'react';
import {
  Sparkles,
  History,
  Brain,
  FileText,
  Plus,
  UploadCloud,
  Square,
  SlidersHorizontal
} from 'lucide-react';

export function AdvisorPage({
  chatMessages = [],
  chatInput = '',
  setChatInput,
  chatFiles = [],
  setChatFiles,
  isAiTyping = false,
  aiMemory = [],
  handleSendChatMessage,
  handleStopGeneration,
  handleAttachFiles,
  handleExecuteSuggestedAction,
  handleGenerateWeeklySummary,
  setIsPastChatsOpen,
  setIsMemoryModalOpen,
  setIsScanBillOpen,
  fullChatContainerRef,
  chatEndRef,
  fullAdvisorFileInputRef,
  fullUploadMenuRef,
  isFullUploadMenuOpen,
  setIsFullUploadMenuOpen,
  FormattedChatMessage
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col h-[650px] justify-between">
      {/* Header */}
      <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-slate-900 tracking-tight">
            Advisor
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Reads your bills, cards and spending to answer questions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateWeeklySummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eff4f9] hover:bg-blue-100 text-[#18457c] border border-[#18457c]/20 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Weekly Summary</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPastChatsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <History className="w-3.5 h-3.5" />
            <span>Past Chats</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMemoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Mini Settings &amp; Memory ({aiMemory.length})</span>
          </button>
        </div>
      </div>

      {/* Chat Thread */}
      <div ref={fullChatContainerRef} className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 pr-1">
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed flex flex-col gap-2 ${
                msg.role === 'user'
                  ? 'bg-[#18457c] text-white shadow-2xs'
                  : 'bg-[#eff4f9] text-slate-800 border border-slate-200/60 shadow-2xs'
              }`}
            >
              {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.attachments.map((att, aIdx) =>
                    att.isImage && att.previewUrl ? (
                      <img
                        key={att.id || aIdx}
                        src={att.previewUrl}
                        alt={att.name || 'Uploaded image'}
                        className="max-h-48 rounded-lg object-contain bg-black/10 self-start"
                      />
                    ) : (
                      <div
                        key={att.id || aIdx}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/15 border border-white/25 text-white min-w-[180px]"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold truncate">{att.name || 'Document'}</p>
                          <p className="text-[10px] text-blue-100">
                            {att.ext || 'FILE'} {att.size ? `• ${(att.size / 1024).toFixed(1)} KB` : ''}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {!msg.attachments && msg.image && (
                msg.image.startsWith('data:image/') ? (
                  <img src={msg.image} alt="Uploaded attachment" className="max-h-48 rounded-lg object-contain bg-black/10 self-start" />
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/15 border border-white/25 text-white w-fit">
                    <FileText className="w-4 h-4 text-white shrink-0" />
                    <span className="text-[11px] font-semibold">Attached Document</span>
                  </div>
                )
              )}

              {msg.text && FormattedChatMessage && (
                <FormattedChatMessage text={msg.text} isUser={msg.role === 'user'} />
              )}

              {msg.role === 'assistant' && Array.isArray(msg.suggestedActions) && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-200/70">
                  {msg.suggestedActions.map((act, actIdx) => (
                    <button
                      key={actIdx}
                      type="button"
                      onClick={() => handleExecuteSuggestedAction(act)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#18457c] text-[#18457c] hover:text-white border border-[#18457c]/25 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isAiTyping && (
          <div className="flex justify-start">
            <div className="bg-[#eff4f9] rounded-2xl px-4 py-2.5 text-xs text-slate-500 animate-pulse border border-slate-200/60">
              Advisor is reading and analyzing...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Multi-File Preview Bar if files attached */}
      {chatFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 max-h-32 overflow-y-auto">
          {chatFiles.map((fileItem) => (
            <div
              key={fileItem.id}
              className="flex items-center gap-2.5 p-2 bg-slate-100/90 rounded-xl border border-slate-200 w-fit max-w-[260px]"
            >
              {fileItem.isImage && fileItem.previewUrl ? (
                <img src={fileItem.previewUrl} alt={fileItem.name} className="w-10 h-10 rounded-lg object-cover border border-slate-300 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#18457c]/10 border border-[#18457c]/20 flex flex-col items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#18457c]" />
                  <span className="text-[8px] font-bold text-[#18457c] uppercase">{fileItem.ext || 'FILE'}</span>
                </div>
              )}
              <div className="min-w-0 pr-1 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate">{fileItem.name}</p>
                <p className="text-[10px] text-slate-500">
                  {fileItem.ext || 'FILE'} • {(fileItem.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove attached file ${fileItem.name}`}
                onClick={() => setChatFiles((prev) => prev.filter((f) => f.id !== fileItem.id))}
                className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                title="Remove file"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chat Input */}
      <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <input
          type="file"
          multiple
          ref={fullAdvisorFileInputRef}
          onChange={async (e) => {
            await handleAttachFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
          accept="*/*"
        />
        <div className="relative" ref={fullUploadMenuRef}>
          <button
            type="button"
            aria-label="Add file or scan document"
            onClick={() => setIsFullUploadMenuOpen((prev) => !prev)}
            className="w-[40px] h-[40px] rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer shrink-0 flex items-center justify-center"
            title="Add file or scan document"
          >
            <Plus className="w-4 h-4" />
          </button>
          {isFullUploadMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  setIsFullUploadMenuOpen(false);
                  setIsScanBillOpen(true);
                }}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#18457c] flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Scan Document</p>
                  <p className="text-[11px] text-slate-500 leading-snug">Paste sentences &amp; AI auto-adds bills or subscriptions</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFullUploadMenuOpen(false);
                  fullAdvisorFileInputRef.current?.click();
                }}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Submit File</p>
                  <p className="text-[11px] text-slate-500 leading-snug">Attach one or multiple files of any format for AI to read</p>
                </div>
              </button>
            </div>
          )}
        </div>

        <label htmlFor="advisor-full-chat-input" className="sr-only">
          Ask your financial advisor
        </label>
        <textarea
          id="advisor-full-chat-input"
          rows={1}
          placeholder="Ask about your money, or attach files..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if ((chatInput.trim() || chatFiles.length > 0) && !isAiTyping) {
                handleSendChatMessage();
              }
            }
          }}
          onPaste={async (e) => {
            const files = e.clipboardData?.files;
            if (files && files.length > 0) {
              e.preventDefault();
              await handleAttachFiles(files);
            }
          }}
          className="flex-1 min-w-0 h-[40px] min-h-[40px] max-h-36 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs resize-none leading-relaxed flex items-center"
        />

        {isAiTyping ? (
          <button
            type="button"
            onClick={handleStopGeneration}
            className="h-[38px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 mb-0.5 animate-in fade-in zoom-in-90"
            title="Stop response"
            aria-label="Stop generating response"
          >
            <Square className="w-3.5 h-3.5 fill-current text-white" />
            <span className="text-xs font-semibold">Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!chatInput.trim() && chatFiles.length === 0}
            className="h-[40px] px-5 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-2xs cursor-pointer shrink-0 flex items-center justify-center"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}

export default AdvisorPage;
