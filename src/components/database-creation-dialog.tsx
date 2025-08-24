'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Database } from 'lucide-react'

// Custom field schema
const customFieldSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome do campo é obrigatório')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Nome deve começar com letra e conter apenas letras, números e _')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  type: z.enum(['text', 'number', 'date']),
  label: z
    .string()
    .min(1, 'Rótulo do campo é obrigatório')
    .max(100, 'Rótulo deve ter no máximo 100 caracteres'),
})

// Main form schema
const databaseCreationSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da base de dados é obrigatório')
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/, 'Nome contém caracteres inválidos'),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres'),
  confirmPassword: z.string(),
  timeoutMinutes: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(60),
    z.literal(120),
    z.number().min(5).max(480), // 5 min to 8 hours for custom
  ]),
  customFields: z.array(customFieldSchema),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
}).refine((data) => {
  // Check for duplicate custom field names
  const names = data.customFields.map(field => field.name.toLowerCase())
  return names.length === new Set(names).size
}, {
  message: 'Nomes de campos personalizados devem ser únicos',
  path: ['customFields'],
})

type DatabaseCreationForm = z.infer<typeof databaseCreationSchema>

const TIMEOUT_PRESETS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
]

interface DatabaseCreationDialogProps {
  trigger: React.ReactNode
  onSubmit?: (data: DatabaseCreationForm) => void
}

export function DatabaseCreationDialog({ trigger, onSubmit }: DatabaseCreationDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<DatabaseCreationForm>({
    resolver: zodResolver(databaseCreationSchema),
    defaultValues: {
      name: '',
      password: '',
      confirmPassword: '',
      timeoutMinutes: 30,
      customFields: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'customFields',
  })

  const handleSubmit = async (data: DatabaseCreationForm) => {
    setIsSubmitting(true)
    try {
      // This will be connected to API in stage 3.4
      console.log('Database creation data:', data)
      onSubmit?.(data)
      
      // Reset form and close dialog
      form.reset()
      setIsOpen(false)
    } catch (error) {
      console.error('Error creating database:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCustomField = () => {
    append({
      name: '',
      type: 'text',
      label: '',
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Nova Base de Dados
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Base de Dados</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Clientes Principais" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha de Acesso</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="timeoutMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo Limite de Sessão</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tempo limite" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIMEOUT_PRESETS.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value.toString()}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Custom Fields */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Campos Personalizados</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomField}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Campo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Nenhum campo personalizado adicionado.
                    <br />
                    Clique em &quot;Adicionar Campo&quot; para criar campos específicos para seus clientes.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Campo {index + 1}</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name={`customFields.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome do Campo</FormLabel>
                                <FormControl>
                                  <Input placeholder="campo_exemplo" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`customFields.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {FIELD_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`customFields.${index}.label`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rótulo</FormLabel>
                                <FormControl>
                                  <Input placeholder="Campo de Exemplo" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar Base de Dados'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}