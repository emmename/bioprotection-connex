import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { MapPin, Eye, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MEMBER_TYPE_OPTIONS as MEMBER_TYPES_OPTIONS, MEMBER_SUB_TYPES } from '@/constants/memberTypes';

export interface EventReward {
    id?: string;
    event_id?: string;
    member_type: string | null;
    tier_name: string | null;
    points_reward: number;
    coins_reward: number;
}

export interface AdminEvent {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    start_date: string;
    end_date: string;
    is_active: boolean;
    is_visible: boolean;
    event_type: string | null;
    allowed_member_types: string[] | null;
    allowed_sub_types?: Record<string, string[]> | null;
    allowed_tiers: string[] | null;
    created_at?: string;
    updated_at?: string;
    event_rewards?: EventReward[];
}

interface EventTableProps {
    events: AdminEvent[];
    tiersData: { tier: string; display_name?: string; color?: string }[];
    onView: (id: string) => void;
    onEdit: (event: AdminEvent) => void;
    onDelete: (id: string, title: string) => void;
    onToggleStatus?: (id: string, is_active: boolean) => void;
}

export function EventTable({ events, tiersData, onView, onEdit, onDelete, onToggleStatus }: EventTableProps) {
    if (events.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                ยังไม่มีกิจกรรมในระบบ
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[300px]">ชื่อกิจกรรมและสถานที่</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>กลุ่มเป้าหมาย</TableHead>
                    <TableHead>วัน-เวลา</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="w-[150px] text-right">จัดการ</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {events.map((event) => (
                    <TableRow key={event.id}>
                        <TableCell>
                            <div className="font-medium flex items-center gap-1.5">
                                {event.title}
                                {!event.is_visible && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200">
                                        🔒 ซ่อน
                                    </Badge>
                                )}
                            </div>
                            {event.location && (
                                <div className="text-sm text-muted-foreground flex items-center mt-1">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {event.location}
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                            <Badge
                                variant="outline"
                                className={event.event_type === 'mission_event'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }
                            >
                                {event.event_type === 'mission_event' ? 'ภารกิจพิเศษ' : 'กิจกรรมทั่วไป'}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1 max-w-[200px]">
                                {/* Member Types */}
                                {event.allowed_member_types && event.allowed_member_types.length > 0 ? (
                                    <div className="flex flex-col gap-1.5 w-full">
                                        {event.allowed_member_types.map((type) => {
                                            const subTypes = event.allowed_sub_types?.[type] || [];
                                            return (
                                                <div key={type} className="border border-border/50 rounded p-1.5 bg-background">
                                                    <div className="text-[11px] font-medium text-foreground leading-none">
                                                        {MEMBER_TYPES_OPTIONS.find(t => t.value === type)?.label || type}
                                                    </div>
                                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                                        {subTypes.length > 0 ? (
                                                            subTypes.map((sub: string) => (
                                                                <Badge key={sub} variant="secondary" className="text-[9px] px-1 py-0 h-4 font-normal bg-secondary/60 text-secondary-foreground leading-none flex items-center">
                                                                    {MEMBER_SUB_TYPES[type]?.find(s => s.value === sub)?.label || sub}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground leading-none">ทุกประเภทย่อย</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground">ทุกประเภท</span>
                                )}
                                {/* Tiers */}
                                {event.allowed_tiers && event.allowed_tiers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {event.allowed_tiers.map((tier) => {
                                            const matchedTier = tiersData.find(t => t.tier === tier);
                                            const displayName = matchedTier?.display_name || tier;
                                            const customColor = matchedTier?.color;
                                            const badgeClass = customColor ? '' : (tier === 'platinum' ? 'bg-purple-600 text-white' : tier === 'gold' ? 'bg-yellow-500 text-white' : tier === 'silver' ? 'bg-gray-400 text-white' : 'bg-amber-700 text-white');

                                            return (
                                                <Badge
                                                    key={tier}
                                                    className={`text-[10px] px-1 h-fit border-0 capitalize ${badgeClass}`}
                                                    style={customColor ? { backgroundColor: customColor, color: '#fff' } : undefined}
                                                >
                                                    {displayName}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground">ทุกระดับ</span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="text-sm">
                                {format(new Date(event.start_date), 'd MMM yyyy HH:mm', { locale: th })}
                                {' - '}
                                {format(new Date(event.end_date), 'HH:mm', { locale: th })}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={event.is_active}
                                    onCheckedChange={(checked) => onToggleStatus && onToggleStatus(event.id, checked)}
                                />
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onView(event.id)}
                                    title="ดูรายละเอียด/ผู้ลงทะเบียน"
                                >
                                    <Eye className="w-4 h-4 text-slate-600" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit(event)}
                                    title="แก้ไขกิจกรรม"
                                >
                                    <Pencil className="w-4 h-4 text-blue-500" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDelete(event.id, event.title)}
                                    title="ลบกิจกรรม"
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
