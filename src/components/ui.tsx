"use client";
import { useEffect, useId, useRef, type ReactNode, type ButtonHTMLAttributes } from "react";
import { Check, ChevronRight, Droplet, Flame, Gem, Heart, Leaf, Loader2, Moon, Snowflake, Sparkles, Sun, Wind, X, Zap } from "lucide-react";
import type { Character, Element, OwnedCharacter } from "@/lib/game-types";
import { powerOf } from "@/lib/catalog";

export function Logo({ compact = false }: { compact?: boolean }) {
  return <span className="brand"><span className="brand-mark"><svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 1 25.3 14.7 39 20 25.3 25.3 20 39 14.7 25.3 1 20 14.7 14.7Z" fill="currentColor"/><path d="m31 2 1.8 5.2L38 9l-5.2 1.8L31 16l-1.8-5.2L24 9l5.2-1.8Z" fill="currentColor"/></svg></span>{!compact && <span className="brand-word">astral<span className="brand-dot">.</span></span>}</span>;
}
export function ElementIcon({ element, size = 15 }: { element: Element; size?: number }) {
  const Icon = { Light: Sun, Fire: Flame, Frost: Snowflake, Wind: Wind, Nature: Leaf, Lightning: Zap, Dark: Moon, Water: Droplet }[element];
  return <Icon size={size} strokeWidth={1.8} />;
}
export function Stars({ rarity, size = 12 }: { rarity: number; size?: number }) {
  return <span className="stars" aria-label={`${rarity} star rarity`}>{Array.from({ length: rarity }, (_, i) => <span key={i} style={{ fontSize: size }}>✦</span>)}</span>;
}
export function ResourceIcon({ type, size = 19 }: { type: "gems" | "gold" | "energy"; size?: number }) {
  if (type === "gems") return <Gem className="gem-icon" size={size} fill="currentColor" fillOpacity={0.15} strokeWidth={1.8} />;
  if (type === "gold") return <span className="coin-icon" style={{ width: size, height: size, fontSize: size * 0.58 }}>✦</span>;
  return <Zap className="energy-icon" size={size} fill="currentColor" fillOpacity={0.3} strokeWidth={1.8} />;
}
export function Avatar({ name, size = "normal", image }: { name: string; size?: "small" | "normal" | "large"; image?: string }) {
  return <span className={`avatar avatar-${size}`}>{image ? <img src={image} alt={name} /> : <span>{name.slice(0, 1).toUpperCase()}</span>}<span className="avatar-online" /></span>;
}
export function Button({ children, variant = "primary", className = "", loading = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean }) {
  return <button {...props} className={`button button-${variant} ${className}`} disabled={props.disabled || loading}>{loading && <Loader2 size={16} className="spin" />}{children}</button>;
}
export function IconButton({ children, label, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button {...props} className={`icon-button ${className}`} aria-label={label} title={label}>{children}</button>;
}
export function Modal({ title, children, onClose, wide = false, className = "" }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => ref.current?.querySelector<HTMLElement>("input, button, select, [tabindex='0']")?.focus(), 50);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const elements = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea, [tabindex="0"]');
        if (!elements?.length) return;
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(timer); document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`modal ${wide ? "modal-wide" : ""} ${className}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="modal-heading"><h2 id={titleId}>{title}</h2><IconButton label="Close dialog" onClick={onClose}><X size={20} /></IconButton></div>{children}</div></div>;
}
export function EmptyState({ icon, title, description, children }: { icon?: ReactNode; title: string; description: string; children?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon || <Sparkles size={30} />}</span><h3>{title}</h3><p>{description}</p>{children}</div>;
}
export function SectionHeading({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return <div className="section-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <button className="text-button" onClick={onAction}>{action}<ChevronRight size={15} /></button>}</div>;
}
export function CharacterCard({ character, onOpen, onFavorite, compact = false }: { character: OwnedCharacter; onOpen: () => void; onFavorite?: () => void; compact?: boolean }) {
  const definition = character.character;
  return <article className={`character-card ${compact ? "character-compact" : ""}`} style={{ "--character-color": definition.accent } as React.CSSProperties}>
    <button className="character-image-button" onClick={onOpen} aria-label={`View ${definition.name}, level ${character.level}`}>
      <img src={definition.image} alt={`${definition.name}, ${definition.title}`} className={`character-art art-${definition.id}`} loading="lazy" />
      <span className="character-image-shade" />
      <span className="character-stars"><Stars rarity={definition.rarity} /></span>
      <span className="character-element" title={definition.element}><ElementIcon element={definition.element} /></span>
      <span className="character-level">Lv. {character.level}</span>
    </button>
    {onFavorite && <button className={`character-heart ${character.favorite ? "is-favorite" : ""}`} onClick={onFavorite} aria-label={character.favorite ? `Unfavorite ${definition.name}` : `Favorite ${definition.name}`}><Heart size={15} fill={character.favorite ? "currentColor" : "none"} /></button>}
    <button className="character-info" onClick={onOpen}><span><strong>{definition.name}</strong><span className="character-role"><ElementIcon element={definition.element} size={12} />{definition.element}<span className="tiny-dot" />{definition.role}</span></span><ChevronRight size={16} className="muted" /></button>
    {!compact && <div className="character-power"><Zap size={12} />{powerOf(character).toLocaleString()} power<Check size={12} className="character-owned" /></div>}
  </article>;
}
export function PageIntro({ eyebrow, title, description, children }: { eyebrow?: string; title: ReactNode; description: string; children?: ReactNode }) {
  return <div className="page-intro"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{children && <div className="page-intro-actions">{children}</div>}</div>;
}
export function DefinitionAvatar({ character, className = "" }: { character: Character; className?: string }) {
  return <span className={`definition-avatar ${className}`} style={{ background: character.accent }}><img src={character.image} alt={character.name} className={`art-${character.id}`} /></span>;
}
