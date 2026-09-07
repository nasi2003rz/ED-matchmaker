/** Persian-formatted number with an optional unit, digits kept aligned. */
export function Num({ value, unit }: { value: number; unit?: string }) {
  return (
    <span className="tabular-nums">
      {value.toLocaleString("fa-IR")}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}
