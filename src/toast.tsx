import { AlertDialog, AlertDialogBackdrop, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, confirm, type ConfirmOptions } from '@ui-sdk/react/alert-dialog'
import { OverlayHost } from '@ui-sdk/react/overlays'
import { Toast, ToastAction, ToastDescription, ToastTitle, toast } from '@ui-sdk/react/toast'
import { t } from './i18n'

/** A short message at the bottom, over the + button's row. `undo` adds an Undo button that runs the callback. */
export function say(message: string, opts: { undo?: () => void; undoLabel?: string; description?: string; error?: boolean; duration?: number } = {}) {
  const base = {
    description: opts.description,
    duration: opts.duration ?? (opts.undo ? 7000 : 5000),
    action: opts.undo ? { label: opts.undoLabel ?? t('ביטול הפעולה'), onAction: opts.undo } : undefined,
  }
  return opts.error ? toast.error(message, base) : toast(message, base)
}

/** An iOS-style yes/no question. Resolves true only when the main button is pressed; Escape and Cancel give false. */
export function ask(o: { title: string; description?: string; confirmLabel: string; cancelLabel?: string; danger?: boolean }) {
  return confirm({ title: o.title, description: o.description, confirmLabel: o.confirmLabel, cancelLabel: o.cancelLabel ?? t('ביטול'), danger: o.danger } as ConfirmOptions)
}

/** The delete question: one line, one explanation, a red main button. */
export function askDelete(title: string) {
  return ask({ title, description: t('אי אפשר לבטל את המחיקה.'), confirmLabel: t('מחיקה'), danger: true })
}

/** Mount once near the root: renders toasts and the confirm dialog. Styles are in styles/ux.css. */
export function OverlayLayer() {
  return (
    <>
      <OverlayHost
        toast={{
          'aria-label': t('הודעות'),
          children: () => (
            <Toast>
              <div data-slot="stack">
                <ToastTitle />
                <ToastDescription />
              </div>
              <ToastAction data-variant="solid" />
            </Toast>
          ),
        }}
      />
      <AlertDialog controller={confirm.controller}>
        <AlertDialogBackdrop />
        <AlertDialogContent<ConfirmOptions & { danger?: boolean }>>
          {(state) => (
            <>
              <div data-slot="stack">
                <AlertDialogTitle>{state.payload?.title}</AlertDialogTitle>
                {state.payload?.description && <AlertDialogDescription>{state.payload.description}</AlertDialogDescription>}
              </div>
              <div data-slot="actions">
                {/* Cancel comes first in the DOM so focus starts on it; CSS shows the main button on top */}
                <AlertDialogClose>{state.payload?.cancelLabel}</AlertDialogClose>
                <AlertDialogClose data-variant="solid" data-danger={state.payload?.danger ? '' : undefined} value="confirm">
                  {state.payload?.confirmLabel}
                </AlertDialogClose>
              </div>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
