"use client";

/**
 * A submit button that asks first. Used for clearing the whole table, which is
 * permanent and one click from the rest of the page.
 */
export function ConfirmButton({
  children,
  confirmText,
  className
}: {
  children: React.ReactNode;
  confirmText: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
