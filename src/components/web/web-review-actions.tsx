'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Eye, EyeOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { setWebReviewApproved, deleteWebReview } from '@/modules/web/web.actions'

interface WebReviewActionsProps {
  id: string
  approved: boolean
}

export function WebReviewActions({ id, approved }: WebReviewActionsProps) {
  const [busy, setBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function toggleApproved() {
    setBusy(true)
    const result = await setWebReviewApproved(id, !approved)
    if (result?.error) toast.error(result.error)
    else if (result?.success) toast.success(result.success)
    setBusy(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteWebReview(id)
    if (result?.error) toast.error(result.error)
    setDeleting(false)
    setDeleteOpen(false)
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant={approved ? 'outline' : 'default'} size="sm" onClick={toggleApproved} disabled={busy}>
        {approved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {approved ? 'Ocultar' : 'Publicar'}
      </Button>
      <Button variant="destructive" size="icon-sm" onClick={() => setDeleteOpen(true)} title="Eliminar reseña">
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">¿Eliminar reseña?</DialogTitle>
            <DialogDescription className="text-center">La reseña se eliminará de forma permanente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
