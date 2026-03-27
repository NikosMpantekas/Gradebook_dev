import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Utility to notify the app that notification/contact counts have changed
export function refreshAppCounts() {
  window.dispatchEvent(new CustomEvent('refreshHeaderCounts'));
}
