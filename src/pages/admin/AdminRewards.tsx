import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Image, ZoomIn, Tag, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { RewardImageLightbox } from "@/components/rewards/RewardImageLightbox";
import { RewardCategoryManager } from "@/components/admin/RewardCategoryManager";
import type { Database } from "@/integrations/supabase/types";
type TierLevel = Database["public"]["Enums"]["tier_level"];
interface TierPointsCost {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}
interface Reward {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  images: string[] | null;
  points_cost: number;
  tier_points_cost: TierPointsCost | null;
  stock_quantity: number;
  target_tiers: TierLevel[] | null;
  is_active: boolean;
  created_at: string;
  category: string | null;
}
interface RewardCategory {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}
const defaultTierPointsCost: TierPointsCost = {
  bronze: 0,
  silver: 0,
  gold: 0,
  platinum: 0
};
export default function AdminRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxRewardName, setLightboxRewardName] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    images: [] as string[],
    tier_points_cost: {
      ...defaultTierPointsCost
    },
    stock_quantity: 0,
    target_tiers: [] as TierLevel[],
    is_active: true,
    category: "general"
  });
  const [categoryOptions, setCategoryOptions] = useState<RewardCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const tiers: TierLevel[] = ["bronze", "silver", "gold", "platinum"];
  const tierLabels: Record<TierLevel, string> = {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum"
  };
  useEffect(() => {
    fetchRewards();
    fetchCategories();
  }, []);
  const fetchCategories = async () => {
    const {
      data,
      error
    } = await supabase.from("reward_categories").select("id, name, slug, is_active").order("sort_order", {
      ascending: true
    });
    if (!error && data) {
      setCategoryOptions(data);
    }
  };
  const fetchRewards = async () => {
    setIsLoading(true);
    const {
      data,
      error
    } = await supabase.from("rewards").select("*").order("created_at", {
      ascending: false
    });
    if (error) {
      toast.error("ไม่สามารถโหลดข้อมูลของรางวัลได้");
      console.error(error);
    } else if (data) {
      const mappedRewards: Reward[] = data.map(item => ({
        ...item,
        tier_points_cost: item.tier_points_cost as unknown as TierPointsCost | null
      }));
      setRewards(mappedRewards);
    }
    setIsLoading(false);
  };
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      images: [],
      tier_points_cost: {
        ...defaultTierPointsCost
      },
      stock_quantity: 0,
      target_tiers: [] as TierLevel[],
      is_active: true,
      category: "general"
    });
    setEditingReward(null);
  };
  const openEditDialog = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || "",
      images: reward.images || (reward.image_url ? [reward.image_url] : []),
      tier_points_cost: reward.tier_points_cost as TierPointsCost || {
        bronze: reward.points_cost,
        silver: reward.points_cost,
        gold: reward.points_cost,
        platinum: reward.points_cost
      },
      stock_quantity: reward.stock_quantity,
      target_tiers: reward.target_tiers || [],
      is_active: reward.is_active,
      category: reward.category || "general"
    });
    setIsDialogOpen(true);
  };
  const handleImagesChange = (newImages: string[]) => {
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };
  const handleTierToggle = (tier: TierLevel) => {
    setFormData(prev => ({
      ...prev,
      target_tiers: prev.target_tiers.includes(tier) ? prev.target_tiers.filter(t => t !== tier) : [...prev.target_tiers, tier]
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อของรางวัล");
      return;
    }
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      image_url: formData.images[0] || null,
      images: formData.images,
      points_cost: formData.tier_points_cost.bronze,
      // Use bronze as default
      tier_points_cost: formData.tier_points_cost,
      stock_quantity: formData.stock_quantity,
      target_tiers: formData.target_tiers.length > 0 ? formData.target_tiers : null,
      is_active: formData.is_active,
      category: formData.category
    };
    if (editingReward) {
      const {
        error
      } = await supabase.from("rewards").update(payload).eq("id", editingReward.id);
      if (error) {
        toast.error("ไม่สามารถอัปเดตของรางวัลได้");
        console.error(error);
      } else {
        toast.success("อัปเดตของรางวัลเรียบร้อย");
        fetchRewards();
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const {
        error
      } = await supabase.from("rewards").insert([payload]);
      if (error) {
        toast.error("ไม่สามารถเพิ่มของรางวัลได้");
        console.error(error);
      } else {
        toast.success("เพิ่มของรางวัลเรียบร้อย");
        fetchRewards();
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบของรางวัลนี้?")) return;
    const {
      error
    } = await supabase.from("rewards").delete().eq("id", id);
    if (error) {
      toast.error("ไม่สามารถลบของรางวัลได้");
      console.error(error);
    } else {
      toast.success("ลบของรางวัลเรียบร้อย");
      fetchRewards();
    }
  };
  const toggleActive = async (reward: Reward) => {
    const {
      error
    } = await supabase.from("rewards").update({
      is_active: !reward.is_active
    }).eq("id", reward.id);
    if (error) {
      toast.error("ไม่สามารถอัปเดตสถานะได้");
    } else {
      fetchRewards();
    }
  };
  const getTierBadgeColor = (tier: TierLevel) => {
    switch (tier) {
      case "bronze":
        return "bg-amber-700 text-white";
      case "silver":
        return "bg-gray-400 text-white";
      case "gold":
        return "bg-yellow-500 text-white";
      case "platinum":
        return "bg-purple-600 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Filter rewards by category
  const filteredRewards = categoryFilter === "all"
    ? rewards
    : rewards.filter(r => r.category === categoryFilter);

  return <div className="space-y-6">
    {/* Page Header */}
    <div>
      <h1 className="text-2xl font-bold">จัดการของรางวัล</h1>
      <p className="text-muted-foreground">จัดการของรางวัลสำหรับแลกคะแนน</p>
    </div>

    {/* Category Manager */}
    <RewardCategoryManager onCategoriesChange={fetchCategories} />

    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          รายการของรางวัลทั้งหมด ({filteredRewards.length})
        </CardTitle>
        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                {categoryOptions.map(cat => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={open => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มของรางวัล
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingReward ? "แก้ไขของรางวัล" : "เพิ่มของรางวัลใหม่"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อของรางวัล *</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({
                    ...prev,
                    name: e.target.value
                  }))} placeholder="เช่น เสื้อยืด Elanco" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">รายละเอียด</Label>
                  <Textarea id="description" value={formData.description} onChange={e => setFormData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))} placeholder="รายละเอียดของรางวัล" rows={3} />
                </div>

                {/* Multiple Images - Upload */}
                <div className="space-y-2">
                  <Label>รูปภาพของรางวัล</Label>
                  <ImageUploader images={formData.images} onImagesChange={handleImagesChange} bucket="reward-images" maxImages={10} />
                </div>

                {/* Tier-specific Points Cost */}
                <div className="space-y-3">
                  <Label>คะแนนที่ใช้แลกตาม Tier</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {tiers.map(tier => <div key={tier} className="space-y-1">
                      <Label htmlFor={`points-${tier}`} className="text-sm">
                        <Badge className={getTierBadgeColor(tier)}>{tierLabels[tier]}</Badge>
                      </Label>
                      <Input id={`points-${tier}`} type="number" min="0" value={formData.tier_points_cost[tier as keyof TierPointsCost]} onChange={e => setFormData(prev => ({
                        ...prev,
                        tier_points_cost: {
                          ...prev.tier_points_cost,
                          [tier]: parseInt(e.target.value) || 0
                        }
                      }))} placeholder="คะแนน" />
                    </div>)}
                  </div>
                </div>

                {/* Stock Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="stock">จำนวนสต๊อก</Label>
                  <Input id="stock" type="number" min="0" value={formData.stock_quantity} onChange={e => setFormData(prev => ({
                    ...prev,
                    stock_quantity: parseInt(e.target.value) || 0
                  }))} />
                </div>

                {/* Target Tiers */}
                <div className="space-y-3">
                  <Label>Tier ที่สามารถแลกได้ (ว่างไว้ = ทุก Tier)</Label>
                  <div className="flex flex-wrap gap-2">
                    {tiers.map(tier => <Badge key={tier} variant={formData.target_tiers.includes(tier) ? "default" : "outline"} className={`cursor-pointer ${formData.target_tiers.includes(tier) ? getTierBadgeColor(tier) : ''}`} onClick={() => handleTierToggle(tier)}>
                      {tierLabels[tier]}
                    </Badge>)}
                  </div>
                </div>

                {/* Category Select */}
                <div className="space-y-2">
                  <Label>หมวดหมู่</Label>
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map(cat => <Badge key={cat.id} variant={formData.category === cat.slug ? "default" : "outline"} className={cn("cursor-pointer", formData.category === cat.slug && "bg-primary text-primary-foreground")} onClick={() => setFormData(prev => ({
                      ...prev,
                      category: cat.slug
                    }))}>
                      {cat.name}
                    </Badge>)}
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_active} onCheckedChange={checked => setFormData(prev => ({
                    ...prev,
                    is_active: checked
                  }))} />
                  <Label>เปิดใช้งาน</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}>
                    ยกเลิก
                  </Button>
                  <Button type="submit">
                    {editingReward ? "บันทึกการแก้ไข" : "เพิ่มของรางวัล"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div> : filteredRewards.length === 0 ? <div className="text-center py-8 text-muted-foreground">{categoryFilter === "all" ? "ยังไม่มีของรางวัล" : "ไม่มีของรางวัลในหมวดหมู่นี้"}</div> : <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">รูปภาพ</TableHead>
                <TableHead className="min-w-[150px]">ชื่อ</TableHead>
                <TableHead className="min-w-[100px]">หมวดหมู่</TableHead>
                <TableHead className="min-w-[120px]">คะแนน</TableHead>
                <TableHead className="w-20">สต๊อก</TableHead>
                <TableHead className="min-w-[100px]">Tier</TableHead>
                <TableHead className="w-20">สถานะ</TableHead>
                <TableHead className="w-24 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRewards.map(reward => {
                const tierCost = reward.tier_points_cost as TierPointsCost | null;
                const images = reward.images || (reward.image_url ? [reward.image_url] : []);
                return <TableRow key={reward.id}>
                  <TableCell>
                    {images.length > 0 ? <div className="flex items-center gap-1 cursor-pointer group" onClick={() => {
                      setLightboxImages(images);
                      setLightboxRewardName(reward.name);
                      setLightboxOpen(true);
                    }}>
                      <div className="relative">
                        <img src={images[0]} alt={reward.name} className="w-12 h-12 object-cover rounded group-hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      {images.length > 1 && <Badge variant="secondary" className="text-xs">
                        <Image className="w-3 h-3 mr-1" />
                        +{images.length - 1}
                      </Badge>}
                    </div> : <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{reward.name}</div>
                      {reward.description && <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {reward.description}
                      </div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Tag className="w-3 h-3" />
                      {categoryOptions.find(c => c.slug === reward.category)?.name || reward.category || 'ทั่วไป'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tierCost ? <div className="space-y-1 text-sm">
                      {tiers.map(tier => <div key={tier} className="flex items-center gap-1">
                        <Badge className={`text-xs ${getTierBadgeColor(tier)}`}>
                          {tierLabels[tier].charAt(0)}
                        </Badge>
                        <span>{tierCost[tier].toLocaleString()}</span>
                      </div>)}
                    </div> : <span>{reward.points_cost.toLocaleString()} คะแนน</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reward.stock_quantity > 0 ? "default" : "destructive"}>
                      {reward.stock_quantity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {reward.target_tiers && reward.target_tiers.length > 0 ? <div className="flex flex-wrap gap-1">
                      {reward.target_tiers.map(tier => <Badge key={tier} className={getTierBadgeColor(tier)}>
                        {tierLabels[tier]}
                      </Badge>)}
                    </div> : <Badge variant="outline">ทุก Tier</Badge>}
                  </TableCell>
                  <TableCell>
                    <Switch checked={reward.is_active} onCheckedChange={() => toggleActive(reward)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(reward)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(reward.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </div>}
      </CardContent>
    </Card>

    {/* Image Lightbox */}
    <RewardImageLightbox images={lightboxImages} open={lightboxOpen} onOpenChange={setLightboxOpen} rewardName={lightboxRewardName} />
  </div>;
}