'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, Search, X, Filter } from 'lucide-react'

interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'boolean'
  required: boolean
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  customFields?: CustomField[]
  enableCustomFieldFiltering?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  customFields = [],
  enableCustomFieldFiltering = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState<string>('')
  const [activeCustomFieldFilters, setActiveCustomFieldFilters] = React.useState<Record<string, string>>({})
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      // Enhanced global search that searches across name, email, phone, and custom fields
      const searchValue = String(filterValue).toLowerCase()
      if (!searchValue) return true
      
      const rowData = row.original as Record<string, unknown> & {
        name?: string
        email?: string | null
        phone?: string | null
        customFields?: Record<string, unknown>
      }
      
      // Search in main fields
      const searchFields = [rowData.name, rowData.email, rowData.phone]
        .filter(Boolean)
        .map(field => String(field).toLowerCase())
      
      // Search in custom fields
      if (rowData.customFields) {
        Object.values(rowData.customFields).forEach(value => {
          if (value !== null && value !== undefined && value !== '') {
            searchFields.push(String(value).toLowerCase())
          }
        })
      }
      
      return searchFields.some(field => field.includes(searchValue))
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  })

  // Handle custom field filter changes
  const handleCustomFieldFilterChange = (fieldId: string, value: string) => {
    const newFilters = { ...activeCustomFieldFilters }
    if (value === '' || value === 'all') {
      delete newFilters[fieldId]
    } else {
      newFilters[fieldId] = value
    }
    setActiveCustomFieldFilters(newFilters)
    
    // Update column filters
    const updatedColumnFilters = columnFilters.filter(filter => 
      !filter.id.startsWith('customFields.')
    )
    
    Object.entries(newFilters).forEach(([fieldId, filterValue]) => {
      updatedColumnFilters.push({
        id: `customFields.${fieldId}`,
        value: filterValue
      })
    })
    
    setColumnFilters(updatedColumnFilters)
    
    // Update URL
    updateURL(globalFilter, newFilters)
  }

  // Handle global filter changes
  const handleGlobalFilterChange = (value: string) => {
    setGlobalFilter(value)
    updateURL(value, activeCustomFieldFilters)
  }
  
  // Clear all filters
  const clearAllFilters = () => {
    setGlobalFilter('')
    setActiveCustomFieldFilters({})
    setColumnFilters([])
    table.resetColumnFilters()
    table.resetGlobalFilter()
    updateURL('', {})
  }

  // Get unique values for a custom field for dropdown options
  const getCustomFieldOptions = (fieldId: string) => {
    const values = new Set<string>()
    data.forEach((row) => {
      const rowData = row as Record<string, unknown> & { customFields?: Record<string, unknown> }
      const value = rowData.customFields?.[fieldId]
      if (value !== null && value !== undefined && value !== '') {
        values.add(String(value))
      }
    })
    return Array.from(values).sort()
  }

  // Check if any filters are active
  const hasActiveFilters = globalFilter !== '' || Object.keys(activeCustomFieldFilters).length > 0
  
  // Initialize filters from URL parameters
  React.useEffect(() => {
    const urlSearch = searchParams.get('search')
    const urlFilters = searchParams.get('filters')
    
    if (urlSearch) {
      setGlobalFilter(urlSearch)
    }
    
    if (urlFilters) {
      try {
        const parsedFilters = JSON.parse(urlFilters)
        setActiveCustomFieldFilters(parsedFilters)
        
        // Update column filters
        const updatedColumnFilters: ColumnFiltersState = []
        Object.entries(parsedFilters).forEach(([fieldId, filterValue]) => {
          updatedColumnFilters.push({
            id: `customFields.${fieldId}`,
            value: filterValue as string
          })
        })
        setColumnFilters(updatedColumnFilters)
      } catch (error) {
        console.error('Error parsing URL filters:', error)
      }
    }
  }, [searchParams])
  
  // Update URL when filters change
  const updateURL = React.useCallback((search: string, filters: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    
    if (Object.keys(filters).length > 0) {
      params.set('filters', JSON.stringify(filters))
    } else {
      params.delete('filters')
    }
    
    const newURL = params.toString() ? `?${params.toString()}` : ''
    router.replace(newURL, { scroll: false })
  }, [router, searchParams])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Global Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar em todos os campos..."
                value={globalFilter}
                onChange={(event) => handleGlobalFilterChange(event.target.value)}
                className="pl-8 w-80"
              />
            </div>
            
            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearAllFilters}
                className="h-8 px-2 lg:px-3"
              >
                Limpar filtros
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Column Visibility Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Colunas <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
        
        {/* Custom Fields Filters */}
        {enableCustomFieldFiltering && customFields.length > 0 && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filtros:
            </div>
            {customFields.map((field) => {
              const options = getCustomFieldOptions(field.id)
              if (options.length === 0) return null
              
              return (
                <div key={field.id} className="flex items-center space-x-2">
                  <label className="text-sm font-medium">{field.name}:</label>
                  <select
                    className="h-8 rounded border border-input bg-transparent px-2 text-sm min-w-[120px]"
                    value={activeCustomFieldFilters[field.id] || 'all'}
                    onChange={(e) => handleCustomFieldFilterChange(field.id, e.target.value)}
                  >
                    <option value="all">Todos</option>
                    {field.type === 'boolean' ? (
                      <>
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </>
                    ) : (
                      options.map((option) => (
                        <option key={option} value={option}>
                          {field.type === 'date' 
                            ? new Date(option).toLocaleDateString('pt-BR')
                            : option
                          }
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground">Filtros ativos:</span>
          {globalFilter && (
            <Badge variant="secondary" className="gap-1">
              Busca: &ldquo;{globalFilter}&rdquo;
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setGlobalFilter('')} 
              />
            </Badge>
          )}
          {Object.entries(activeCustomFieldFilters).map(([fieldId, value]) => {
            const field = customFields.find(f => f.id === fieldId)
            if (!field) return null
            
            const displayValue = field.type === 'boolean' 
              ? (value === 'true' ? 'Sim' : 'Não')
              : field.type === 'date'
              ? new Date(value).toLocaleDateString('pt-BR')
              : value
              
            return (
              <Badge key={fieldId} variant="secondary" className="gap-1">
                {field.name}: {displayValue}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleCustomFieldFilterChange(fieldId, '')} 
                />
              </Badge>
            )
          })}
        </div>
      )}
      
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} de{' '}
          {table.getFilteredRowModel().rows.length} linha(s) selecionada(s).
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Linhas por página</p>
            <select
              className="h-8 w-[70px] rounded border border-input bg-transparent px-2 text-sm"
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value))
              }}
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Página {table.getState().pagination.pageIndex + 1} de{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Ir para primeira página</span>
              {'<<'}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Página anterior</span>
              {'<'}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Próxima página</span>
              {'>'}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Ir para última página</span>
              {'>>'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}