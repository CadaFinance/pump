export type FormExecutionPhase = "submitting" | "confirming";

export function FormExecutionStatus({
  phase,
  detail,
  label = "Transaction status",
}: {
  phase: FormExecutionPhase;
  detail: string;
  label?: string;
}) {
  return (
    <div className="trade-execution-status" role="status" aria-live="polite">
      <span className="trade-execution-status__label">{label}</span>
      <div className="trade-execution-steps" aria-hidden>
        <div
          className={`trade-execution-step${
            phase === "submitting"
              ? " trade-execution-step--active"
              : phase === "confirming"
                ? " trade-execution-step--done"
                : ""
          }`}
        />
        <div
          className={`trade-execution-step${
            phase === "confirming" ? " trade-execution-step--active" : ""
          }`}
        />
      </div>
      <p className="trade-execution-status__detail">{detail}</p>
    </div>
  );
}
