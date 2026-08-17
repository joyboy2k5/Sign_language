import { useState } from "react";
import { SIGN_DICTIONARY } from "@/lib/sign-engine/signDictionary";
import type { SignDictionaryItem } from "@/lib/sign-engine/types";

interface SignReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInjectSign?: (token: string) => void;
}

export function SignReferenceModal({
  isOpen,
  onClose,
  onInjectSign,
}: SignReferenceModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const categories = ["All", "Phrases", "Alphabet", "Numbers"];

  const filteredSigns = SIGN_DICTIONARY.filter((item: SignDictionaryItem) => {
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      item.sign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h2 className="font-mono text-sm font-semibold tracking-wide text-foreground">
              SIGN.REFERENCE // CHEAT_SHEET
            </h2>
            <span className="rounded-sm border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {SIGN_DICTIONARY.length} SIGNS
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕ [ESC]
          </button>
        </div>

        {/* Search & Categories */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 p-3">
          <div className="flex items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-sm border px-3 py-1 font-mono text-xs uppercase tracking-wider transition ${
                  selectedCategory === cat
                    ? "border-primary bg-primary text-primary-foreground font-medium"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-1">
            <span className="font-mono text-xs text-muted-foreground">/</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sign or keyword..."
              className="w-48 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {filteredSigns.map((item) => (
              <div
                key={item.sign}
                className="group relative flex flex-col justify-between border border-border bg-sidebar/70 p-3 transition hover:border-primary/60 hover:bg-sidebar"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.emoji ?? "✋"}</span>
                      <span className="font-mono text-sm font-bold text-foreground">
                        {item.sign}
                      </span>
                    </div>
                    <span className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                      {item.category}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                  {item.tips && (
                    <p className="mt-1.5 border-t border-border/50 pt-1.5 font-mono text-[10px] text-accent">
                      💡 {item.tips}
                    </p>
                  )}
                </div>

                {onInjectSign && (
                  <div className="mt-3 pt-2">
                    <button
                      type="button"
                      onClick={() => onInjectSign(item.sign)}
                      className="w-full rounded-sm border border-border bg-card py-1 font-mono text-[10px] uppercase tracking-wider text-foreground transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      ▶ Test Sign
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredSigns.length === 0 && (
            <div className="py-12 text-center font-mono text-xs text-muted-foreground">
              // No matching signs found in dictionary
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-sidebar px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
          <span>Supported: ASL Alphabet A-Z, Numbers 0-5, Conversational Gestures</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-border bg-card px-3 py-1 text-foreground hover:bg-muted"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
