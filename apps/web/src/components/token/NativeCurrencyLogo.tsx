/** ETH logo for Base native currency display. */
export function NativeCurrencyLogo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      className={`shrink-0 rounded-full ${className}`}
    >
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path
        fill="#fff"
        fillOpacity="0.95"
        d="M16.5 4v9.5l7.5 3.3L16.5 4zm0 19.2V28l7.6-10.6-7.6 5.8zm-1-9.7L8.4 16.8 15.5 28v-9.5l-7.5-3.3L15.5 13.5zM15.5 4l7.5 12.8L15.5 13.5V4z"
      />
    </svg>
  );
}
