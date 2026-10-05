const SIZES = {
  sm: { icon: "size-[18px]", text: "text-[17px]" },
  lg: { icon: "size-11 sm:size-12", text: "text-[38px] sm:text-[44px]" },
} as const;

/** Wordmark: a hearth-flame mark plus "hearthgg". Inherits text colour. */
export function Logo({ size = "sm" }: { size?: keyof typeof SIZES }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-extrabold tracking-tight">
      <svg viewBox="0 0 24 24" className={SIZES[size].icon} aria-hidden>
        <path
          fill="currentColor"
          d="M12 2c.6 3.1-1.3 4.9-2.9 6.6C7.5 10.3 6 11.9 6 14.6A6 6 0 0 0 18 14.6c0-2.3-1-4-2.2-5.2.1 1.6-.6 2.8-1.6 3.3.3-2.6-.4-6.9-2.2-10.7Z"
        />
      </svg>
      <span className={`${SIZES[size].text} leading-none`}>hearthgg</span>
    </span>
  );
}
