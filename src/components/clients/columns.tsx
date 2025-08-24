'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react'

// Client type definition
export type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  customFields: Record<string, unknown>
}

export const columns: ColumnDef<Client>[] = [
  {
    accessorKey: 'name',
    header: 'Nome',
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      return (
        <div className="font-medium">
          {name || 'Sem nome'}
        </div>
      )
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.getValue('email') as string | null
      return (
        <div className="text-sm text-gray-600">
          {email || '—'}
        </div>
      )
    },
  },
  {
    accessorKey: 'phone',
    header: 'Telefone',
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string | null
      return (
        <div className="text-sm text-gray-600">
          {phone || '—'}
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as 'active' | 'inactive'
      return (
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
          {status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Criado em',
    cell: ({ row }) => {
      const createdAt = row.getValue('createdAt') as string
      const date = new Date(createdAt)
      return (
        <div className="text-sm text-gray-600">
          {date.toLocaleDateString('pt-BR')}
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: 'Ações',
    cell: ({ row }) => {
      const client = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(client.id)}
            >
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]