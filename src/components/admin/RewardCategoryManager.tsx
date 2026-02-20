import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, GripVertical } from "lucide-react";

interface RewardCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface RewardCategoryManagerProps {
  onCategoriesChange?: () => void;
}

export function RewardCategoryManager({ onCategoriesChange }: RewardCategoryManagerProps) {
  const [categories, setCategories] = useState<RewardCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RewardCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    icon: "tag",
    is_active: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("reward_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("ไม่สามารถโหลดหมวดหมู่ได้");
      console.error(error);
    } else {
      setCategories(data || []);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      icon: "tag",
      is_active: true,
    });
    setEditingCategory(null);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[ก-๙]/g, "") // Remove Thai characters
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `category-${Date.now()}`;
  };

  const openEditDialog = (category: RewardCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      icon: category.icon || "tag",
      is_active: category.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อหมวดหมู่");
      return;
    }

    const slug = formData.slug.trim() || generateSlug(formData.name);
    const payload = {
      name: formData.name.trim(),
      slug,
      icon: formData.icon || "tag",
      is_active: formData.is_active,
      sort_order: editingCategory?.sort_order ?? categories.length + 1,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from("reward_categories")
        .update(payload)
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("ไม่สามารถอัปเดตหมวดหมู่ได้");
        console.error(error);
      } else {
        toast.success("อัปเดตหมวดหมู่เรียบร้อย");
        fetchCategories();
        onCategoriesChange?.();
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("reward_categories")
        .insert([payload]);

      if (error) {
        if (error.code === "23505") {
          toast.error("หมวดหมู่นี้มีอยู่แล้ว");
        } else {
          toast.error("ไม่สามารถเพิ่มหมวดหมู่ได้");
        }
        console.error(error);
      } else {
        toast.success("เพิ่มหมวดหมู่เรียบร้อย");
        fetchCategories();
        onCategoriesChange?.();
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบหมวดหมู่นี้? ของรางวัลที่อยู่ในหมวดหมู่นี้จะถูกเปลี่ยนเป็น 'general'")) return;

    // Update rewards in this category to 'general'
    await supabase
      .from("rewards")
      .update({ category: "general" })
      .eq("category", categories.find(c => c.id === id)?.slug);

    const { error } = await supabase
      .from("reward_categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("ไม่สามารถลบหมวดหมู่ได้");
      console.error(error);
    } else {
      toast.success("ลบหมวดหมู่เรียบร้อย");
      fetchCategories();
      onCategoriesChange?.();
    }
  };

  const toggleActive = async (category: RewardCategory) => {
    const { error } = await supabase
      .from("reward_categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);

    if (error) {
      toast.error("ไม่สามารถอัปเดตสถานะได้");
    } else {
      fetchCategories();
      onCategoriesChange?.();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          จัดการหมวดหมู่ ({categories.length})
        </CardTitle>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มหมวดหมู่
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">ชื่อหมวดหมู่ *</Label>
                <Input
                  id="cat-name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                      slug: prev.slug || generateSlug(e.target.value),
                    }));
                  }}
                  placeholder="เช่น อุปกรณ์ในฟาร์ม"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat-slug">Slug (URL-friendly)</Label>
                <Input
                  id="cat-slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="farm-equipment"
                />
                <p className="text-xs text-muted-foreground">
                  ใช้ภาษาอังกฤษ ตัวพิมพ์เล็ก และขีดกลาง (-)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label>เปิดใช้งาน</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  ยกเลิก
                </Button>
                <Button type="submit">
                  {editingCategory ? "บันทึก" : "เพิ่มหมวดหมู่"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">กำลังโหลด...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            ยังไม่มีหมวดหมู่
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>ชื่อหมวดหมู่</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="w-20">สถานะ</TableHead>
                <TableHead className="w-24 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category, index) => (
                <TableRow key={category.id}>
                  <TableCell className="text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{category.slug}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={category.is_active}
                      onCheckedChange={() => toggleActive(category)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
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
  );
}
