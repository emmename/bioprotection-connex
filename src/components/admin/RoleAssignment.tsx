import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/AuthContext';
import { Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface RoleAssignmentProps {
    userId: string | null;
}

interface Role {
    id: string;
    name: string;
    description: string;
}

export function RoleAssignment({ userId }: RoleAssignmentProps) {
    const { hasPermission } = usePermissions();
    const queryClient = useQueryClient();
    const canManageRoles = hasPermission('manage_roles');

    const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const { data, error } = await supabase.from('roles').select('*').order('name');
            if (error) throw error;
            return data as Role[];
        },
        enabled: canManageRoles && !!userId,
    });

    const { data: userCustomRoles = [], isLoading: isLoadingUserRoles } = useQuery({
        queryKey: ['user_custom_roles', userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('user_custom_roles')
                .select('role_id')
                .eq('user_id', userId);
            if (error) throw error;
            return data.map(r => r.role_id);
        },
        enabled: canManageRoles && !!userId,
    });

    const { data: isLegacyAdmin = false, isLoading: isLoadingLegacyAdmin } = useQuery({
        queryKey: ['user_roles_admin', userId],
        queryFn: async () => {
            if (!userId) return false;
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .eq('role', 'admin')
                .maybeSingle();
            if (error && error.code !== 'PGRST116') throw error;
            return !!data;
        },
        enabled: canManageRoles && !!userId,
    });

    const toggleCustomRoleMutation = useMutation({
        mutationFn: async ({ roleId, assign }: { roleId: string; assign: boolean }) => {
            if (!userId) throw new Error("No user ID");
            if (assign) {
                const { error } = await supabase.from('user_custom_roles').insert({ user_id: userId, role_id: roleId });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('user_custom_roles').delete().eq('user_id', userId).eq('role_id', roleId);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success('อัปเดตบทบาทสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['user_custom_roles', userId] });
        },
        onError: (error) => {
            console.error('Error toggling role:', error);
            toast.error('ไม่สามารถอัปเดตบทบาทได้');
        }
    });

    const toggleLegacyAdminMutation = useMutation({
        mutationFn: async (assign: boolean) => {
            if (!userId) throw new Error("No user ID");
            if (assign) {
                const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success('อัปเดตสิทธิ์ผู้ดูแลระบบสูงสุดสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['user_roles_admin', userId] });
        },
        onError: (error) => {
            console.error('Error toggling legacy admin:', error);
            toast.error('ไม่สามารถอัปเดตสิทธิ์ผู้ดูแลระบบได้');
        }
    });

    if (!canManageRoles) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">ไม่มีสิทธิ์จัดการบทบาท</h3>
                    <p className="text-sm text-muted-foreground mt-1">คุณไม่ได้รับสิทธิ์ในการจัดการบทบาทและการเข้าถึง</p>
                </CardContent>
            </Card>
        );
    }

    if (!userId) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-amber-500 mb-4 opacity-70" />
                    <h3 className="text-lg font-medium">ยังไม่ผูกบัญชีผู้ใช้</h3>
                    <p className="text-sm text-muted-foreground mt-1 text-balance">
                        สมาชิกท่านนี้ยังไม่ได้ทำการเชื่อมต่อกับบัญชีเข้าสู่ระบบ (Auth User)
                        จึงไม่สามารถกำหนดบทบาทการเข้าถึงระบบได้
                    </p>
                </CardContent>
            </Card>
        );
    }

    const isLoading = isLoadingRoles || isLoadingUserRoles || isLoadingLegacyAdmin;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        ผู้ดูแลระบบสูงสุด (Super Admin)
                    </CardTitle>
                    <CardDescription>
                        ผู้ดูแลระบบสูงสุดสามารถเข้าถึงได้ทุกส่วนของระบบ โดยไม่ต้องกำหนดสิทธิ์ย่อย
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                        <div className="space-y-0.5">
                            <Label htmlFor="legacy-admin" className="text-base font-semibold">ให้สิทธิ์ Super Admin</Label>
                            <p className="text-sm text-muted-foreground">
                                ผู้ใช้จะกลายเป็นผู้ดูแลระบบที่มีสิทธิ์สูงสุดทันที
                            </p>
                        </div>
                        <Switch
                            id="legacy-admin"
                            checked={isLegacyAdmin}
                            disabled={isLoading || toggleLegacyAdminMutation.isPending}
                            onCheckedChange={(checked) => toggleLegacyAdminMutation.mutate(checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>บทบาทผู้ปฏิบัติงาน (Dynamic Roles)</CardTitle>
                    <CardDescription>
                        กำหนดบทบาทเฉพาะเจาะจงให้กับผู้ใช้งาน เช่น พนักงานสแกน QR Code หน้างานกิจกรรม
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-8 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : roles.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground border rounded-lg bg-slate-50">
                            ไม่มีบทบาทในระบบ กรุณาสร้างบทบาทใหม่ที่เมนู "จัดการสิทธิ์"
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {roles.map((role) => (
                                <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="space-y-0.5">
                                        <Label htmlFor={`role-${role.id}`} className="text-base font-medium cursor-pointer">
                                            {role.name}
                                        </Label>
                                        {role.description && (
                                            <p className="text-sm text-muted-foreground">
                                                {role.description}
                                            </p>
                                        )}
                                    </div>
                                    <Switch
                                        id={`role-${role.id}`}
                                        checked={userCustomRoles.includes(role.id)}
                                        disabled={toggleCustomRoleMutation.isPending}
                                        onCheckedChange={(checked) => toggleCustomRoleMutation.mutate({ roleId: role.id, assign: checked })}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
