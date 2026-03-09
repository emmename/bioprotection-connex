import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/AuthContext';
import { Shield, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Permission {
    id: string;
    description: string;
}

interface Role {
    id: string;
    name: string;
    description: string;
    role_permissions: { permission_id: string }[];
}

export default function AdminRoles() {
    const { hasPermission } = usePermissions();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

    // Check if user is allowed to view this page
    // Although AdminLayout checks isAdmin, we check specific permission here just to be safe or to restrict what they can do
    const canManageRoles = hasPermission('manage_roles');

    const { data: permissions = [] } = useQuery({
        queryKey: ['permissions'],
        queryFn: async () => {
            const { data, error } = await supabase.from('permissions').select('*').order('id');
            if (error) throw error;
            return data as Permission[];
        },
        enabled: canManageRoles,
    });

    const { data: roles = [], isLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('roles')
                .select(`
          id,
          name,
          description,
          role_permissions (
            permission_id
          )
        `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as Role[];
        },
        enabled: canManageRoles,
    });

    const saveRoleMutation = useMutation({
        mutationFn: async () => {
            if (editingRole) {
                // Update Role
                const { error: roleError } = await supabase
                    .from('roles')
                    .update({ name: formData.name, description: formData.description })
                    .eq('id', editingRole.id);
                if (roleError) throw roleError;

                // Delete old permissions
                await supabase.from('role_permissions').delete().eq('role_id', editingRole.id);

                // Insert new permissions
                if (selectedPermissions.size > 0) {
                    const newPerms = Array.from(selectedPermissions).map(perm => ({
                        role_id: editingRole.id,
                        permission_id: perm
                    }));
                    const { error: permsError } = await supabase.from('role_permissions').insert(newPerms);
                    if (permsError) throw permsError;
                }
            } else {
                // Create Role
                const { data: newRole, error: roleError } = await supabase
                    .from('roles')
                    .insert({ name: formData.name, description: formData.description })
                    .select('id')
                    .single();
                if (roleError) throw roleError;

                // Insert new permissions
                if (selectedPermissions.size > 0) {
                    const newPerms = Array.from(selectedPermissions).map(perm => ({
                        role_id: newRole.id,
                        permission_id: perm
                    }));
                    const { error: permsError } = await supabase.from('role_permissions').insert(newPerms);
                    if (permsError) throw permsError;
                }
            }
        },
        onSuccess: () => {
            toast.success(editingRole ? 'อัปเดตบทบาทสำเร็จ' : 'สร้างบทบาทสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            console.error(error);
        }
    });

    const deleteRoleMutation = useMutation({
        mutationFn: async (roleId: string) => {
            const { error } = await supabase.from('roles').delete().eq('id', roleId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('ลบบทบาทสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
        onError: (error) => {
            toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
            console.error(error);
        }
    });

    const handleOpenDialog = (role?: Role) => {
        if (role) {
            setEditingRole(role);
            setFormData({ name: role.name, description: role.description || '' });
            setSelectedPermissions(new Set(role.role_permissions.map(rp => rp.permission_id)));
        } else {
            setEditingRole(null);
            setFormData({ name: '', description: '' });
            setSelectedPermissions(new Set());
        }
        setIsDialogOpen(true);
    };

    const togglePermission = (permissionId: string) => {
        const newPerms = new Set(selectedPermissions);
        if (newPerms.has(permissionId)) {
            newPerms.delete(permissionId);
        } else {
            newPerms.add(permissionId);
        }
        setSelectedPermissions(newPerms);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error('กรุณาระบุชื่อบทบาท');
            return;
        }
        saveRoleMutation.mutate();
    };

    if (!canManageRoles) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Shield className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">ไม่มีสิทธิ์เข้าถึง</h2>
                <p className="text-slate-500">คุณไม่มีสิทธิ์ในการจัดการบทบาทและการเข้าถึง</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">จัดการสิทธิ์ (Roles & Permissions)</h1>
                    <p className="text-muted-foreground">สร้างบทบาทและกำหนดสิทธิ์การเข้าถึงเมนูต่างๆ ในระบบ</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    สร้างบทบาทใหม่
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>รายการบทบาททั้งหมด</CardTitle>
                    <CardDescription>การเปลี่ยนแปลงบทบาทอาจมีผลกระทบต่อผู้ใช้งานทันที</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : roles.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            ยังไม่มีการสร้างบทบาทในระบบ
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ชื่อบทบาท</TableHead>
                                    <TableHead>รายละเอียด</TableHead>
                                    <TableHead>สิทธิ์ที่ได้รับ</TableHead>
                                    <TableHead className="w-[100px] text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roles.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium">{role.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{role.description || '-'}</TableCell>
                                        <TableCell className="flex flex-wrap gap-1">
                                            {role.role_permissions.length === 0 ? (
                                                <span className="text-sm text-slate-400">ไม่มีสิทธิ์</span>
                                            ) : (
                                                role.role_permissions.map((rp) => (
                                                    <Badge key={rp.permission_id} variant="secondary">
                                                        {rp.permission_id}
                                                    </Badge>
                                                ))
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenDialog(role)}
                                                >
                                                    <Pencil className="w-4 h-4 text-blue-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบบทบาท "${role.name}"? ผู้ใช้ที่มีบทบาทนี้จะสูญเสียสิทธิ์ทันที`)) {
                                                            deleteRoleMutation.mutate(role.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? 'แก้ไขบทบาท' : 'สร้างบทบาทใหม่'}</DialogTitle>
                        <DialogDescription>
                            กำหนดชื่อ รายละเอียด และเลือกสิทธิ์การเข้าถึงสำหรับบทบาทนี้
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">ชื่อบทบาท <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="เช่น Event Staff"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">รายละเอียดเพิ่มเติม</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="เช่น เจ้าหน้าที่สำหรับแสกนหน้างาน"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t">
                                <Label className="text-base font-semibold">เลือกสิทธิ์การเข้าถึง (Permissions)</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/30 p-4 rounded-lg border">
                                    {permissions.length === 0 ? (
                                        <p className="text-sm text-muted-foreground w-full col-span-2">ไม่พบสิทธิ์ในระบบ</p>
                                    ) : (
                                        permissions.map((perm) => (
                                            <div key={perm.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2 hover:bg-muted transition-colors">
                                                <Checkbox
                                                    id={`perm-${perm.id}`}
                                                    checked={selectedPermissions.has(perm.id)}
                                                    onCheckedChange={() => togglePermission(perm.id)}
                                                />
                                                <div className="leading-none flex flex-col gap-1">
                                                    <Label htmlFor={`perm-${perm.id}`} className="font-medium cursor-pointer">
                                                        {perm.id}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        {perm.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" disabled={saveRoleMutation.isPending}>
                                {saveRoleMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
