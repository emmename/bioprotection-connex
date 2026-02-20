import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gift, Search, Package, StickyNote, Truck, CheckCircle, Clock, XCircle, Eye, Download, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface RedemptionWithDetails {
  id: string;
  profile_id: string;
  reward_id: string;
  points_spent: number;
  shipping_address: string | null;
  notes: string | null;
  status: string;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
  profile: {
    first_name: string;
    last_name: string;
    member_id: string | null;
    phone: string | null;
  } | null;
  reward: {
    name: string;
    image_url: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "รอดำเนินการ", color: "bg-yellow-500", icon: Clock },
  processing: { label: "กำลังจัดส่ง", color: "bg-blue-500", icon: Truck },
  shipped: { label: "จัดส่งแล้ว", color: "bg-purple-500", icon: Truck },
  completed: { label: "สำเร็จ", color: "bg-green-500", icon: CheckCircle },
  cancelled: { label: "ยกเลิก", color: "bg-red-500", icon: XCircle },
};

export default function AdminRedemptions() {
  const [redemptions, setRedemptions] = useState<RedemptionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRedemption, setSelectedRedemption] = useState<RedemptionWithDetails | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [editingTrackingId, setEditingTrackingId] = useState<string | null>(null);
  const [editingTrackingValue, setEditingTrackingValue] = useState("");

  useEffect(() => {
    fetchRedemptions();
  }, []);

  const fetchRedemptions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("reward_redemptions")
      .select(`
        *,
        profile:profiles!reward_redemptions_profile_id_fkey(first_name, last_name, member_id, phone),
        reward:rewards!reward_redemptions_reward_id_fkey(name, image_url)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
      console.error(error);
    } else if (data) {
      setRedemptions(data as RedemptionWithDetails[]);
    }
    setIsLoading(false);
  };

  const openDetailDialog = (redemption: RedemptionWithDetails) => {
    setSelectedRedemption(redemption);
    setTrackingNumber(redemption.tracking_number || "");
    setDetailDialogOpen(true);
  };

  const updateStatus = async (newStatus: string) => {
    if (!selectedRedemption) return;

    setIsUpdating(true);
    const { error } = await supabase
      .from("reward_redemptions")
      .update({
        status: newStatus,
        tracking_number: trackingNumber.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", selectedRedemption.id);

    if (error) {
      toast.error("ไม่สามารถอัปเดตสถานะได้");
      console.error(error);
    } else {
      toast.success("อัปเดตสถานะเรียบร้อย");
      fetchRedemptions();
      setDetailDialogOpen(false);
    }
    setIsUpdating(false);
  };

  // Inline tracking number update
  const updateTrackingInline = async (redemptionId: string, newTracking: string) => {
    const { error } = await supabase
      .from("reward_redemptions")
      .update({
        tracking_number: newTracking.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", redemptionId);

    if (error) {
      toast.error("ไม่สามารถอัปเดตเลขพัสดุได้");
      console.error(error);
    } else {
      toast.success("อัปเดตเลขพัสดุเรียบร้อย");
      fetchRedemptions();
    }
    setEditingTrackingId(null);
  };

  // Filter redemptions
  const filteredRedemptions = redemptions.filter(r => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      r.profile?.first_name?.toLowerCase().includes(searchLower) ||
      r.profile?.last_name?.toLowerCase().includes(searchLower) ||
      r.profile?.member_id?.toLowerCase().includes(searchLower) ||
      r.reward?.name?.toLowerCase().includes(searchLower) ||
      r.notes?.toLowerCase().includes(searchLower);

    // Date range filter
    const createdDate = new Date(r.created_at);
    const matchesDateFrom = !dateFrom || createdDate >= dateFrom;
    const matchesDateTo = !dateTo || createdDate <= new Date(dateTo.getTime() + 86400000 - 1); // Include entire day

    return matchesStatus && matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const statusCounts = {
    all: redemptions.length,
    pending: redemptions.filter(r => r.status === "pending").length,
    processing: redemptions.filter(r => r.status === "processing").length,
    shipped: redemptions.filter(r => r.status === "shipped").length,
    completed: redemptions.filter(r => r.status === "completed").length,
    cancelled: redemptions.filter(r => r.status === "cancelled").length,
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "วันที่",
      "รหัสสมาชิก",
      "ชื่อ-นามสกุล",
      "เบอร์โทรศัพท์",
      "ของรางวัล",
      "คะแนนที่ใช้",
      "หมายเหตุ",
      "ที่อยู่จัดส่ง",
      "สถานะ",
      "เลขพัสดุ",
    ];

    const rows = filteredRedemptions.map(r => [
      format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
      r.profile?.member_id || "-",
      `${r.profile?.first_name || ""} ${r.profile?.last_name || ""}`.trim() || "-",
      r.profile?.phone || "-",
      r.reward?.name || "-",
      r.points_spent.toString(),
      r.notes || "-",
      r.shipping_address || "-",
      statusConfig[r.status]?.label || r.status,
      r.tracking_number || "-",
    ]);

    // Build CSV content with BOM for Thai encoding
    const BOM = "\uFEFF";
    const csvContent = BOM + [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `redemptions_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`ส่งออก ${filteredRedemptions.length} รายการเรียบร้อย`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">รายการแลกของรางวัล</h1>
        <p className="text-muted-foreground">จัดการคำขอแลกของรางวัลจากสมาชิก</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          className={`cursor-pointer transition-all ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{statusCounts.all}</div>
            <div className="text-xs text-muted-foreground">ทั้งหมด</div>
          </CardContent>
        </Card>
        {Object.entries(statusConfig).map(([key, config]) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all ${statusFilter === key ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(key)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{statusCounts[key as keyof typeof statusCounts]}</div>
              <div className="text-xs text-muted-foreground">{config.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              รายการแลกของรางวัล ({filteredRedemptions.length})
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาสมาชิก, ของรางวัล, หมายเหตุ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Button variant="outline" onClick={exportToCSV} disabled={filteredRedemptions.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                ส่งออก CSV
              </Button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">สถานะ:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด ({statusCounts.all})</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-3 h-3" />
                          {config.label} ({statusCounts[key as keyof typeof statusCounts]})
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">วันที่:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "d MMM yy", { locale: th }) : "ตั้งแต่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-sm text-muted-foreground">-</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "d MMM yy", { locale: th }) : "ถึง"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Clear all filters */}
            {(statusFilter !== "all" || dateFrom || dateTo || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setDateFrom(undefined);
                  setDateTo(undefined);
                  setSearchQuery("");
                }}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : filteredRedemptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">ไม่พบรายการ</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">วันที่</TableHead>
                    <TableHead className="min-w-[150px]">สมาชิก</TableHead>
                    <TableHead className="min-w-[150px]">ของรางวัล</TableHead>
                    <TableHead className="w-24">คะแนน</TableHead>
                    <TableHead className="min-w-[150px]">หมายเหตุ</TableHead>
                    <TableHead className="w-28">สถานะ</TableHead>
                    <TableHead className="min-w-[140px]">เลขพัสดุ</TableHead>
                    <TableHead className="w-20 text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRedemptions.map((redemption) => {
                    const StatusIcon = statusConfig[redemption.status]?.icon || Clock;
                    return (
                      <TableRow key={redemption.id}>
                        <TableCell className="text-sm">
                          {format(new Date(redemption.created_at), "d MMM yy", { locale: th })}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(redemption.created_at), "HH:mm น.")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {redemption.profile?.first_name} {redemption.profile?.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {redemption.profile?.member_id || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {redemption.reward?.image_url ? (
                              <img
                                src={redemption.reward.image_url}
                                alt=""
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium">{redemption.reward?.name || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{redemption.points_spent.toLocaleString()}</Badge>
                        </TableCell>
                        <TableCell>
                          {redemption.notes ? (
                            <div className="flex items-start gap-1 max-w-[200px]">
                              <StickyNote className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground line-clamp-2">
                                {redemption.notes}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig[redemption.status]?.color || "bg-gray-500"} text-white`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[redemption.status]?.label || redemption.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {editingTrackingId === redemption.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingTrackingValue}
                                onChange={(e) => setEditingTrackingValue(e.target.value)}
                                className="h-8 w-[100px] text-xs"
                                placeholder="กรอกเลขพัสดุ"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateTrackingInline(redemption.id, editingTrackingValue);
                                  } else if (e.key === "Escape") {
                                    setEditingTrackingId(null);
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => updateTrackingInline(redemption.id, editingTrackingValue)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => setEditingTrackingId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingTrackingId(redemption.id);
                                setEditingTrackingValue(redemption.tracking_number || "");
                              }}
                              className="text-sm hover:bg-muted px-2 py-1 rounded cursor-pointer min-w-[80px] text-left"
                            >
                              {redemption.tracking_number || (
                                <span className="text-muted-foreground">+ เพิ่ม</span>
                              )}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetailDialog(redemption)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>รายละเอียดการแลกของรางวัล</DialogTitle>
          </DialogHeader>
          {selectedRedemption && (
            <div className="space-y-4">
              {/* Member Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="font-medium">ข้อมูลสมาชิก</div>
                <div className="text-sm space-y-1">
                  <div>ชื่อ: {selectedRedemption.profile?.first_name} {selectedRedemption.profile?.last_name}</div>
                  <div>รหัสสมาชิก: {selectedRedemption.profile?.member_id || "-"}</div>
                  <div>โทรศัพท์: {selectedRedemption.profile?.phone || "-"}</div>
                </div>
              </div>

              {/* Reward Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="font-medium">ของรางวัล</div>
                <div className="flex items-center gap-3">
                  {selectedRedemption.reward?.image_url ? (
                    <img
                      src={selectedRedemption.reward.image_url}
                      alt=""
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-background rounded flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{selectedRedemption.reward?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ใช้คะแนน: {selectedRedemption.points_spent.toLocaleString()} คะแนน
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-2">
                <Label>ที่อยู่จัดส่ง</Label>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  {selectedRedemption.shipping_address || "-"}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4" />
                  หมายเหตุจากสมาชิก
                </Label>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  {selectedRedemption.notes || <span className="text-muted-foreground">ไม่มีหมายเหตุ</span>}
                </div>
              </div>

              {/* Tracking Number */}
              <div className="space-y-2">
                <Label htmlFor="tracking">เลขพัสดุ</Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="กรอกเลขพัสดุ"
                />
              </div>

              {/* Status Update */}
              <div className="space-y-2">
                <Label>อัปเดตสถานะ</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <Button
                        key={key}
                        size="sm"
                        variant={selectedRedemption.status === key ? "default" : "outline"}
                        className={selectedRedemption.status === key ? config.color : ""}
                        onClick={() => updateStatus(key)}
                        disabled={isUpdating}
                      >
                        <Icon className="w-4 h-4 mr-1" />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div>สร้างเมื่อ: {format(new Date(selectedRedemption.created_at), "d MMMM yyyy HH:mm", { locale: th })}</div>
                <div>อัปเดตล่าสุด: {format(new Date(selectedRedemption.updated_at), "d MMMM yyyy HH:mm", { locale: th })}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
