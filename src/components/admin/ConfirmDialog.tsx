import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
}: Props) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        />
        <AlertDialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 bg-background border hairline p-8 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
        >
          <AlertDialogPrimitive.Title className="font-display text-[22px] leading-tight text-ink">
            {title}
          </AlertDialogPrimitive.Title>
          {description && (
            <AlertDialogPrimitive.Description className="mt-3 text-[13px] leading-relaxed text-ink-muted">
              {description}
            </AlertDialogPrimitive.Description>
          )}
          <div className="mt-8 flex items-center justify-end gap-3">
            <AlertDialogPrimitive.Cancel className="text-[11px] tracking-tag uppercase border hairline px-4 py-2.5 text-ink hover:bg-off-white">
              {cancelLabel}
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              onClick={onConfirm}
              className="text-[11px] tracking-tag uppercase px-5 py-2.5 text-background hover:opacity-90 transition-opacity"
              style={{
                background: destructive
                  ? "hsl(var(--destructive))"
                  : "hsl(var(--blue))",
              }}
            >
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
