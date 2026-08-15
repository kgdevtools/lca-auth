'use client'

// Lichess-style DM dropdown — no dedicated page. See
// .claude/plans/notifications-lichess-style.md for the design this encodes:
// open messaging (any user ↔ any other), search-by-name to start a thread,
// poll-on-load (no Realtime yet), moderation deferred to v2.
//
// Two-pane layout: thread list (35%) stays visible on the left at all times,
// selected conversation (65%) on the right — not a single view that swaps.

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, ArrowLeft, Search, Send, Flag } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useMotionProfile } from '@/components/microinteractions/MotionProfileProvider'
import { hintAnimation } from '@/components/microinteractions/presets'
import {
  listThreads, getThreadMessages, searchUsers, sendMessage, sendMessageInThread, markThreadRead, reportMessage,
  type DmThreadSummary, type DmMessage, type DmUserResult,
} from '@/services/dmService'

interface SelectedThread { threadId: string; otherUserId: string; otherName: string }

export function MessagesDropdown() {
  const { reduced } = useMotionProfile()
  const [open, setOpen] = useState(false)
  const [threads, setThreads] = useState<DmThreadSummary[]>([])
  const [unreadTotal, setUnreadTotal] = useState(0)
  // Left pane: thread list, or the search-by-name "new message" form.
  const [leftMode, setLeftMode] = useState<'list' | 'search'>('list')
  // Right pane: the selected conversation (independent of the left pane's mode).
  const [selectedThread, setSelectedThread] = useState<SelectedThread | null>(null)
  const [messages, setMessages] = useState<DmMessage[]>([])
  const [draft, setDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DmUserResult[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const refreshThreads = useCallback(async () => {
    const list = await listThreads().catch(() => [])
    setThreads(list)
    setUnreadTotal(list.reduce((sum, t) => sum + t.unreadCount, 0))
  }, [])

  // Poll-on-load: once on mount (drives the nav badge without a live
  // subscription), and again every time the dropdown is opened.
  useEffect(() => { refreshThreads() }, [refreshThreads])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) refreshThreads()
  }

  const openThread = useCallback(async (thread: SelectedThread) => {
    setSelectedThread(thread)
    setSendError(null)
    setLoadingThread(true)
    try {
      const msgs = await getThreadMessages(thread.threadId)
      setMessages(msgs)
      await markThreadRead(thread.threadId)
      refreshThreads()
    } finally {
      setLoadingThread(false)
    }
  }, [refreshThreads])

  useEffect(() => {
    if (selectedThread) messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, selectedThread])

  const handleSearchChange = (q: string) => {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    searchUsers(q).then(setSearchResults).catch(() => setSearchResults([]))
  }

  // No thread exists yet for a fresh search result — the row only gets
  // created server-side once the first message actually sends.
  const startThreadWith = (u: DmUserResult) => {
    setSelectedThread({ threadId: '', otherUserId: u.id, otherName: u.name })
    setMessages([])
    setSendError(null)
    setSearchQuery('')
    setSearchResults([])
    setLeftMode('list')
  }

  // Minimal v1: a reason prompt, not a full modal — flags the message for
  // coach/admin review (dm_reports); the review UI itself isn't built yet.
  const handleReport = async (messageId: string) => {
    if (!selectedThread) return
    const reason = window.prompt('Report this message — why?')
    if (!reason?.trim()) return
    try {
      await reportMessage(messageId, selectedThread.threadId, reason)
      window.alert('Reported — a coach/admin will review it.')
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to report — try again.')
    }
  }

  const handleSend = async () => {
    if (!selectedThread || !draft.trim() || sending) return
    setSending(true)
    setSendError(null)
    try {
      if (selectedThread.threadId) {
        const msg = await sendMessageInThread(selectedThread.threadId, draft)
        setMessages(prev => [...prev, msg])
      } else {
        const { threadId, message } = await sendMessage(selectedThread.otherUserId, draft)
        setSelectedThread(prev => (prev ? { ...prev, threadId } : prev))
        setMessages(prev => [...prev, message])
      }
      setDraft('')
      refreshThreads()
      // Clear + refocus so a follow-up message can be typed straight away
      // instead of needing to click back into the box.
      textareaRef.current?.focus()
    } catch (err) {
      // Surfaced now instead of silently swallowed — a silent failure here
      // looked exactly like "the draft just won't clear," which is what was
      // actually happening: the send was failing (e.g. the migration not
      // applied yet) and nothing told the student that.
      setSendError(err instanceof Error ? err.message : "Couldn't send — try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <motion.button
          animate={unreadTotal > 0 ? hintAnimation(reduced) : undefined}
          className={cn(
            'relative inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors',
            unreadTotal > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
          aria-label="Messages"
          title="Messages"
        >
          <MessageCircle className="w-5 h-5" />
          <AnimatePresence>
            {unreadTotal > 0 && (
              <motion.span
                key={unreadTotal}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="absolute top-0 right-0 z-10 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none ring-2 ring-background"
              >
                {unreadTotal > 9 ? '9+' : unreadTotal}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(92vw,368px)] md:w-[384px] lg:w-[400px] p-0 flex flex-col"
        style={{ maxHeight: '75vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
          <span className="text-sm font-semibold">Messages</span>
          <button onClick={() => setLeftMode(m => (m === 'search' ? 'list' : 'search'))} className="text-xs font-medium text-primary hover:underline">
            {leftMode === 'search' ? 'Cancel' : 'New'}
          </button>
        </div>

        {/* Two-pane body */}
        <div className="flex-1 flex min-h-0">
          {/* Left — thread list (35%) or search-by-name */}
          <div className="w-[35%] shrink-0 border-r border-border overflow-y-auto min-h-[220px]">
            {leftMode === 'search' ? (
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="Search…"
                    className="w-full h-8 pl-7 pr-1.5 text-xs rounded-sm border border-border bg-background"
                  />
                </div>
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => startThreadWith(u)}
                    className="w-full flex flex-col items-center gap-1 px-1 py-2 rounded-sm hover:bg-accent/50 text-center"
                  >
                    <Avatar name={u.name} size={26} />
                    <span className="text-[10px] font-medium truncate w-full">{u.name}</span>
                  </button>
                ))}
                {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No one found.</p>
                )}
              </div>
            ) : threads.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-8 px-2">No conversations yet.</p>
            ) : (
              threads.map(t => (
                <button
                  key={t.threadId}
                  onClick={() => openThread({ threadId: t.threadId, otherUserId: t.otherUserId, otherName: t.otherName })}
                  className={cn(
                    'w-full flex flex-col items-center gap-1 px-1 py-2 hover:bg-accent/50 transition-colors text-center relative',
                    selectedThread?.threadId === t.threadId && 'bg-accent/60',
                  )}
                >
                  <div className="relative">
                    <Avatar name={t.otherName} size={30} />
                    {t.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
                    )}
                  </div>
                  <span className={cn('text-[10px] truncate w-full', t.unreadCount > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground')}>
                    {t.otherName}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Right — selected conversation (65%) */}
          <div className="flex-1 min-w-0 flex flex-col">
            {!selectedThread ? (
              <div className="flex-1 flex items-center justify-center px-4">
                <p className="text-xs text-muted-foreground text-center">Select a conversation, or start a new one.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-border shrink-0 min-w-0">
                  <ArrowLeft
                    onClick={() => setSelectedThread(null)}
                    className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 lg:hidden"
                  />
                  <span className="text-xs font-semibold truncate">{selectedThread.otherName}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[160px]">
                  {loadingThread ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Say hello 👋</p>
                  ) : (
                    messages.map(m => (
                      <div key={m.id} className={cn('flex items-end gap-1 group', m.isMine ? 'justify-end' : 'justify-start')}>
                        {!m.isMine && !m.isRemoved && (
                          <button
                            onClick={() => handleReport(m.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                            title="Report this message"
                            aria-label="Report this message"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        )}
                        <span className={cn(
                          'inline-block max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs break-words',
                          m.isRemoved
                            ? 'italic text-muted-foreground bg-muted/50'
                            : m.isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                        )}>
                          {m.body}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-border p-2 space-y-1 shrink-0">
                  {sendError && <p className="text-[10px] text-destructive px-0.5">{sendError}</p>}
                  <div className="flex items-end gap-1.5">
                    <textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                      placeholder="Write a message…"
                      rows={2}
                      className="flex-1 resize-none max-h-28 text-xs rounded-sm border border-border bg-background px-2 py-1.5 leading-snug"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!draft.trim() || sending}
                      className="shrink-0 w-8 h-8 rounded-sm bg-foreground text-background flex items-center justify-center disabled:opacity-30 transition-opacity"
                      aria-label="Send"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
