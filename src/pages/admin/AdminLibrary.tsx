import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, BookOpen, Image as ImageIcon, FileText, Video, FolderOpen, Upload, Loader2, Eye, X, Users } from 'lucide-react';
import { ArticleEditor } from '@/components/admin/ArticleEditor';
import { ThumbnailUploader } from '@/components/admin/ThumbnailUploader';
import { LibraryItemTable, type LibraryItem, type LibraryCategory } from '@/components/admin/LibraryItemTable';
import { LibraryPreviewDialog } from '@/components/admin/LibraryPreviewDialog';
import { LibraryBulkActions } from '@/components/admin/LibraryBulkActions';
import { useTierSettings } from '@/hooks/useGamification';
import { MEMBER_TYPE_OPTIONS, type MemberType, type TierLevel } from '@/constants/memberTypes';

const ITEM_TYPES = [
  { value: 'article', label: 'บทความ', icon: BookOpen },
  { value: 'image', label: 'รูปภาพ', icon: ImageIcon },
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'video', label: 'วิดีโอ', icon: Video },
];

export default function AdminLibrary() {
  const { tiers: tierSettings } = useTierSettings();
  const dynamicTiers = (tierSettings || []).map(t => ({ value: t.tier as TierLevel, label: t.display_name || t.tier }));

  const [activeTab, setActiveTab] = useState('categories');

  // ===== Categories State =====
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LibraryCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', is_active: true });

  // ===== Items State =====
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // ===== Bulk Actions State =====
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditTiersOpen, setIsBulkEditTiersOpen] = useState(false);
  const [isBulkEditMemberTypesOpen, setIsBulkEditMemberTypesOpen] = useState(false);
  const [bulkTiersValue, setBulkTiersValue] = useState<TierLevel[]>([]);
  const [bulkMemberTypesValue, setBulkMemberTypesValue] = useState<MemberType[]>([]);

  const [itemForm, setItemForm] = useState<{
    category_id: string; title: string; description: string;
    item_type: 'article' | 'image' | 'pdf' | 'video';
    content_body: string; file_url: string; thumbnail_url: string;
    is_published: boolean; target_tiers: string[]; target_member_types: string[];
  }>({
    category_id: '', title: '', description: '', item_type: 'article',
    content_body: '', file_url: '', thumbnail_url: '', is_published: true,
    target_tiers: [], target_member_types: [],
  });

  // ===== Data Fetching =====
  useEffect(() => { fetchCategories(); fetchItems(); }, []);

  const fetchCategories = async () => {
     
    const { data, error } = await supabase.from('library_categories')
      .select('*').order('sort_order', { ascending: true });
    if (error) { console.error('Error fetching categories:', error); toast.error('ไม่สามารถโหลดหมวดหมู่ได้'); }
    else setCategories(data || []);
  };

  const fetchItems = async () => {
    setIsLoading(true);
     
    const { data, error } = await supabase.from('library_items')
      .select('*').order('sort_order', { ascending: true });
    if (error) { console.error('Error fetching items:', error); toast.error('ไม่สามารถโหลดเนื้อหาได้'); }
    else setItems((data as LibraryItem[]) || []);
    setIsLoading(false);
  };

  // ===== Category CRUD =====
  const resetCategoryForm = () => { setCategoryForm({ name: '', description: '', is_active: true }); setEditingCategory(null); };

  const openEditCategory = (cat: LibraryCategory) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '', is_active: cat.is_active });
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) { toast.error('กรุณากรอกชื่อหมวดหมู่'); return; }
    setIsSaving(true);
    try {
      if (editingCategory) {
         
        const { error } = await supabase.from('library_categories')
          .update({ name: categoryForm.name.trim(), description: categoryForm.description.trim() || null, is_active: categoryForm.is_active, updated_at: new Date().toISOString() })
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('อัปเดตหมวดหมู่เรียบร้อย');
      } else {
         
        const { error } = await supabase.from('library_categories')
          .insert({ name: categoryForm.name.trim(), description: categoryForm.description.trim() || null, is_active: categoryForm.is_active, sort_order: categories.length });
        if (error) throw error;
        toast.success('สร้างหมวดหมู่เรียบร้อย');
      }
      setIsCategoryDialogOpen(false); resetCategoryForm(); fetchCategories();
    } catch (error) { console.error('Error saving category:', error); toast.error('ไม่สามารถบันทึกหมวดหมู่ได้'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteCategory = async (id: string) => {
    const itemCount = items.filter(i => i.category_id === id).length;
    const msg = itemCount > 0 ? `หมวดหมู่นี้มีเนื้อหา ${itemCount} รายการ การลบจะลบเนื้อหาทั้งหมดด้วย ยืนยันการลบ?` : 'ยืนยันการลบหมวดหมู่นี้?';
    if (!confirm(msg)) return;
    try {
       
      const { error } = await supabase.from('library_categories').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบหมวดหมู่เรียบร้อย'); fetchCategories(); fetchItems();
    } catch (error) { console.error('Error deleting category:', error); toast.error('ไม่สามารถลบหมวดหมู่ได้'); }
  };

  // ===== Item CRUD =====
  const resetItemForm = () => {
    setItemForm({ category_id: '', title: '', description: '', item_type: 'article', content_body: '', file_url: '', thumbnail_url: '', is_published: true, target_tiers: [], target_member_types: [] });
    setEditingItem(null);
  };

  const openEditItem = (item: LibraryItem) => {
    setEditingItem(item);
    setItemForm({ category_id: item.category_id, title: item.title, description: item.description || '', item_type: item.item_type, content_body: item.content_body || '', file_url: item.file_url || '', thumbnail_url: item.thumbnail_url || '', is_published: item.is_published, target_tiers: item.target_tiers || [], target_member_types: item.target_member_types || [] });
    setIsItemDialogOpen(true);
  };

  const openNewItem = () => {
    resetItemForm();
    if (categories.length > 0) setItemForm(prev => ({ ...prev, category_id: categories[0].id }));
    setIsItemDialogOpen(true);
  };

  const handleFileUpload = async (file: File, type: 'file' | 'thumbnail') => {
    if (!file) return;
    const maxSize = type === 'thumbnail' ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) { toast.error(`ขนาดไฟล์ต้องไม่เกิน ${type === 'thumbnail' ? '5' : '50'}MB`); return; }
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('library').upload(fileName, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('library').getPublicUrl(fileName);
      if (type === 'file') setItemForm(prev => ({ ...prev, file_url: publicUrl }));
      else setItemForm(prev => ({ ...prev, thumbnail_url: publicUrl }));
      toast.success('อัปโหลดไฟล์สำเร็จ');
    } catch (error) { console.error('Upload error:', error); toast.error('ไม่สามารถอัปโหลดไฟล์ได้'); }
    finally { setIsUploading(false); }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notifyUsersOfNewLibraryItem = async (itemPayload: any) => {
    try {
       
      const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, member_type, tier').eq('is_approved', true);
      if (profileError || !profiles) return;
      let targetProfiles = profiles;
      if (itemPayload.target_member_types?.length > 0) targetProfiles = targetProfiles.filter((p: { member_type: string }) => itemPayload.target_member_types.includes(p.member_type));
      if (itemPayload.target_tiers?.length > 0) targetProfiles = targetProfiles.filter((p: { tier: string }) => itemPayload.target_tiers.includes(p.tier));
      if (targetProfiles.length === 0) return;
      const notifications = targetProfiles.map((p: { id: string }) => ({ profile_id: p.id, title: 'คลังความรู้ใหม่ 🎉', message: `เนื้อหาใหม่: ${itemPayload.title} เข้าไปอ่านเพื่ออัปเดตความรู้ของคุณได้เลย!`, type: 'info', link: `/library?category=${itemPayload.category_id || ''}`, is_read: false }));
      const chunkSize = 500;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        await supabase.from('notifications').insert(notifications.slice(i, i + chunkSize));
      }
    } catch (error) { console.error('Error sending notifications:', error); }
  };

  const handleSaveItem = async () => {
    if (!itemForm.title.trim()) { toast.error('กรุณากรอกชื่อเนื้อหา'); return; }
    if (!itemForm.category_id) { toast.error('กรุณาเลือกหมวดหมู่'); return; }
    if (itemForm.item_type === 'article' && !itemForm.content_body.trim()) { toast.error('กรุณากรอกเนื้อหาบทความ'); return; }
    if (['image', 'pdf', 'video'].includes(itemForm.item_type) && !itemForm.file_url.trim()) { toast.error('กรุณาอัปโหลดไฟล์'); return; }

    setIsSaving(true);
    try {
      const payload = {
        category_id: itemForm.category_id, title: itemForm.title.trim(), description: itemForm.description.trim() || null,
        item_type: itemForm.item_type, content_body: itemForm.item_type === 'article' ? itemForm.content_body : null,
        file_url: ['image', 'pdf', 'video'].includes(itemForm.item_type) ? itemForm.file_url : null,
        thumbnail_url: itemForm.thumbnail_url || null, is_published: itemForm.is_published,
        target_tiers: itemForm.target_tiers.length > 0 ? itemForm.target_tiers : null,
        target_member_types: itemForm.target_member_types.length > 0 ? itemForm.target_member_types : null,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
         
        const { error } = await supabase.from('library_items').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        toast.success('อัปเดตเนื้อหาเรียบร้อย');
        if (payload.is_published && !editingItem.is_published) notifyUsersOfNewLibraryItem(payload);
      } else {
         
        const { error } = await supabase.from('library_items').insert({ ...payload, sort_order: items.length });
        if (error) throw error;
        toast.success('สร้างเนื้อหาเรียบร้อย');
        if (payload.is_published) notifyUsersOfNewLibraryItem(payload);
      }
      setIsItemDialogOpen(false); resetItemForm(); fetchItems();
    } catch (error) { console.error('Error saving item:', error); toast.error('ไม่สามารถบันทึกเนื้อหาได้'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('ยืนยันการลบเนื้อหานี้?')) return;
    try {
       
      const { error } = await supabase.from('library_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบเนื้อหาเรียบร้อย'); fetchItems();
    } catch (error) { console.error('Error deleting item:', error); toast.error('ไม่สามารถลบเนื้อหาได้'); }
  };

  const togglePublish = async (item: LibraryItem) => {
    try {
      const willPublish = !item.is_published;
       
      const { error } = await supabase.from('library_items').update({ is_published: willPublish }).eq('id', item.id);
      if (error) throw error;
      toast.success(item.is_published ? 'ยกเลิกการเผยแพร่แล้ว' : 'เผยแพร่แล้ว');
      if (willPublish) notifyUsersOfNewLibraryItem(item);
      fetchItems();
    } catch (error) { console.error('Error toggling publish:', error); toast.error('ไม่สามารถเปลี่ยนสถานะได้'); }
  };

  // ===== Bulk Operations =====
  const handleBulkDelete = async () => {
    if (!confirm(`คุณต้องการลบเนื้อหาที่เลือก ${selectedIds.length} รายการหรือไม่?`)) return;
    try {
       
      const { error } = await supabase.from('library_items').delete().in('id', selectedIds);
      if (error) throw error;
      toast.success(`ลบ ${selectedIds.length} รายการสำเร็จ`); setSelectedIds([]); fetchItems();
    } catch (error) { console.error('Error deleting items:', error); toast.error('ไม่สามารถลบเนื้อหาได้'); }
  };

  const handleBulkPublish = async (publishStatus: boolean) => {
    try {
       
      const { error } = await supabase.from('library_items').update({ is_published: publishStatus }).in('id', selectedIds);
      if (error) throw error;
      toast.success(publishStatus ? `เผยแพร่ ${selectedIds.length} รายการสำเร็จ` : `ยกเลิกเผยแพร่ ${selectedIds.length} รายการสำเร็จ`);
      setSelectedIds([]); fetchItems();
    } catch (error) { console.error('Error updating publish status:', error); toast.error('ไม่สามารถเปลี่ยนสถานะเผยแพร่ได้'); }
  };

  const handleBulkEditTiers = async () => {
    if (selectedIds.length === 0) return;
    try {
       
      const { error } = await supabase.from('library_items').update({ target_tiers: bulkTiersValue.length > 0 ? bulkTiersValue : null }).in('id', selectedIds);
      if (error) throw error;
      toast.success(`อัปเดต Tier ${selectedIds.length} รายการสำเร็จ`); setIsBulkEditTiersOpen(false); setSelectedIds([]); fetchItems();
    } catch (error) { console.error('Error updating tiers:', error); toast.error('ไม่สามารถอัปเดต Tier ได้'); }
  };

  const handleBulkEditMemberTypes = async () => {
    if (selectedIds.length === 0) return;
    try {
       
      const { error } = await supabase.from('library_items').update({ target_member_types: bulkMemberTypesValue.length > 0 ? bulkMemberTypesValue : null }).in('id', selectedIds);
      if (error) throw error;
      toast.success(`อัปเดตประเภทสมาชิก ${selectedIds.length} รายการสำเร็จ`); setIsBulkEditMemberTypesOpen(false); setSelectedIds([]); fetchItems();
    } catch (error) { console.error('Error updating member types:', error); toast.error('ไม่สามารถอัปเดตประเภทสมาชิกได้'); }
  };

  // ===== Helpers =====
  const filteredItems = items.filter(item => {
    if (categoryFilter !== 'all' && item.category_id !== categoryFilter) return false;
    if (typeFilter !== 'all' && item.item_type !== typeFilter) return false;
    return true;
  });

  const getFileAcceptType = () => {
    switch (itemForm.item_type) {
      case 'image': return 'image/*';
      case 'pdf': return '.pdf';
      case 'video': return 'video/*';
      default: return '*';
    }
  };

  const getItemTypeLabel = (type: string) => ITEM_TYPES.find(t => t.value === type)?.label || type;

  // ===== Render =====
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">คลังความรู้</h1>
          <p className="text-muted-foreground">จัดการหมวดหมู่และเนื้อหาในคลังความรู้</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="categories" className="gap-2"><FolderOpen className="w-4 h-4" /> หมวดหมู่ ({categories.length})</TabsTrigger>
          <TabsTrigger value="items" className="gap-2"><BookOpen className="w-4 h-4" /> เนื้อหา ({items.length})</TabsTrigger>
        </TabsList>

        {/* ===== Items Tab ===== */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="ทุกหมวดหมู่" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                  {categories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="ทุกประเภท" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  {ITEM_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openNewItem} disabled={categories.length === 0}>
              <Plus className="h-4 w-4 mr-2" /> เพิ่มเนื้อหา
            </Button>
          </div>

          {categories.length === 0 ? (
            <Card className="p-8 text-center">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">กรุณาสร้างหมวดหมู่ก่อนเพิ่มเนื้อหา</p>
              <Button variant="outline" className="mt-3" onClick={() => setActiveTab('categories')}>ไปที่แท็บหมวดหมู่</Button>
            </Card>
          ) : (
            <LibraryItemTable
              items={filteredItems}
              categories={categories}
              tierSettings={tierSettings}
              selectedIds={selectedIds}
              onSelectAll={(checked) => checked ? setSelectedIds(filteredItems.map(i => i.id)) : setSelectedIds([])}
              onSelect={(id, checked) => checked ? setSelectedIds(prev => [...prev, id]) : setSelectedIds(prev => prev.filter(i => i !== id))}
              onEdit={openEditItem}
              onDelete={handleDeleteItem}
              onTogglePublish={togglePublish}
              onPreview={setPreviewItem}
            />
          )}
        </TabsContent>

        {/* ===== Categories Tab ===== */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetCategoryForm(); setIsCategoryDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> เพิ่มหมวดหมู่
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อหมวดหมู่</TableHead>
                  <TableHead>คำอธิบาย</TableHead>
                  <TableHead>จำนวนเนื้อหา</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">ยังไม่มีหมวดหมู่</TableCell></TableRow>
                ) : (
                  categories.map(cat => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{cat.description || '-'}</TableCell>
                      <TableCell><Badge variant="secondary">{items.filter(i => i.category_id === cat.id).length} รายการ</Badge></TableCell>
                      <TableCell><Badge variant={cat.is_active ? 'default' : 'secondary'}>{cat.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditCategory(cat)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Category Dialog ===== */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => { setIsCategoryDialogOpen(open); if (!open) resetCategoryForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อหมวดหมู่ *</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))} placeholder="เช่น สัตว์ปีก, โค, สุกร" />
            </div>
            <div className="space-y-2">
              <Label>คำอธิบาย</Label>
              <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))} placeholder="คำอธิบายสั้นๆ" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={categoryForm.is_active} onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, is_active: checked }))} />
              <Label>เปิดใช้งาน</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveCategory} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCategory ? 'อัปเดต' : 'สร้าง'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Item Dialog ===== */}
      <Dialog open={isItemDialogOpen} onOpenChange={(open) => { setIsItemDialogOpen(open); if (!open) resetItemForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{editingItem ? 'แก้ไขเนื้อหา' : 'เพิ่มเนื้อหาใหม่'}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
            <div className="space-y-6 p-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>หมวดหมู่ *</Label>
                  <Select value={itemForm.category_id} onValueChange={(v) => setItemForm(prev => ({ ...prev, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                    <SelectContent>{categories.filter(c => c.is_active).map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ประเภทเนื้อหา *</Label>
                  <Select value={itemForm.item_type} onValueChange={(v: 'article' | 'image' | 'pdf' | 'video') => setItemForm(prev => ({ ...prev, item_type: v, file_url: '', content_body: '' }))} disabled={!!editingItem}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ITEM_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2"><Label>ชื่อเนื้อหา *</Label><Input value={itemForm.title} onChange={(e) => setItemForm(prev => ({ ...prev, title: e.target.value }))} placeholder="ระบุชื่อเนื้อหา" /></div>
              <div className="space-y-2"><Label>คำอธิบาย</Label><Textarea value={itemForm.description} onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))} placeholder="คำอธิบายสั้นๆ" /></div>
              <div className="space-y-2"><Label>รูปปก (Thumbnail)</Label><ThumbnailUploader value={itemForm.thumbnail_url} onChange={(url) => setItemForm(prev => ({ ...prev, thumbnail_url: url }))} bucket="library" /></div>

              {itemForm.item_type === 'article' && <ArticleEditor value={itemForm.content_body} onChange={(value) => setItemForm(prev => ({ ...prev, content_body: value }))} />}

              {['image', 'pdf', 'video'].includes(itemForm.item_type) && (
                <div className="space-y-3">
                  <Label>{itemForm.item_type === 'image' ? 'อัปโหลดรูปภาพ *' : itemForm.item_type === 'pdf' ? 'อัปโหลดไฟล์ PDF *' : 'อัปโหลดวิดีโอ / URL วิดีโอ *'}</Label>
                  {itemForm.item_type === 'video' && (
                    <div className="space-y-2">
                      <Input value={itemForm.file_url} onChange={(e) => setItemForm(prev => ({ ...prev, file_url: e.target.value }))} placeholder="วาง URL วิดีโอ เช่น YouTube, Vimeo หรืออัปโหลดไฟล์ด้านล่าง" />
                      <p className="text-xs text-muted-foreground">หรืออัปโหลดไฟล์วิดีโอ:</p>
                    </div>
                  )}
                  {itemForm.file_url && itemForm.item_type !== 'video' ? (
                    <div className="relative group border rounded-lg overflow-hidden">
                      {itemForm.item_type === 'image' ? (
                        <img src={itemForm.file_url} alt="" className="w-full max-h-[300px] object-contain bg-muted" />
                      ) : (
                        <div className="p-4 flex items-center gap-3 bg-muted/50">
                          <FileText className="w-8 h-8 text-orange-600" />
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">ไฟล์ PDF</p><a href={itemForm.file_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">เปิดดูไฟล์</a></div>
                        </div>
                      )}
                      <Button type="button" size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setItemForm(prev => ({ ...prev, file_url: '' }))}><X className="w-4 h-4" /></Button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors block">
                      <input type="file" accept={getFileAcceptType()} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, 'file'); }} disabled={isUploading} />
                      {isUploading ? <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-muted-foreground" /> : <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />}
                      <p className="text-sm text-muted-foreground">{isUploading ? 'กำลังอัปโหลด...' : `คลิกเพื่ออัปโหลด ${getItemTypeLabel(itemForm.item_type)}`}</p>
                      <p className="text-xs text-muted-foreground mt-1">สูงสุด 50MB</p>
                    </label>
                  )}
                </div>
              )}

              {/* Eligibility Settings */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-semibold flex items-center gap-2"><Users className="w-5 h-5" /> การมองเห็น/เข้าถึง</Label>
                <div className="space-y-3">
                  <Label>ประเภทสมาชิกที่เห็นเนื้อหานี้</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {MEMBER_TYPE_OPTIONS.map(type => (
                      <label key={type.value} className="flex items-center gap-2 border p-2 rounded-lg cursor-pointer hover:bg-muted font-normal">
                        <Checkbox checked={itemForm.target_member_types.includes(type.value as MemberType)} onCheckedChange={(checked) => {
                          setItemForm(prev => checked ? { ...prev, target_member_types: [...prev.target_member_types, type.value as MemberType] } : { ...prev, target_member_types: prev.target_member_types.filter(t => t !== type.value) });
                        }} />
                        <span className="text-sm">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>ระดับสมาชิกที่เห็นเนื้อหานี้</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {dynamicTiers.map(tier => (
                      <label key={tier.value} className="flex items-center gap-2 border p-2 rounded-lg cursor-pointer hover:bg-muted font-normal">
                        <Checkbox checked={itemForm.target_tiers.includes(tier.value as TierLevel)} onCheckedChange={(checked) => {
                          setItemForm(prev => checked ? { ...prev, target_tiers: [...prev.target_tiers, tier.value as TierLevel] } : { ...prev, target_tiers: prev.target_tiers.filter(t => t !== tier.value) });
                        }} />
                        <span className="text-sm">{tier.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">*หากไม่เลือกอะไรเลย เนื้อหาจะแสดงให้สมาชิกทุกคนเห็น</p>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <Switch checked={itemForm.is_published} onCheckedChange={(checked) => setItemForm(prev => ({ ...prev, is_published: checked }))} />
                <Label>เผยแพร่ทันที</Label>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="secondary" onClick={() => setPreviewItem({ ...itemForm, id: editingItem?.id || 'preview', created_at: new Date().toISOString(), sort_order: 0 } as LibraryItem)}>
              <Eye className="w-4 h-4 mr-2" /> ดูตัวอย่าง
            </Button>
            <div className="flex gap-2 mt-2 sm:mt-0 justify-end">
              <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>ยกเลิก</Button>
              <Button onClick={handleSaveItem} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? 'อัปเดต' : 'สร้าง'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <LibraryPreviewDialog item={previewItem} open={!!previewItem} onOpenChange={(open) => { if (!open) setPreviewItem(null); }} />

      {/* Bulk Actions */}
      <LibraryBulkActions
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        isBulkEditTiersOpen={isBulkEditTiersOpen}
        onBulkEditTiersOpenChange={setIsBulkEditTiersOpen}
        bulkTiersValue={bulkTiersValue}
        onBulkTiersValueChange={setBulkTiersValue}
        onBulkEditTiers={handleBulkEditTiers}
        dynamicTiers={dynamicTiers}
        isBulkEditMemberTypesOpen={isBulkEditMemberTypesOpen}
        onBulkEditMemberTypesOpenChange={setIsBulkEditMemberTypesOpen}
        bulkMemberTypesValue={bulkMemberTypesValue}
        onBulkMemberTypesValueChange={setBulkMemberTypesValue}
        onBulkEditMemberTypes={handleBulkEditMemberTypes}
        onBulkPublish={handleBulkPublish}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  );
}
