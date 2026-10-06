import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Join Tailwind class names and remove conflicts (used by shadcn/ui).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
