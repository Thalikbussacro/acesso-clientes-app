'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { Edit, Loader2 } from 'lucide-react'
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

interface EditClientDialogProps {
  isOpen: boolean
  onClose: () => void
  client: Client | null
  customFields: CustomField[]
  onClientUpdated: (client: Client) => void
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

export function EditClientDialog({
  isOpen,
  onClose,
  client,
  customFields,
  onClientUpdated,
}: EditClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create form schema based on custom fields
  const formSchema = createFormSchema(customFields)
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      ...customFields.reduce(
        (acc, field) => ({
          ...acc,
          [field.id]: field.type === 'boolean' ? false : '',
        }),
        {}
      ),
    },
  })

  // Update form values when client changes
  useEffect(() => {
    if (client && isOpen) {
      const formValues: Record<string, unknown> = {
        name: client.name,
      }

      // Set custom field values
      customFields.forEach(field => {
        const value = client.customFields[field.id]
        if (value !== undefined && value !== null) {
          if (field.type === 'date' && typeof value === 'string') {
            // Convert date string to YYYY-MM-DD format for date inputs
            try {
              const date = new Date(value)
              formValues[field.id] = date.toISOString().split('T')[0]
            } catch {
              formValues[field.id] = value
            }
          } else {
            formValues[field.id] = value
          }
        } else {
          formValues[field.id] = field.type === 'boolean' ? false : ''
        }
      })

      form.reset(formValues)
    }
  }, [client, isOpen, customFields, form])

  // Handle form submission
  const onSubmit = useCallback(async (values: Record<string, unknown>) => {
    if (!client) return

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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: client.id,
          name,
          custom_data: cleanedCustomData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar cliente')
      }

      const result = await response.json()
      onClientUpdated(result.client)
      onClose()
      
    } catch (error) {
      console.error('Error updating client:', error)
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Erro ao atualizar cliente',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [client, onClientUpdated, onClose, form])

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose()
    }
  }, [isSubmitting, onClose])

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
            <Edit className="h-5 w-5" />
            Editar Cliente
          </DialogTitle>
          <DialogDescription>
            Atualize os dados do cliente. Campos marcados como obrigatórios devem ser preenchidos.
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
                    Salvando...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Salvar Alterações
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