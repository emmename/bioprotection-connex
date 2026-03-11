import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Target, Users, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { MEMBER_TYPE_OPTIONS as MEMBER_TYPES, MEMBER_SUB_TYPES } from '@/constants/memberTypes';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  mission_type: string;
  points_reward: number;
  coins_reward: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  qr_code: string | null;
  location: string | null;
  created_at: string;
  completion_count?: number;
  requirements?: {
    targeting?: {
      member_types?: string[];
      sub_types?: Record<string, string[]>;
      tiers?: string[];
    };
    reward_overrides?: Array<{ type: string; value: string; sub_type?: string; points: number; coins: number }>;
    [key: string]: unknown;
  } | null;
}

const MISSION_TYPE_LABELS: Record<string, string> = {
  qr_scan: 'สแกน QR Code',
  location_visit: 'Check-in',
  survey: 'ทำแบบสำรวจ',
  special: 'ภารกิจพิเศษ',
};

const MISSION_TYPE_BADGE_CLASSES: Record<string, string> = {
  qr_scan: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  location_visit: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  survey: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  special: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
};

interface MissionTableProps {
  missions: Mission[];
  isLoading: boolean;
  tierSettings: Array<{ tier: string; display_name?: string; color?: string }> | undefined;
  onEdit: (mission: Mission) => void;
  onDelete: (id: string) => void;
  onToggleActive: (mission: Mission) => void;
  onViewCompletions: (mission: Mission) => void;
  onDuplicate: (mission: Mission) => void;
}

export function MissionTable({
  missions,
  isLoading,
  tierSettings,
  onEdit,
  onDelete,
  onToggleActive,
  onViewCompletions,
  onDuplicate,
}: MissionTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          รายการภารกิจ ({missions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
        ) : missions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">ยังไม่มีภารกิจ</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">ชื่อภารกิจ</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>กลุ่มเป้าหมาย</TableHead>
                  <TableHead>รางวัล</TableHead>
                  <TableHead>ระยะเวลา</TableHead>
                  <TableHead className="text-center">ทำสำเร็จ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missions.map(mission => (
                  <TableRow key={mission.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{mission.title}</p>
                        {mission.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{mission.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={MISSION_TYPE_BADGE_CLASSES[mission.mission_type] || ''}>
                        {MISSION_TYPE_LABELS[mission.mission_type] || mission.mission_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        {/* Member type targeting badges */}
                        {mission.requirements?.targeting?.member_types && mission.requirements.targeting.member_types.length > 0 ? (
                          <div className="flex flex-col gap-1.5 w-full">
                            {mission.requirements.targeting.member_types.map((type: string) => {
                              const subTypes = (mission.requirements as Record<string, unknown>)?.targeting
                                ? ((mission.requirements as Record<string, unknown>).targeting as Record<string, unknown>)?.sub_types
                                  ? (((mission.requirements as Record<string, unknown>).targeting as Record<string, unknown>).sub_types as Record<string, string[]>)?.[type] || []
                                  : []
                                : [];

                              return (
                                <div key={type} className="border border-border/50 rounded p-1.5 bg-background">
                                  <div className="text-[11px] font-medium text-foreground leading-none">
                                    {MEMBER_TYPES.find(t => t.value === type)?.label || type}
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
                        {/* Tier targeting badges */}
                        {mission.requirements?.targeting?.tiers && mission.requirements.targeting.tiers.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {mission.requirements.targeting.tiers.map((tier: string) => {
                              const matchedTier = tierSettings?.find(t => t.tier === tier);
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
                      <div className="flex flex-col gap-1">
                        {mission.points_reward > 0 && (
                          <span className="text-xs">⭐ {mission.points_reward} คะแนน</span>
                        )}
                        {mission.coins_reward > 0 && (
                          <span className="text-xs">🪙 {mission.coins_reward} เหรียญ</span>
                        )}
                        {mission.requirements?.reward_overrides && mission.requirements.reward_overrides.length > 0 && (
                          <span className="text-[10px] text-amber-600">+ เพิ่มเติมตามเงื่อนไข</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {mission.start_date && (
                          <p>{format(new Date(mission.start_date), 'd MMM yy', { locale: th })}</p>
                        )}
                        {mission.end_date && (
                          <p className="text-muted-foreground">ถึง {format(new Date(mission.end_date), 'd MMM yy', { locale: th })}</p>
                        )}
                        {!mission.start_date && !mission.end_date && (
                          <span className="text-muted-foreground">ไม่จำกัด</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => onViewCompletions(mission)}
                      >
                        <Users className="h-3.5 w-3.5" />
                        {mission.completion_count || 0}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Switch checked={mission.is_active} onCheckedChange={() => onToggleActive(mission)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="แก้ไข" onClick={() => onEdit(mission)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="คัดลอกภารกิจ" onClick={() => onDuplicate(mission)}>
                          <Copy className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" title="ลบ" onClick={() => onDelete(mission.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { Mission };
