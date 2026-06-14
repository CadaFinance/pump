import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { ICON_STROKE } from "@/lib/icons";

type FieldSearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string;
};

export function FieldSearchInput({
  className = "",
  wrapperClassName = "",
  ...props
}: FieldSearchInputProps) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pump-muted"
        strokeWidth={ICON_STROKE}
        aria-hidden
      />
      <input
        type="search"
        className={`field-input h-9 w-full bg-pump-surface/75 pl-9 ${className}`}
        {...props}
      />
    </div>
  );
}
