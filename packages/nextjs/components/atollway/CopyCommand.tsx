"use client";

import { Fragment } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useCopyToClipboard } from "~~/hooks/scaffold-hbar";
import { cn } from "~~/lib/utils";

type CopyCommandProps = {
  /** One command, or several lines shown as one block and copied together. */
  command: string;
  /** Shown in the block's top bar, for example "Terminal". */
  title?: string;
  className?: string;
};

/**
 * A shell command in a terminal-style block, with a copy button.
 */
export const CopyCommand = ({ command, title, className }: CopyCommandProps) => {
  const { copyToClipboard, isCopiedToClipboard } = useCopyToClipboard();
  const lines = command.split("\n");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-[oklch(0.18_0.025_258)] text-[oklch(0.93_0.01_230)] shadow-sm dark:bg-black/40",
        className,
      )}
    >
      {title && (
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2 text-xs text-white/60">
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="ml-2">{title}</span>
        </div>
      )}
      <div className="flex items-start gap-2 py-3 pr-2 pl-4">
        <pre className="min-w-0 flex-1 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap">
          {lines.map((line, i) => (
            <div key={i}>
              <span className="text-[oklch(0.78_0.12_190)] select-none">$ </span>
              {/* Wrap only between words: browsers would otherwise break inside "--" flags. */}
              {line.split(" ").map((word, j) => (
                <Fragment key={j}>
                  {j > 0 && " "}
                  <span className="whitespace-nowrap">{word}</span>
                </Fragment>
              ))}
            </div>
          ))}
        </pre>
        <button
          type="button"
          aria-label="Copy command"
          onClick={() => copyToClipboard(command)}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          {isCopiedToClipboard ? (
            <CheckIcon className="size-4 text-[oklch(0.78_0.15_155)]" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
};
