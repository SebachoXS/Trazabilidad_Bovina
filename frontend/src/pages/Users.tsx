/**
 * @file frontend/src/pages/Users.tsx
 * @description Vista de administración de usuarios.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { adminService } from '../features/admin/api/admin.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Users as UsersIcon, Shield, MapPin, Power, CheckCircle, XCircle, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useGlobalContext } from '../store/globalContextStore';
import { useAuthStore } from '../store/authStore';

const createUsuarioSchema = z.object({
  email: z.string().email('Debe ser un correo válido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres.')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Debe contener al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&).'
    ),
  nombre: z.string().min(2, 'El nombre es obligatorio'),
  rol: z.enum(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO', 'CLIENTE'], { required_error: 'El rol es obligatorio' }),
  predioId: z.preprocess((val) => (val === 'NEW' ? val : val ? Number(val) : undefined), z.union([z.number().positive(), z.literal('NEW')])),
  nombrePredio: z.string().optional(),
  ubicacionPredio: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.predioId === 'NEW') {
    if (!data.nombrePredio || data.nombrePredio.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Requerido para nueva finca', path: ['nombrePredio'] });
    }
    if (!data.ubicacionPredio || data.ubicacionPredio.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Requerido para nueva finca', path: ['ubicacionPredio'] });
    }
  } else if (!data.predioId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El predio es obligatorio', path: ['predioId'] });
  }
});

type FormValues = z.infer<typeof createUsuarioSchema>;

export default function Users() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'activos' | 'pendientes'>('activos');

  const { selectedPredioId, selectedPropietarioId } = useGlobalContext();

  // Queries
  const { data: usuariosResponse, isLoading: isLoadingUsers, isError: isErrorUsers } = useQuery({
    queryKey: ['SUPER_ADMIN', 'PROPIETARIO', 'usuarios', selectedPredioId, selectedPropietarioId],
    queryFn: () => adminService.getUsuarios({
      predioId: selectedPredioId ? Number(selectedPredioId) : undefined,
      propietarioId: selectedPropietarioId ? Number(selectedPropietarioId) : undefined
    }),
  });

  const { data: pendientesResponse, isLoading: isLoadingPendientes, isError: isErrorPendientes } = useQuery({
    queryKey: ['SUPER_ADMIN', 'PROPIETARIO', 'usuarios', 'pendientes'],
    queryFn: () => adminService.getUsuariosPendientes(),
  });

  const { data: prediosResponse } = useQuery({
    queryKey: ['SUPER_ADMIN', 'PROPIETARIO', 'predios'],
    queryFn: () => adminService.getPredios(),
  });

  // Mutations
  const { mutateAsync: createUser, isPending: isCreating } = useMutation({
    mutationFn: adminService.createUsuario,
    onSuccess: () => {
      toast.success('Usuario creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['SUPER_ADMIN', 'PROPIETARIO', 'usuarios'] });
      setIsModalOpen(false);
      reset();
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.error?.details?.[0]?.message 
        || err.response?.data?.error?.message 
        || err.response?.data?.message 
        || 'Error al crear usuario';
      toast.error(errorMessage);
    }
  });

  const { mutateAsync: toggleStatus } = useMutation({
    mutationFn: adminService.toggleUsuarioStatus,
    onSuccess: () => {
      toast.success('Estado del usuario actualizado');
      queryClient.invalidateQueries({ queryKey: ['SUPER_ADMIN', 'PROPIETARIO', 'usuarios'] });
    },
    onError: () => toast.error('Error al cambiar el estado')
  });

  const { mutateAsync: deleteUser } = useMutation({
    mutationFn: adminService.deleteUsuario,
    onSuccess: () => {
      toast.success('Usuario eliminado del sistema');
      queryClient.invalidateQueries({ queryKey: ['SUPER_ADMIN', 'PROPIETARIO', 'usuarios'] });
    },
    onError: () => toast.error('Error al eliminar usuario')
  });

  const { mutateAsync: aprobar } = useMutation({
    mutationFn: adminService.aprobarUsuario,
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['SUPER_ADMIN', 'PROPIETARIO', 'usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['SUPER_ADMIN', 'PROPIETARIO', 'usuarios', 'pendientes'] });
    },
    onError: () => toast.error('Error al aprobar usuario')
  });

  const { mutateAsync: rechazar } = useMutation({
    mutationFn: adminService.rechazarUsuario,
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['SUPER_ADMIN', 'PROPIETARIO', 'usuarios', 'pendientes'] });
    },
    onError: () => toast.error('Error al rechazar usuario')
  });

  // Form
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(createUsuarioSchema),
    defaultValues: { rol: 'OPERARIO' }
  });

  const selectedPredioIdForm = watch('predioId');

  const { user } = useAuthStore();
  const canCreatePredio = user?.rol === 'SUPER_ADMIN' || user?.rol === 'PROPIETARIO';

  const predioOptions = prediosResponse?.data?.map(p => ({
    value: p.id.toString(),
    label: p.nombre
  })) || [];

  if (canCreatePredio) {
    predioOptions.push({ value: 'NEW', label: '* Nueva Finca (Crear Ahora)' });
  }

  const onSubmit = async (data: FormValues) => {
    await createUser(data);
  };

  const usuarios = usuariosResponse?.data || [];
  const pendientes = pendientesResponse?.data || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Administración de Usuarios</h1>
          <p className="text-gray-600 mt-1">Gestiona el acceso del personal y asigna fincas (predios).</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activos' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-950'}`}
          onClick={() => setActiveTab('activos')}
        >
          Usuarios Activos
        </button>
        <button
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pendientes' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-950'}`}
          onClick={() => setActiveTab('pendientes')}
        >
          Solicitudes de Acceso {pendientes.length > 0 && <span className="ml-2 bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs">{pendientes.length}</span>}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-brand-xl shadow-sm overflow-hidden">
        {activeTab === 'activos' && (
          isErrorUsers ? (
            <div className="bg-red-50 text-red-600 border border-red-200 p-6 rounded-xl flex flex-col items-center justify-center text-center m-6">
              <AlertTriangle className="w-10 h-10 mb-2" />
              <p className="font-bold">Error de conexión con el servidor.</p>
              <p className="text-sm mt-1">Verifica que el backend esté en ejecución (npm run dev) o revisa tu conexión a la red.</p>
            </div>
          ) : isLoadingUsers ? (
            <div className="p-16 flex justify-center text-primary"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                <th className="py-4 px-6 font-medium">Nombre / Email</th>
                <th className="py-4 px-6 font-medium">Rol</th>
                <th className="py-4 px-6 font-medium">Predio Asignado</th>
                <th className="py-4 px-6 font-medium text-center">Estado</th>
                <th className="py-4 px-6 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                        {u.nombre.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-950">{u.nombre}</p>
                        <p className="text-sm text-gray-600">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-950">
                      <Shield className="w-3 h-3" />
                      {u.rol}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-950">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      {u.predioId ? `ID: ${u.predioId}` : 'Sin predio asignado'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {u.isActive ? (
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-success"></span>
                    ) : (
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-danger"></span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => toggleStatus(u.id)}
                      className="p-2 text-gray-500 hover:text-primary transition-colors"
                      title={u.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
                          deleteUser(u.id);
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-danger transition-colors ml-2"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    <UsersIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )
        )}

        {activeTab === 'pendientes' && (
          isErrorPendientes ? (
            <div className="bg-red-50 text-red-600 border border-red-200 p-6 rounded-xl flex flex-col items-center justify-center text-center m-6">
              <AlertTriangle className="w-10 h-10 mb-2" />
              <p className="font-bold">Error de conexión con el servidor.</p>
              <p className="text-sm mt-1">Verifica que el backend esté en ejecución (npm run dev) o revisa tu conexión a la red.</p>
            </div>
          ) : isLoadingPendientes ? (
            <div className="p-16 flex justify-center text-primary"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                <th className="py-4 px-6 font-medium">Nombre / Email</th>
                <th className="py-4 px-6 font-medium">Rol Solicitado</th>
                <th className="py-4 px-6 font-medium">Predio Solicitado</th>
                <th className="py-4 px-6 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map(u => (
                <tr key={u.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                        {u.nombre.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-950">{u.nombre}</p>
                        <p className="text-sm text-gray-600">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-950">
                      <Shield className="w-3 h-3" />
                      {u.rol}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-950">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      {u.predioId ? `ID: ${u.predioId}` : 'Sin predio'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <Button variant="outline" className="text-red-400 border-red-900/50 hover:bg-red-900/20" onClick={() => rechazar(u.id)}>
                      <XCircle className="w-4 h-4 mr-2" /> Rechazar
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none" onClick={() => aprobar(u.id)}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Aprobar
                    </Button>
                  </td>
                </tr>
              ))}
              {pendientes.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    <UsersIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    No hay solicitudes de acceso pendientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )
        )}
      </div>

      {/* Modal de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 shadow-xl w-full max-w-md rounded-brand-xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-950">Registrar Usuario</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-950">×</button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <Input
                label="Nombre Completo"
                placeholder="Ej. Juan Pérez"
                {...register('nombre')}
                error={errors.nombre?.message}
              />
              <Input
                label="Correo Electrónico"
                type="email"
                placeholder="juan@ejemplo.com"
                {...register('email')}
                error={errors.email?.message}
              />
              <Input
                label="Contraseña"
                type="password"
                placeholder="Mínimo 8 caracteres"
                {...register('password')}
                error={errors.password?.message}
              />
              
              <Select
                label="Rol del Sistema"
                options={[
                  { value: 'SUPER_ADMIN', label: 'Administrador Global' },
                  { value: 'PROPIETARIO', label: 'Propietario' },
                  { value: 'VETERINARIO', label: 'Veterinario' },
                  { value: 'OPERARIO', label: 'Operario' },
                  { value: 'CLIENTE', label: 'Cliente/Estudiante' }
                ]}
                {...register('rol')}
                error={errors.rol?.message}
              />

              <Select
                label="Finca / Hacienda Asignada (predioId)"
                options={[
                  { value: '', label: 'Seleccione un predio...' },
                  ...predioOptions
                ]}
                {...register('predioId')}
                error={errors.predioId?.message}
              />

              {selectedPredioIdForm === 'NEW' && (
                <div className="space-y-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <h3 className="text-sm font-semibold text-emerald-800">Nueva Finca</h3>
                  <Input
                    label="Nombre de la Finca"
                    placeholder="Ej. Hacienda Las Margaritas"
                    {...register('nombrePredio')}
                    error={errors.nombrePredio?.message}
                  />
                  <Input
                    label="Ubicación Regional"
                    placeholder="Ej. Municipio, Departamento"
                    {...register('ubicacionPredio')}
                    error={errors.ubicacionPredio?.message}
                  />
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isCreating}>
                  Crear Usuario
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
