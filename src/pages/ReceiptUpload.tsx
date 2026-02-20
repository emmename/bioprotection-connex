import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Camera, Image, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import pendingImage from '@/assets/14.png';


export default function ReceiptUpload() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);



  // Cleanup preview URL on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Fetch user's receipts
  const { data: receipts, isLoading: isLoadingReceipts, refetch: refetchReceipts } = useQuery({
    queryKey: ['my-receipts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'ไฟล์ไม่ถูกต้อง',
        description: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'ไฟล์ใหญ่เกินไป',
        description: 'กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !profile) return;

    setIsUploading(true);

    try {
      // Upload image to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // Create receipt record
      const { error: insertError } = await supabase
        .from('receipts')
        .insert({
          profile_id: profile.id,
          image_url: urlData.publicUrl,
          status: 'pending',
        });

      if (insertError) throw insertError;

      /* toast({
        title: 'อัปโหลดสำเร็จ',
        description: 'ใบเสร็จของคุณอยู่ระหว่างการตรวจสอบ',
      }); */

      setShowSuccessModal(true); // Show success modal using 4.png

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refetch receipts
      refetchReceipts();
    } catch (error) {
      toast({
        title: 'อัปโหลดไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            อนุมัติแล้ว
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            ไม่อนุมัติ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            รอตรวจสอบ
          </span>
        );
    }
  };



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/10"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">อัปโหลดใบเสร็จ</h1>
              <p className="text-xs text-white/70">สะสมคะแนนจากการซื้อสินค้า</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5" />
              อัปโหลดใบเสร็จ/ใบส่งสินค้าใหม่
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {previewUrl ? (
              <div className="space-y-4">
                <div className="relative aspect-[4/3] max-w-md mx-auto rounded-lg overflow-hidden border">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-contain bg-muted"
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={isUploading}
                  >
                    เลือกใหม่
                  </Button>
                  <Button onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังอัปโหลด...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        อัปโหลดใบเสร็จ/ใบส่งสินค้า
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">คลิกเพื่อเลือกรูปใบเสร็จ/ใบส่งสินค้า</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5MB
                    </p>
                  </div>
                  <Button variant="outline" type="button">
                    <Image className="mr-2 h-4 w-4" />
                    เลือกรูปภาพ
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">คำแนะนำ:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>ถ่ายรูปใบเสร็จ/ใบส่งสินค้าให้ชัดเจน เห็นรายละเอียดครบถ้วน</li>
                <li>ใบเสร็จ/ใบส่งสินค้าต้องเป็นการซื้อสินค้าที่ร่วมรายการ</li>
                <li>ใบเสร็จ/ใบส่งสินค้าจะได้รับการตรวจสอบภายใน 24 ชม.</li>
                <li>คะแนนจะถูกเพิ่มหลังจากตรวจสอบเรียบร้อยแล้ว</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Receipt History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              ประวัติการอัปโหลด
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingReceipts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : receipts && receipts.length > 0 ? (
              <div className="space-y-4">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={receipt.image_url}
                        alt="Receipt"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(receipt.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(receipt.created_at), 'd MMM yyyy เวลา HH:mm', { locale: th })}
                      </p>
                      {receipt.status === 'approved' && receipt.points_awarded && (
                        <p className="text-sm font-medium text-green-600 mt-1">
                          +{receipt.points_awarded.toLocaleString()} คะแนน
                        </p>
                      )}
                      {receipt.status === 'rejected' && receipt.admin_notes && (
                        <p className="text-sm text-red-600 mt-1">
                          หมายเหตุ: {receipt.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>ยังไม่มีประวัติการอัปโหลดใบเสร็จ</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <img
              src={pendingImage}
              alt="Waiting for inspection"
              className="w-48 h-auto object-contain animate-bounce-in"
            />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-primary">รอการตรวจสอบ</h2>
              <p className="text-muted-foreground">
                ระบบได้รับใบเสร็จของคุณแล้ว<br />
                กรุณารอเจ้าหน้าที่ตรวจสอบความถูกต้องภายใน 24 ชม.
              </p>
            </div>
            <Button onClick={() => setShowSuccessModal(false)} className="w-full mt-4">
              ตกลง
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
