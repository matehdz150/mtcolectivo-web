import { Icon, type IconName } from "./icon";

const SIZES = {
  sm: { box: "size-5 rounded-[6px]", icon: 11 },
  md: { box: "size-[30px] rounded-sm", icon: 15 },
  lg: { box: "size-11 rounded-md", icon: 20 },
} as const;

/** Mint square with one glyph: the brand's mark inside headlines. */
export function IconTile({ icon, size = "md", className = "" }: { icon: IconName; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center bg-mint align-middle text-on-mint ${s.box} ${className}`}>
      <Icon name={icon} size={s.icon} strokeWidth={2.4} />
    </span>
  );
}
