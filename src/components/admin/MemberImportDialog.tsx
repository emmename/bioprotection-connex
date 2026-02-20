import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, Download, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { parseCSV, generateCSVTemplate, validateMemberData, type MemberImportData } from '@/lib/csv-utils';

interface MemberImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ImportResults {
  success: string[];
  failed: { phone: string; error: string }[];
  skipped: { phone: string; reason: string }[];
}

const memberTypeLabels: Record<string, string> = {
  farm: 'ฟาร์มปศุสัตว์',
  company_employee: 'พนักงานบริษัท',
  veterinarian: 'สัตวแพทย์',
  livestock_shop: 'ร้านค้าปศุสัตว์',
  government: 'รับราชการ',
  other: 'อื่นๆ',
};

export function MemberImportDialog({ open, onOpenChange, onImportComplete }: MemberImportDialogProps) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<MemberImportData[]>([]);
  const [validationErrors, setValidationErrors] = useState<Map<number, string[]>>(new Map());
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');

  const resetDialog = useCallback(() => {
    setImportFile(null);
    setImportPreview([]);
    setValidationErrors(new Map());
    setIsImporting(false);
    setImportResults(null);
    setStep('upload');
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('กรุณาเลือกไฟล์ CSV เท่านั้น');
      return;
    }

    setImportFile(file);

    try {
      const text = await file.text();
      const members = parseCSV(text);

      // Validate each member
      const errors = new Map<number, string[]>();
      members.forEach((member, index) => {
        const validation = validateMemberData(member);
        if (!validation.valid) {
          errors.set(index, validation.errors);
        }
      });

      setImportPreview(members);
      setValidationErrors(errors);
      setStep('preview');

      if (errors.size > 0) {
        toast.warning(`พบ ${errors.size} รายการที่มีข้อผิดพลาด`);
      } else {
        toast.success(`อ่านข้อมูลสำเร็จ ${members.length} รายการ`);
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถอ่านไฟล์ CSV ได้');
    }
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    const template = generateCSVTemplate();
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'member_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('ดาวน์โหลด template สำเร็จ');
  }, []);

  const handleImport = useCallback(async () => {
    if (importPreview.length === 0) {
      toast.error('ไม่มีข้อมูลให้นำเข้า');
      return;
    }

    // Filter out invalid members
    const validMembers = importPreview.filter((_, index) => !validationErrors.has(index));

    if (validMembers.length === 0) {
      toast.error('ไม่มีข้อมูลที่ถูกต้องสำหรับนำเข้า');
      return;
    }

    setIsImporting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('กรุณาเข้าสู่ระบบก่อน');
      }

      const response = await supabase.functions.invoke('import-members', {
        body: { members: validMembers }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const results = response.data as ImportResults;
      setImportResults(results);
      setStep('results');

      if (results.success.length > 0) {
        toast.success(`นำเข้าสำเร็จ ${results.success.length} รายการ`);
        onImportComplete();
      }

      if (results.failed.length > 0) {
        toast.error(`นำเข้าล้มเหลว ${results.failed.length} รายการ`);
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการนำเข้า');
    } finally {
      setIsImporting(false);
    }
  }, [importPreview, validationErrors, onImportComplete]);

  const handleClose = useCallback(() => {
    resetDialog();
    onOpenChange(false);
  }, [resetDialog, onOpenChange]);

  const validCount = importPreview.length - validationErrors.size;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            นำเข้าสมาชิกจากระบบเดิม
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                เลือกไฟล์ CSV ที่มีข้อมูลสมาชิก (รองรับ 38 คอลัมน์)
              </p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="max-w-xs mx-auto"
              />
            </div>

            <div className="flex justify-center">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                ดาวน์โหลด Template CSV
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <h4 className="font-medium mb-2">คำแนะนำ:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>ใช้ Template CSV เพื่อให้แน่ใจว่าคอลัมน์ถูกต้อง</li>
                <li>คอลัมน์ที่จำเป็น: phone, first_name, last_name, member_type</li>
                <li>สำหรับ Array fields (เช่น interests) ใช้ | เป็นตัวคั่น</li>
                <li>member_type: farm, company_employee, veterinarian, livestock_shop, government, other</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col space-y-4 min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-base">
                  {importPreview.length} รายการ
                </Badge>
                <Badge variant="default" className="text-base bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {validCount} ถูกต้อง
                </Badge>
                {validationErrors.size > 0 && (
                  <Badge variant="destructive" className="text-base">
                    <XCircle className="h-3 w-3 mr-1" />
                    {validationErrors.size} มีข้อผิดพลาด
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={resetDialog}>
                เลือกไฟล์ใหม่
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>เบอร์โทร</TableHead>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>คะแนน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.map((member, index) => {
                    const errors = validationErrors.get(index);
                    const hasError = !!errors;
                    return (
                      <TableRow key={index} className={hasError ? 'bg-destructive/10' : ''}>
                        <TableCell className="font-mono text-sm">{index + 1}</TableCell>
                        <TableCell>
                          {hasError ? (
                            <div className="flex items-center gap-1 text-destructive">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-xs">{errors?.join(', ')}</span>
                            </div>
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{member.phone || '-'}</TableCell>
                        <TableCell>{member.first_name} {member.last_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {memberTypeLabels[member.member_type] || member.member_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{member.tier || 'bronze'}</TableCell>
                        <TableCell>{member.total_points?.toLocaleString() || 0}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                ยกเลิก
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isImporting || validCount === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังนำเข้า...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    นำเข้า {validCount} รายการ
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'results' && importResults && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold text-green-600">{importResults.success.length}</p>
                <p className="text-sm text-green-600">นำเข้าสำเร็จ</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4 text-center">
                <AlertCircle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{importResults.skipped.length}</p>
                <p className="text-sm text-yellow-600">ข้าม (ซ้ำ)</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 text-center">
                <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold text-red-600">{importResults.failed.length}</p>
                <p className="text-sm text-red-600">ล้มเหลว</p>
              </div>
            </div>

            {importResults.skipped.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 text-yellow-600">รายการที่ถูกข้าม:</h4>
                <ScrollArea className="max-h-32">
                  <ul className="text-sm space-y-1">
                    {importResults.skipped.map((item, i) => (
                      <li key={i} className="text-muted-foreground">
                        {item.phone}: {item.reason}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {importResults.failed.length > 0 && (
              <div className="border border-destructive/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 text-destructive">รายการที่ล้มเหลว:</h4>
                <ScrollArea className="max-h-32">
                  <ul className="text-sm space-y-1">
                    {importResults.failed.map((item, i) => (
                      <li key={i} className="text-destructive">
                        {item.phone}: {item.error}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={resetDialog}>
                นำเข้าเพิ่มเติม
              </Button>
              <Button onClick={handleClose}>
                เสร็จสิ้น
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
