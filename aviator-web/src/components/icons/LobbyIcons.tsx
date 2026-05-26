export function FlameIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2c1.2 2.4 3.6 3.4 3.6 6.6 0 1.2-.4 2.2-1 3.1.8-.3 1.6-.5 2.4-.5 2.2 0 4 1.8 4 4.1 0 3.5-3.2 6.7-7 6.7S5 18.8 5 15.3c0-2.3 1.8-4.1 4-4.1.8 0 1.6.2 2.4.5-.6-.9-1-1.9-1-3.1C10.4 5.4 12.8 4.4 12 2Z" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
