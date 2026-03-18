import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Image as ImageIcon, Trash2, UploadCloud, Loader2, Plus, CheckSquare, Square, ToggleLeft, ToggleRight, Upload } from "lucide-react";
import { useDropZone } from '@/hooks/useDropZone';

interface MatchImage {
    id: string;
    image_url: string;
    is_active: boolean;
}

export function AdminMatchGameImages() {
    const [images, setImages] = useState<MatchImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
    const [urlTextInput, setUrlTextInput] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const isBulkMode = selectedIds.size > 0;
    const matchFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchImages();
    }, []);

    const fetchImages = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('match_images')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code !== '42P01') { // Ignore table doesn't exist error on first load
                    toast.error("ไม่สามารถโหลดรูปภาพได้");
                }
            } else {
                setImages(data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddImages = async () => {
        if (newImageUrls.length === 0) {
            toast.error("กรุณาเลือกรูปภาพอย่างน้อย 1 รูป");
            return;
        }

        setIsUploading(true);
        try {
            const rows = newImageUrls.map(url => ({ image_url: url, is_active: true }));
            const { error } = await supabase
                .from('match_images')
                .insert(rows);

            if (error) throw error;

            toast.success(`เพิ่มรูปภาพ ${newImageUrls.length} รูปเรียบร้อย`);
            setNewImageUrls([]);
            setUrlTextInput("");
            setIsDialogOpen(false);
            fetchImages();
        } catch (e) {
            console.error("Error adding images:", e);
            toast.error("เกิดข้อผิดพลาดในการเพิ่มรูป");
        } finally {
            setIsUploading(false);
        }
    };

    const toggleImageActive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('match_images')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            setImages(images.map(img => img.id === id ? { ...img, is_active: !currentStatus } : img));
        } catch (e) {
            console.error("Error updating image:", e);
            toast.error("อัปเดตสถานะไม่สำเร็จ");
        }
    };

    const deleteImage = async (id: string) => {
        if (!confirm("คุณต้องการลบรูปภาพนี้ใช่หรือไม่?")) return;

        try {
            const { error } = await supabase
                .from('match_images')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success("ลบรูปภาพเรียบร้อย");
            setImages(images.filter(img => img.id !== id));
        } catch (e) {
            console.error("Error deleting image:", e);
            toast.error("ลบรูปภาพไม่สำเร็จ");
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAll = () => setSelectedIds(new Set(images.map(i => i.id)));
    const selectNone = () => setSelectedIds(new Set());

    const bulkToggleActive = async (activate: boolean) => {
        const ids = Array.from(selectedIds);
        try {
            const { error } = await supabase
                .from('match_images')
                .update({ is_active: activate })
                .in('id', ids);
            if (error) throw error;
            setImages(images.map(img => ids.includes(img.id) ? { ...img, is_active: activate } : img));
            toast.success(`${activate ? 'เปิดใช้' : 'ปิดใช้'}งาน ${ids.length} รูปเรียบร้อย`);
            selectNone();
        } catch (e) {
            console.error(e);
            toast.error('อัปเดตไม่สำเร็จ');
        }
    };

    const bulkDelete = async () => {
        const ids = Array.from(selectedIds);
        if (!confirm(`คุณต้องการลบรูปภาพ ${ids.length} รูปใช่หรือไม่?`)) return;
        try {
            const { error } = await supabase
                .from('match_images')
                .delete()
                .in('id', ids);
            if (error) throw error;
            setImages(images.filter(img => !ids.includes(img.id)));
            toast.success(`ลบรูปภาพ ${ids.length} รูปเรียบร้อย`);
            selectNone();
        } catch (e) {
            console.error(e);
            toast.error('ลบรูปภาพไม่สำเร็จ');
        }
    };

    const removePreviewUrl = (index: number) => {
        setNewImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    // Handle multi-file selection — uploads to Supabase Storage
    const handleFileUploadFromFiles = async (files: File[]) => {
        if (files.length === 0) return;

        setIsUploading(true);
        const uploadedUrls: string[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `match-cards/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('game-assets')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error(`Error uploading ${file.name}:`, uploadError);
                    toast.error(`อัปโหลดรูป ${file.name} ไม่สำเร็จ (ตรวจสอบว่ามี bucket "game-assets" แล้ว)`);
                    continue;
                }

                const { data: urlData } = supabase.storage
                    .from('game-assets')
                    .getPublicUrl(filePath);

                if (urlData?.publicUrl) {
                    uploadedUrls.push(urlData.publicUrl);
                }
            }

            if (uploadedUrls.length > 0) {
                setNewImageUrls(prev => [...prev, ...uploadedUrls]);
                toast.success(`อัปโหลดสำเร็จ ${uploadedUrls.length} / ${files.length} รูป`);
            }
        } catch (e) {
            console.error("Upload error:", e);
            toast.error("เกิดข้อผิดพลาดในการอัปโหลด");
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        handleFileUploadFromFiles(Array.from(files));
    };

    const { isDragging: isMatchDragging, dropZoneProps: matchDropProps } = useDropZone({
        accept: 'image/*',
        disabled: isUploading,
        onDrop: (files) => handleFileUploadFromFiles(files),
    });

    // Parse multi-line or comma-separated URLs
    const handleAddUrlsFromText = () => {
        if (!urlTextInput.trim()) return;
        const parsed = urlTextInput
            .split(/[\n,]+/)
            .map(u => u.trim())
            .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')));

        if (parsed.length === 0) {
            toast.error("ไม่พบ URL ที่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)");
            return;
        }
        setNewImageUrls(prev => [...prev, ...parsed]);
        setUrlTextInput("");
        toast.success(`เพิ่ม ${parsed.length} URL เข้าคิว`);
    };

    return (
        <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        รูปภาพบนการ์ดจับคู่
                    </CardTitle>
                    <CardDescription className="mt-1">
                        ระบบจะสุ่มนำรูปภาพที่เปิดใช้งานอยู่ไปใช้ในการ์ด ควรเตรียมรูปภาพสี่เหลี่ยมจัตุรัส (1:1) และควรมีรูปเพียงพอสำหรับเลเวลที่ใหญ่ที่สุด
                    </CardDescription>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setNewImageUrls([]); setUrlTextInput(""); } }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" /> เพิ่มรูปภาพการ์ด
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>เพิ่มรูปลงในการ์ด (เลือกได้หลายรูป)</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>เลือกไฟล์จากเครื่อง (เลือกได้หลายไฟล์)</Label>
                                <div
                                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                                        isMatchDragging
                                            ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                            : 'border-muted-foreground/25 hover:bg-muted/50'
                                    }`}
                                    onClick={() => matchFileInputRef.current?.click()}
                                    {...matchDropProps}
                                >
                                    <input ref={matchFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                    {isUploading ? <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-muted-foreground" /> : <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />}
                                    <p className="text-sm text-muted-foreground">{isUploading ? 'กำลังอัปโหลด...' : isMatchDragging ? 'วางรูปที่นี่' : 'คลิกหรือลากรูปมาวาง (เลือกได้หลายไฟล์)'}</p>
                                </div>
                            </div>
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-muted-foreground/20" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">หรือ</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>ใส่ URL ของรูปภาพ (หลาย URL คั่นด้วย Enter หรือ จุลภาค)</Label>
                                <textarea
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
                                    placeholder={"https://example.com/image1.png\nhttps://example.com/image2.png\nhttps://example.com/image3.png"}
                                    value={urlTextInput}
                                    onChange={(e) => setUrlTextInput(e.target.value)}
                                />
                                <Button variant="outline" size="sm" onClick={handleAddUrlsFromText} disabled={!urlTextInput.trim()}>
                                    <Plus className="w-3 h-3 mr-1" /> เพิ่ม URL เข้าคิว
                                </Button>
                            </div>

                            {newImageUrls.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">รูปภาพที่เลือก ({newImageUrls.length} รูป)</Label>
                                    <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg bg-slate-50">
                                        {newImageUrls.map((url, idx) => (
                                            <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border bg-white">
                                                <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removePreviewUrl(idx)}
                                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                                <Button onClick={handleAddImages} disabled={isUploading || newImageUrls.length === 0}>
                                    {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    เพิ่ม {newImageUrls.length} รูปลงระบบ
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent>
                {isLoading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : images.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 border rounded-lg text-muted-foreground flex flex-col items-center">
                        <ImageIcon className="w-12 h-12 mb-4 text-slate-300" />
                        <p>ยังไม่มีรูปภาพในการ์ด</p>
                        <p className="text-sm">เพิ่มรูปภาพอย่างน้อย 8 รูปภาพ สำหรับให้ระบบสุ่มนำไปใช้</p>
                    </div>
                ) : (
                    <>
                        {/* Bulk action toolbar */}
                        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-slate-50 rounded-lg border">
                            <Button variant="outline" size="sm" onClick={selectedIds.size === images.length ? selectNone : selectAll}>
                                {selectedIds.size === images.length ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                                {selectedIds.size === images.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                            </Button>
                            {isBulkMode && (
                                <>
                                    <span className="text-sm text-muted-foreground">เลือกแล้ว {selectedIds.size} รูป</span>
                                    <div className="flex-1" />
                                    <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => bulkToggleActive(true)}>
                                        <ToggleRight className="w-4 h-4 mr-1" /> เปิดใช้ทั้งหมด
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-yellow-700 border-yellow-300 hover:bg-yellow-50" onClick={() => bulkToggleActive(false)}>
                                        <ToggleLeft className="w-4 h-4 mr-1" /> ปิดใช้ทั้งหมด
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={bulkDelete}>
                                        <Trash2 className="w-4 h-4 mr-1" /> ลบทั้งหมด
                                    </Button>
                                </>
                            )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {images.map(img => (
                                <div key={img.id} onClick={() => isBulkMode ? toggleSelect(img.id) : null} className={`group relative border-2 rounded-xl overflow-hidden aspect-square bg-slate-50 cursor-pointer transition-all ${selectedIds.has(img.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'} ${!img.is_active ? 'opacity-50 grayscale' : ''}`}>
                                    <img src={img.image_url} alt="Card face" className="w-full h-full object-cover p-2" />

                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-8 text-xs font-semibold"
                                            onClick={() => toggleImageActive(img.id, img.is_active)}
                                        >
                                            {img.is_active ? 'ปิดใช้' : 'เปิดใช้'}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => deleteImage(img.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {!img.is_active && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                                            ไม่ได้ใช้
                                        </div>
                                    )}
                                    {/* Selection checkbox */}
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleSelect(img.id); }}
                                        className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${selectedIds.has(img.id) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/80 border-slate-300 text-transparent hover:border-blue-400 group-hover:opacity-100 opacity-0'}`}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div className="mt-4 text-sm text-muted-foreground bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <strong className="text-amber-800">ระบบรูปการ์ด:</strong> หากมีรูปที่เปิดใช้งานจำนวน 10 รูป แต่ตารางต้องใช้การ์ด 16 แบบ ระบบจะทำการนำรูปเหล่านั้นมาใช้ซ้ำแบบสุ่มจนกว่าจะครบตามจำนวนที่เลเวลต้องการ
                </div>
            </CardContent>
        </Card>
    );
}
