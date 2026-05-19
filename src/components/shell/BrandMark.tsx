import { cn } from '@/lib/utils';

export interface BrandMarkProps {
  size?: number;
  className?: string;
}

/** Teal gradient square with a white medical cross — the app's logo motif. */
export function BrandMark({ size = 32, className }: BrandMarkProps) {
  return (
    <span
      aria-hidden
      className={cn('brand-mark inline-block shrink-0', className)}
      style={{ width: size, height: size }}
    />
  );
}
