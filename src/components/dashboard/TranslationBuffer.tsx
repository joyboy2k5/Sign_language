interface TranslationBufferProps {
  buffer: string;
  tokenCount: number;
}

export function TranslationBuffer({ buffer, tokenCount }: TranslationBufferProps) {
  return (
    <div className="flex flex-col border-t border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          translation.buffer
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          tokens: {tokenCount}
        </span>
      </div>
      <div className="min-h-[120px] p-4">
        {buffer ? (
          <p className="font-mono text-base leading-relaxed text-foreground">
            {buffer}
            <span className="ml-0.5 inline-block h-4 w-2 -translate-y-px animate-pulse bg-primary align-middle" />
          </p>
        ) : (
          <p className="font-mono text-xs text-muted-foreground">
            // awaiting tokens from ws stream…
          </p>
        )}
      </div>
    </div>
  );
}
