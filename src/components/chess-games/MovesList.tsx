'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import type { GameNode, MoveListToken } from '@/lib/chess-games/gameTree';
import { scrollActiveIntoView } from '@/lib/chess-games/scroll';

interface MovesListProps {
  tokens: MoveListToken[];
  current: GameNode;
  onSelect: (node: GameNode) => void;
  onDeleteMove: (node: GameNode) => void;
  onDeleteAfter: (node: GameNode) => void;
  comments?: Map<string, string>;
  onSetComment?: (nodeId: string, text: string) => void;
  nags?: Map<string, number[]>;
  onSetNags?: (nodeId: string, codes: number[]) => void;
  evals?: Map<string, number | string>;
  clocks?: Map<string, string>;
}

// Standard PGN NAGs, ordered best → worst for the picker.
const NAG_OPTIONS: { code: number; glyph: string; color: string }[] = [
  { code: 3, glyph: '!!', color: 'text-green-400' },
  { code: 1, glyph: '!',  color: 'text-green-400' },
  { code: 5, glyph: '!?', color: 'text-blue-400' },
  { code: 6, glyph: '?!', color: 'text-amber-400' },
  { code: 2, glyph: '?',  color: 'text-red-400' },
  { code: 4, glyph: '??', color: 'text-red-400' },
];
const NAG_BY_CODE = new Map(NAG_OPTIONS.map((n) => [n.code, n]));

function getMoveNumber(node: GameNode): number {
  return parseInt(node.parent!.fen.split(' ')[5], 10);
}

function formatEval(v: number | string): string {
  if (typeof v === 'string') return v.startsWith('#') ? `M${v.slice(1).replace('-', '')}` : v;
  return v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

interface CtxMenu {
  x: number;
  y: number;
  node: GameNode;
}

export function MovesList({ tokens, current, onSelect, onDeleteMove, onDeleteAfter, comments, onSetComment, nags, onSetNags, evals, clocks }: MovesListProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toggle a NAG: picking the one already set clears it.
  const handleToggleNag = (node: GameNode, code: number) => {
    const cur = nags?.get(node.id) ?? [];
    onSetNags?.(node.id, cur.includes(code) ? [] : [code]);
    setCtxMenu(null);
  };

  useEffect(() => {
    scrollActiveIntoView(activeRef.current);
  }, [current.id]);

  // Close context menu on outside click / touch
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('mousedown', close);
    window.addEventListener('touchstart', close, { passive: true });
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('touchstart', close);
    };
  }, [!!ctxMenu]);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleAddComment = (node: GameNode) => {
    setCtxMenu(null);
    setEditingNodeId(node.id);
  };

  const handleSaveComment = (nodeId: string, text: string) => {
    onSetComment?.(nodeId, text);
    setEditingNodeId(null);
  };

  if (tokens.length === 0) {
    return <p className="text-muted-foreground text-xs px-1">No moves yet.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-px gap-y-0.5 text-sm leading-6 overflow-y-auto">
        {tokens.map((token, i) => {
          if (token.kind === 'var-open') {
            return <span key={`vo-${i}`} className="text-muted-foreground text-xs">(</span>;
          }
          if (token.kind === 'var-close') {
            return <span key={`vc-${i}`} className="text-muted-foreground text-xs">)</span>;
          }

          if (token.kind !== 'move') return null;
          const { node, showMoveNumber, variationDepth } = token;
          const isActive = node.id === current.id;
          const isBlack = node.move!.color === 'b';
          const moveNum = getMoveNumber(node);
          const isVariation = variationDepth > 0;
          const comment = comments?.get(node.id);
          const evalVal = evals?.get(node.id);
          const clk = clocks?.get(node.id);
          const isEditing = editingNodeId === node.id;
          const nagInfo = NAG_BY_CODE.get(nags?.get(node.id)?.[0] ?? -1);

          return (
            <Fragment key={node.id}>
              <span className="inline-flex items-baseline gap-px">
                {showMoveNumber && (
                  <span className={`font-mono text-muted-foreground ${isVariation ? 'text-xs' : ''}`}>
                    {moveNum}{isBlack ? '...' : '.'}
                  </span>
                )}
                <button
                  ref={isActive ? activeRef : undefined}
                  onClick={() => onSelect(node)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setCtxMenu({ x: e.clientX, y: e.clientY, node });
                  }}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    longPressTimer.current = setTimeout(() => {
                      longPressTimer.current = null;
                      setCtxMenu({ x: touch.clientX, y: touch.clientY, node });
                    }, 500);
                  }}
                  onTouchEnd={clearLongPress}
                  onTouchMove={clearLongPress}
                  className={[
                    'font-mono rounded px-1 transition-colors select-none',
                    isVariation ? 'text-xs text-muted-foreground hover:bg-accent' : 'text-foreground hover:bg-accent',
                    // A commented move is shaded rather than dotted; active wins.
                    comment && !isActive ? 'bg-amber-500/15' : '',
                    isActive ? 'bg-primary text-primary-foreground font-semibold hover:bg-primary/90' : '',
                  ].join(' ')}
                >
                  {node.move!.san}
                  {nagInfo && (
                    <span className={`font-bold ${isActive ? 'text-white' : nagInfo.color}`}>{nagInfo.glyph}</span>
                  )}
                </button>
                {/* Imported engine eval / clock — compact, only on the main line */}
                {!isVariation && evalVal !== undefined && (
                  <span className="ml-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">{formatEval(evalVal)}</span>
                )}
                {!isVariation && clk && (
                  <span className="ml-0.5 font-mono text-[10px] tabular-nums text-muted-foreground/70">{clk}</span>
                )}
              </span>

              {/* Comment display */}
              {comment && !isEditing && (
                <span className="mx-1 text-xs text-muted-foreground leading-tight font-mono">
                  {comment}
                </span>
              )}

              {/* Inline comment editor */}
              {isEditing && (
                <div className="w-full px-1 pb-1">
                  <textarea
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    className="w-full text-xs px-2 py-1.5 rounded bg-input border border-border text-foreground resize-none focus:outline-none focus:border-ring"
                    rows={2}
                    defaultValue={comment ?? ''}
                    onBlur={(e) => handleSaveComment(node.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveComment(node.id, (e.target as HTMLTextAreaElement).value);
                      }
                      if (e.key === 'Escape') handleSaveComment(node.id, comment ?? '');
                    }}
                    placeholder="Add a comment…"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5 pl-0.5">Enter to save · Esc to cancel</p>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-popover border border-border rounded shadow-xl py-1 min-w-[190px] text-sm"
          style={{ left: Math.min(ctxMenu.x, window.innerWidth - 200), top: Math.min(ctxMenu.y, window.innerHeight - 140) }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {onSetNags && (
            <>
              <div className="flex items-center gap-0.5 px-2 py-1.5">
                {NAG_OPTIONS.map((n) => {
                  const isSet = (nags?.get(ctxMenu.node.id) ?? []).includes(n.code);
                  return (
                    <button
                      key={n.code}
                      onClick={() => handleToggleNag(ctxMenu.node, n.code)}
                      title={`Annotate ${n.glyph}`}
                      className={[
                        'flex-1 rounded px-1 py-0.5 font-mono font-bold text-sm hover:bg-accent',
                        isSet ? `bg-accent ${n.color}` : n.color,
                      ].join(' ')}
                    >
                      {n.glyph}
                    </button>
                  );
                })}
              </div>
              <div className="my-1 border-t border-border" />
            </>
          )}
          {onSetComment && (
            <>
              <button
                className="block w-full text-left px-3 py-1.5 hover:bg-accent text-popover-foreground"
                onClick={() => handleAddComment(ctxMenu.node)}
              >
                {comments?.get(ctxMenu.node.id) ? 'Edit Comment' : 'Add Comment'}
              </button>
              {comments?.get(ctxMenu.node.id) && (
                <button
                  className="block w-full text-left px-3 py-1.5 hover:bg-accent text-destructive"
                  onClick={() => { onSetComment(ctxMenu.node.id, ''); setCtxMenu(null); }}
                >
                  Remove Comment
                </button>
              )}
              <div className="my-1 border-t border-border" />
            </>
          )}
          <button
            className="block w-full text-left px-3 py-1.5 hover:bg-accent text-destructive"
            onClick={() => { onDeleteMove(ctxMenu.node); setCtxMenu(null); }}
          >
            Delete Move
          </button>
          <div className="my-1 border-t border-border" />
          <button
            className="block w-full text-left px-3 py-1.5 hover:bg-accent text-destructive disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={ctxMenu.node.children.length === 0}
            onClick={() => { onDeleteAfter(ctxMenu.node); setCtxMenu(null); }}
          >
            Delete All Moves After
          </button>
        </div>
      )}
    </>
  );
}
