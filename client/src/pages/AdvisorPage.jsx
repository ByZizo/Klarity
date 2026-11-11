import React from 'react';
import {
  Sparkles,
  History,
  Brain,
  FileText,
  Plus,
  UploadCloud,
  Square,
  X
} from 'lucide-react';
import { Button, Card, EmptyState } from '../components/ui';

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
    <Card className="p-5 flex flex-col h-[680px] max-h-[82vh] justify-between">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[24px] font-semibold text-[var(--ink)] tracking-tight">
            Advisor
          </h1>
          <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
            Reads your bills, cards, and spending to answer questions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleGenerateWeeklySummary}>
            <Sparkles className="w-4 h-4" />
            Weekly summary
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsPastChatsOpen(true)}>
            <History className="w-4 h-4" />
            Past chats
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsMemoryModalOpen(true)}>
            <Brain className="w-4 h-4" />
            Memory ({aiMemory.length})
          </Button>
        </div>
      </div>

      {/* Chat Thread */}
      <div ref={fullChatContainerRef} className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 pr-1">
        {chatMessages.length === 0 ? (
          <EmptyState
            title="Ask your financial advisor"
            message="Ask about upcoming bills, card payoff timelines, subscription audits, or household costs."
            actionLabel="Generate weekly summary"
            onAction={handleGenerateWeeklySummary}
          />
        ) : (
          chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-[12px] p-3.5 text-[15px] font-medium leading-relaxed flex flex-col gap-2 ${
                  msg.role === 'user'
                    ? 'bg-[#1B4B91] text-white'
                    : 'bg-[var(--surface-subtle)] text-[var(--ink)] border border-[var(--line)]'
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
                          className="max-h-48 rounded-[8px] object-contain bg-black/10 self-start"
                        />
                      ) : (
                        <div
                          key={att.id || aIdx}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] bg-white/15 border border-white/25 text-white"
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold truncate">{att.name || 'Document'}</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {!msg.attachments && msg.image && (
                  msg.image.startsWith('data:image/') ? (
                    <img src={msg.image} alt="Uploaded attachment" className="max-h-48 rounded-[8px] object-contain bg-black/10 self-start" />
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-white/15 border border-white/25 text-white w-fit">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="text-[13px] font-semibold">Attached document</span>
                    </div>
                  )
                )}

                {msg.text && FormattedChatMessage && (
                  <FormattedChatMessage text={msg.text} isUser={msg.role === 'user'} />
                )}

                {msg.role === 'assistant' && Array.isArray(msg.suggestedActions) && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--line)]">
                    {msg.suggestedActions.map((act, actIdx) => (
                      <Button
                        key={actIdx}
                        variant="secondary"
                        size="sm"
                        onClick={() => handleExecuteSuggestedAction(act)}
                      >
                        {act.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isAiTyping && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface-subtle)] rounded-[12px] px-4 py-2.5 text-[13px] font-medium text-[var(--muted)] border border-[var(--line)]">
              Advisor is reviewing your numbers...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* File Preview Bar */}
      {chatFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 max-h-32 overflow-y-auto">
          {chatFiles.map((fileItem) => (
            <div
              key={fileItem.id}
              className="flex items-center gap-2.5 p-2 bg-[var(--surface-subtle)] rounded-[8px] border border-[var(--line)] w-fit max-w-[260px]"
            >
              {fileItem.isImage && fileItem.previewUrl ? (
                <img src={fileItem.previewUrl} alt={fileItem.name} className="w-10 h-10 rounded-[8px] object-cover border border-[var(--line)] shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-[8px] bg-[#1B4B91]/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#1B4B91]" />
                </div>
              )}
              <div className="min-w-0 pr-1 flex-1">
                <p className="text-[13px] font-semibold text-[var(--ink)] truncate">{fileItem.name}</p>
                <p className="text-[13px] font-medium text-[var(--muted)]">
                  {(fileItem.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove attached file ${fileItem.name}`}
                onClick={() => setChatFiles((prev) => prev.filter((f) => f.id !== fileItem.id))}
                className="p-1 rounded-[8px] text-[var(--muted)] hover:text-[#B91C1C] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chat Input */}
      <form onSubmit={handleSendChatMessage} className="flex items-end gap-2 pt-3 border-t border-[var(--line)]">
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
            aria-label="Attach file or scan document"
            onClick={() => setIsFullUploadMenuOpen((prev) => !prev)}
            className="w-[42px] h-[42px] rounded-[8px] bg-[var(--surface-subtle)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink)] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
          {isFullUploadMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--surface)] rounded-[12px] border border-[var(--line)] shadow-xl p-1.5 z-50">
              <button
                type="button"
                onClick={() => {
                  setIsFullUploadMenuOpen(false);
                  setIsScanBillOpen(true);
                }}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-[8px] hover:bg-[var(--surface-subtle)] text-left transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-[8px] bg-[#1B4B91]/10 text-[#1B4B91] flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--ink)]">Scan document</p>
                  <p className="text-[13px] font-medium text-[var(--muted)] leading-snug">Extract bills or subscriptions from text</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFullUploadMenuOpen(false);
                  fullAdvisorFileInputRef.current?.click();
                }}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-[8px] hover:bg-[var(--surface-subtle)] text-left transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-[8px] bg-[#15803D]/10 text-[#15803D] flex items-center justify-center shrink-0 mt-0.5">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--ink)]">Attach file</p>
                  <p className="text-[13px] font-medium text-[var(--muted)] leading-snug">Upload statements or images for analysis</p>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
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
            className="w-full h-[42px] min-h-[42px] max-h-36 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] font-medium text-[var(--ink)] placeholder-[var(--muted)] resize-none leading-relaxed"
          />
        </div>

        {isAiTyping ? (
          <Button variant="danger" onClick={handleStopGeneration} aria-label="Stop generating response">
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            variant="primary"
            disabled={!chatInput.trim() && chatFiles.length === 0}
          >
            Send
          </Button>
        )}
      </form>
    </Card>
  );
}

export default AdvisorPage;
