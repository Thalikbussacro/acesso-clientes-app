'use client'

import { useState, useCallback } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2 } from 'lucide-react'
import { getAuthToken } from '@/lib/auth-client'

// Types
interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'boolean'
  required: boolean
}

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  customFields: Record<string, unknown>
}

interface AddClientDialogProps {
  isOpen: boolean
  onClose: () => void
  databaseId: string
  customFields: CustomField[]
  onClientCreated: (client: Client) => void
}

// Create dynamic form schema based on custom fields
function createFormSchema(customFields: CustomField[]) {
  const schemaObject: Record<string, z.ZodType> = {
    name: z
      .string()
      .min(1, 'Nome é obrigatório')
      .min(2, 'Nome deve ter pelo menos 2 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres'),
  }

  customFields.forEach(field => {
    let fieldSchema: z.ZodType

    switch (field.type) {
      case 'email':
        fieldSchema = z.string().email('Email inválido')
        break
      case 'phone':
        fieldSchema = z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos')
        break
      case 'number':
        fieldSchema = z.coerce.number().min(0, 'Deve ser um número positivo')
        break
      case 'date':
        fieldSchema = z.string().refine(val => !isNaN(Date.parse(val)), 'Data inválida')
        break
      case 'boolean':
        fieldSchema = z.boolean()
        break
      default:
        fieldSchema = z.string()
    }

    if (!field.required) {
      fieldSchema = fieldSchema.optional().or(z.literal(''))
    } else {
      if (field.type !== 'boolean') {
        if (field.type === 'number') {
          // Number schema already has min validation above
        } else {
          // For string-based schemas
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.name} é obrigatório`)
        }
      }
    }

    schemaObject[field.id] = fieldSchema
  })

  return z.object(schemaObject)
}

export function AddClientDialog({
  isOpen,
  onClose,
  databaseId,
  customFields,
  onClientCreated,
}: AddClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create form schema based on custom fields
  const formSchema = createFormSchema(customFields)
  
  // Create default values
  const defaultValues = customFields.reduce(
    (acc, field) => ({
      ...acc,
      [field.id]: field.type === 'boolean' ? false : '',
    }),
    { name: '' }
  )

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  // Handle form submission
  const onSubmit = useCallback(async (values: Record<string, unknown>) => {
    setIsSubmitting(true)

    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      // Prepare custom data (exclude 'name' as it's a separate field)
      const { name, ...customData } = values
      
      // Convert empty strings to null for optional fields
      const cleanedCustomData = Object.entries(customData).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: value === '' ? null : value,
        }),
        {}
      )

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          database_id: databaseId,
          custom_data: cleanedCustomData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar cliente')
      }

      const result = await response.json()
      onClientCreated(result.client)
      form.reset()
      onClose()
      
    } catch (error) {
      console.error('Error creating client:', error)
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Erro ao criar cliente',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [databaseId, onClientCreated, onClose, form])

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      form.reset()
      onClose()
    }
  }, [isSubmitting, form, onClose])

  // Render form field based on custom field type
  const renderFormField = (field: CustomField) => (
    <FormField
      key={field.id}
      control={form.control}
      name={field.id}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            {field.name}
            {field.required && <Badge variant="outline" className="text-xs">Obrigatório</Badge>}
          </FormLabel>
          <FormControl>
            {field.type === 'boolean' ? (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={Boolean(formField.value)}
                  onCheckedChange={formField.onChange}
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-600">Sim</span>
              </div>
            ) : (
              <Input
                {...formField}
                value={String(formField.value || '')}
                type={
                  field.type === 'email' ? 'email' :
                  field.type === 'phone' ? 'tel' :
                  field.type === 'number' ? 'number' :
                  field.type === 'date' ? 'date' : 'text'
                }
                placeholder={
                  field.type === 'email' ? 'exemplo@email.com' :
                  field.type === 'phone' ? '(11) 99999-9999' :
                  field.type === 'number' ? '0' :
                  field.type === 'date' ? 'dd/mm/aaaa' :
                  `Digite ${field.name.toLowerCase()}...`
                }
                disabled={isSubmitting}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente. Campos marcados como obrigatórios devem ser preenchidos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name field (always required) */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Nome
                    <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={String(field.value || '')}
                      placeholder="Digite o nome do cliente..."
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dynamic custom fields */}
            {customFields.map(renderFormField)}

            {/* Root error message */}
            {form.formState.errors.root && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Cliente
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}