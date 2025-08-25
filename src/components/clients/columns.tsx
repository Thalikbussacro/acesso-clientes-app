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

interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'boolean'
  required: boolean
}

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

// Function to create dynamic columns based on custom fields
export function createColumns(
  customFields: CustomField[] = [],
  onViewClient?: (clientId: string) => void,
  onEditClient?: (clientId: string) => void,
  onDeleteClient?: (clientId: string) => void
): ColumnDef<Client>[] {
  const staticColumns: ColumnDef<Client>[] = [
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
    filterFn: 'includesString',
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
            <DropdownMenuItem 
              className="flex items-center gap-2"
              onClick={() => onViewClient?.(client.id)}
            >
              <Eye className="h-4 w-4" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2"
              onClick={() => onEditClient?.(client.id)}
            >
              <Edit className="h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="flex items-center gap-2 text-red-600"
              onClick={() => onDeleteClient?.(client.id)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }]

  // Generate dynamic columns for custom fields
  const dynamicColumns: ColumnDef<Client>[] = customFields.map((field) => ({
    accessorKey: `customFields.${field.id}`,
    header: field.name,
    cell: ({ row }) => {
      const value = row.original.customFields[field.id]
      
      if (value === null || value === undefined || value === '') {
        return <span className="text-gray-400">—</span>
      }

      switch (field.type) {
        case 'boolean':
          return (
            <Badge variant={value ? 'default' : 'secondary'}>
              {value ? 'Sim' : 'Não'}
            </Badge>
          )
        case 'date':
          const date = new Date(value as string)
          return (
            <span className="text-sm">
              {date.toLocaleDateString('pt-BR')}
            </span>
          )
        case 'email':
          return (
            <a 
              href={`mailto:${value}`}
              className="text-blue-600 hover:underline text-sm"
            >
              {value as string}
            </a>
          )
        case 'phone':
          const phone = value as string
          return (
            <a 
              href={`tel:${phone.replace(/\D/g, '')}`}
              className="text-blue-600 hover:underline text-sm"
            >
              {phone}
            </a>
          )
        default:
          return <span className="text-sm">{String(value)}</span>
      }
    },
    filterFn: (row, columnId, filterValue) => {
      const value = row.original.customFields[field.id]
      
      if (!filterValue || filterValue === 'all') return true
      
      if (value === null || value === undefined || value === '') {
        return false
      }
      
      if (field.type === 'boolean') {
        return String(value) === filterValue
      }
      
      return String(value).toLowerCase().includes(filterValue.toLowerCase())
    },
  }))

  // Insert dynamic columns before the actions column
  const actionsColumn = staticColumns.pop()! // Remove actions column
  return [...staticColumns, ...dynamicColumns, actionsColumn]
}

// Default columns for backward compatibility
export const columns = createColumns()