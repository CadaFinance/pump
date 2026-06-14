type HourglassIconProps = {
  size?: number;
  className?: string;
};

export function HourglassIcon({ size = 16, className = "" }: HourglassIconProps) {
  return (
    <span
      className={`hourglass-icon inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        className="hourglass-icon-svg"
      >
        <path
          className="hourglass-frame"
          d="M6 2h12v3.2c0 .6-.2 1.2-.6 1.7L13.5 12l3.9 5.1c.4.5.6 1.1.6 1.7V22H6v-3.2c0-.6.2-1.2.6-1.7L10.5 12 6.6 6.9C6.2 6.4 6 5.8 6 5.2V2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          className="hourglass-sand-top"
          d="M8.5 5.5h7L12 10.5 8.5 5.5z"
          fill="currentColor"
        />
        <path
          className="hourglass-sand-stream"
          d="M12 10.8v2.4"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <path
          className="hourglass-sand-bottom"
          d="M12 17.5 15.5 16h-7l3.5 1.5z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
