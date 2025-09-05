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
  const columns: ColumnDef<Client>[] = [
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
    }
  ]

  // Add cidade column if it exists in custom fields
  const cidadeField = customFields.find(field => 
    field.id.toLowerCase() === 'cidade' || 
    field.name.toLowerCase().includes('cidade')
  )
  
  if (cidadeField) {
    columns.push({
      accessorKey: `customFields.${cidadeField.id}`,
      header: 'Cidade',
      cell: ({ row }) => {
        const value = row.original.customFields[cidadeField.id]
        return (
          <div className="text-sm text-gray-600">
            {value ? String(value) : '—'}
          </div>
        )
      },
    })
  }

  // Add último acesso column (mock for now - would come from database)
  columns.push({
    id: 'lastAccess',
    header: 'Último Acesso',
    cell: ({ row }) => {
      // Mock data - would come from database last_access field
      const mockLastAccess = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      return (
        <div className="text-sm text-gray-600">
          {mockLastAccess.toLocaleDateString('pt-BR')}
        </div>
      )
    },
  })

  // Add última modificação column
  columns.push({
    accessorKey: 'updatedAt',
    header: 'Última Modificação',
    cell: ({ row }) => {
      const updatedAt = row.getValue('updatedAt') as string
      const date = new Date(updatedAt)
      return (
        <div className="text-sm text-gray-600">
          {date.toLocaleDateString('pt-BR')}
        </div>
      )
    },
  })

  // Add último contato column if it exists in custom fields
  const ultimoContatoField = customFields.find(field => 
    field.id.toLowerCase().includes('contato') || 
    field.name.toLowerCase().includes('contato')
  )
  
  if (ultimoContatoField) {
    columns.push({
      accessorKey: `customFields.${ultimoContatoField.id}`,
      header: 'Último Contato',
      cell: ({ row }) => {
        const value = row.original.customFields[ultimoContatoField.id]
        if (!value) {
          return <span className="text-gray-400">—</span>
        }
        
        if (ultimoContatoField.type === 'date') {
          const date = new Date(value as string)
          return (
            <div className="text-sm text-gray-600">
              {date.toLocaleDateString('pt-BR')}
            </div>
          )
        }
        
        return (
          <div className="text-sm text-gray-600">
            {String(value)}
          </div>
        )
      },
    })
  }

  // Add actions column (compact, appears on row hover)
  columns.push({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const client = row.original

      return (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 hover:bg-blue-100"
            onClick={(e) => {
              e.stopPropagation()
              onEditClient?.(client.id)
            }}
            title="Editar cliente"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 hover:bg-red-100"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteClient?.(client.id)
            }}
            title="Excluir cliente"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      )
    },
  })

  return columns
}

// Default columns for backward compatibility
export const columns = createColumns()