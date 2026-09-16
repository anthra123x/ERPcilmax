'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CheckCheck, Mail, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { setWebMessageRead, deleteWebMessage } from '@/modules/web/web.actions'

interface WebMessageActionsProps {
  id: string
  read: boolean
}

export function WebMessageActions({ id, read }: WebMessageActionsProps) {
  const [busy, setBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function toggleRead() {
    setBusy(true)
    const result = await setWebMessageRead(id, !read)
    if (result?.error) toast.error(result.error)
    else if (result?.success) toast.success(result.success)
    setBusy(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteWebMessage(id)
    if (result?.error) toast.error(result.error)
    setDeleting(false)
    setDeleteOpen(false)
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={toggleRead} disabled={busy}>
        {read ? <Mail className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
        {read ? 'No leído' : 'Leído'}
      </Button>
      <Button variant="destructive" size="icon-sm" onClick={() => setDeleteOpen(true)} title="Eliminar mensaje">
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">¿Eliminar mensaje?</DialogTitle>
            <DialogDescription className="text-center">
              El mensaje se eliminará de forma permanente y ya no podrá recuperarse.
            </DialogDescription>
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
