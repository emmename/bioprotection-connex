import { useState, useRef } from 'react';
import { ChevronRight, ChevronLeft, Send, Upload, X, Loader2, Camera, Image as ImageIcon, Star, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SurveyQuestion {
  id: string;
  question: string;
  question_type: string;
  options: Json;
  is_required: boolean;
  order_index: number;
}

interface SurveyPlayerProps {
  questions: SurveyQuestion[];
  onComplete: (responses: Record<string, unknown>) => void;
  isLongForm?: boolean;
}

interface QuestionOptions {
  choices?: string[];
  labels?: string[];
  min?: number;
  max?: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
  items?: string[];
  rows?: string[];
  columns?: string[];
  screeningCorrectAnswer?: number;
  allowMultipleImages?: boolean;
  maxImages?: number;
  allowAdditionalText?: boolean[];
  additionalTextPlaceholder?: string[];
}

export default function SurveyPlayer({ questions, onComplete, isLongForm = false }: SurveyPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const sortedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);
  const currentQuestion = sortedQuestions[currentIndex];
  const totalQuestions = sortedQuestions.length;
  const progress = isLongForm ? 100 : ((currentIndex + 1) / totalQuestions) * 100;

  const getOptions = (options: Json): QuestionOptions => {
    // Handle the legacy scenario where options was stored as an array directly
    if (Array.isArray(options)) {
      return { choices: options as string[] };
    }
    if (typeof options === 'object' && options !== null) {
      return options as QuestionOptions;
    }
    return {};
  };

  const currentResponse = responses[currentQuestion?.id];
  const options = currentQuestion ? getOptions(currentQuestion.options) : {};

  const isQuestionValid = (q: SurveyQuestion) => {
    if (!q.is_required) return true;
    const response = responses[q.id];
    if (response === undefined || response === null || response === '') return false;
    if (Array.isArray(response) && response.length === 0) return false;
    
    const opts = getOptions(q.options);
    if (q.question_type === 'matrix' && typeof response === 'object') {
      const rows = opts.rows || [];
      return rows.every((row) => (response as Record<string, number>)[row] !== undefined);
    }
    
    // Validate additional text if required
    if (q.question_type === 'single' || q.question_type === 'single_choice' || q.question_type === 'screening') {
      if (opts.allowAdditionalText?.[response as number]) {
         const text = responses[`${q.id}_text_${response}`];
         if (!text || (text as string).trim() === '') return false;
      }
    }
    if (q.question_type === 'multiple' || q.question_type === 'multiple_choice') {
      for (const idx of (response as number[])) {
        if (opts.allowAdditionalText?.[idx]) {
           const text = responses[`${q.id}_text_${idx}`];
           if (!text || (text as string).trim() === '') return false;
        }
      }
    }

    return true;
  };

  const isCurrentValid = () => {
    if (isLongForm) {
      return sortedQuestions.every(isQuestionValid);
    }
    return isQuestionValid(currentQuestion);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      onComplete(responses);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const updateResponse = (questionId: string, value: unknown) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const renderQuestion = (q: SurveyQuestion) => {
    const qResponse = responses[q.id];
    const qOptions = getOptions(q.options);

    switch (q.question_type) {
      case 'single':
      case 'single_choice':
      case 'screening':
        return (
          <RadioGroup
            value={qResponse?.toString()}
            onValueChange={(val) => updateResponse(q.id, parseInt(val))}
            className="space-y-3"
          >
            {(qOptions.choices || []).map((choice, index) => (
              <div key={index} className="space-y-2">
                <div
                  className={cn(
                    'flex items-center space-x-3 rounded-lg border p-4 transition-colors',
                    qResponse === index && 'border-primary bg-primary/5',
                    qResponse !== index && 'hover:bg-muted/50 cursor-pointer'
                  )}
                >
                  <RadioGroupItem value={index.toString()} id={`choice-${q.id}-${index}`} />
                  <Label htmlFor={`choice-${q.id}-${index}`} className="flex-1 cursor-pointer">
                    {choice}
                  </Label>
                </div>
                {qOptions.allowAdditionalText?.[index] && qResponse === index && (
                  <div className="pl-8 pr-4 pb-2 animate-in fade-in slide-in-from-top-1">
                    <Input
                      placeholder={qOptions.additionalTextPlaceholder?.[index] || "โปรดระบุรายละเอียดเพิ่มเติม..."}
                      value={(responses[`${q.id}_text_${index}`] as string) || ''}
                      onChange={(e) => setResponses(prev => ({ ...prev, [`${q.id}_text_${index}`]: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </RadioGroup>
        );

      case 'multiple':
      case 'multiple_choice': {
        const multiResponse = (qResponse as number[]) || [];
        return (
          <div className="space-y-3">
            {(qOptions.choices || []).map((choice, index) => (
              <div key={index} className="space-y-2">
                <div
                  className={cn(
                    'flex items-center space-x-3 rounded-lg border p-4 transition-colors',
                    multiResponse.includes(index) && 'border-primary bg-primary/5',
                    !multiResponse.includes(index) && 'hover:bg-muted/50 cursor-pointer'
                  )}
                  onClick={() => {
                    const newResponse = multiResponse.includes(index)
                      ? multiResponse.filter((i) => i !== index)
                      : [...multiResponse, index];
                    updateResponse(q.id, newResponse);
                  }}
                >
                  <Checkbox
                    checked={multiResponse.includes(index)}
                    id={`choice-${q.id}-${index}`}
                  />
                  <Label htmlFor={`choice-${q.id}-${index}`} className="flex-1 cursor-pointer">
                    {choice}
                  </Label>
                </div>
                {qOptions.allowAdditionalText?.[index] && multiResponse.includes(index) && (
                  <div className="pl-8 pr-4 pb-2 animate-in fade-in slide-in-from-top-1">
                    <Input
                      placeholder={qOptions.additionalTextPlaceholder?.[index] || "โปรดระบุรายละเอียดเพิ่มเติม..."}
                      value={(responses[`${q.id}_text_${index}`] as string) || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setResponses(prev => ({ ...prev, [`${q.id}_text_${index}`]: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      case 'rating': {
        const maxRating = qOptions.max || 5;
        const currentRating = (qResponse as number) || 0;
        return (
          <div className="flex justify-center gap-2 py-4">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => updateResponse(q.id, rating)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'w-10 h-10',
                    rating <= currentRating
                      ? 'fill-yellow-400 text-yellow-400 drop-shadow-md'
                      : 'text-gray-300'
                  )}
                />
              </button>
            ))}
          </div>
        );
      }

      case 'text':
        return (
          <Textarea
            value={(qResponse as string) || ''}
            onChange={(e) => updateResponse(q.id, e.target.value)}
            placeholder="พิมพ์คำตอบของคุณ..."
            className="min-h-[120px]"
          />
        );

      case 'likert': {
        const labels = qOptions.labels || ['ไม่เห็นด้วยอย่างยิ่ง', 'ไม่เห็นด้วย', 'เฉยๆ', 'เห็นด้วย', 'เห็นด้วยอย่างยิ่ง'];
        return (
          <div className="pt-2 pb-2">
            <RadioGroup
              value={qResponse?.toString()}
              onValueChange={(val) => updateResponse(q.id, parseInt(val))}
              className="flex justify-between"
            >
              {labels.map((label, index) => (
                <div key={index} className="flex flex-col items-center flex-1 gap-2">
                  <span className="text-xs text-center text-muted-foreground h-10 flex items-end justify-center px-1">
                    {label}
                  </span>
                  <RadioGroupItem
                    value={index.toString()}
                    id={`likert-${q.id}-${index}`}
                    className="h-6 w-6"
                  />
                  <Label 
                    htmlFor={`likert-${q.id}-${index}`} 
                    className="text-sm font-medium cursor-pointer"
                  >
                    {index + 1}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      }

      case 'ranking': {
        const items = qOptions.items || [];
        const ranking = (qResponse as string[]) || [];
        const unrankedItems = items.filter((item) => !ranking.includes(item));

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">ลำดับที่เลือก:</p>
              {ranking.length > 0 ? (
                <div className="space-y-2">
                  {ranking.map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="flex-1">{item}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateResponse(q.id, ranking.filter((i) => i !== item))}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">คลิกตัวเลือกด้านล่างเพื่อจัดลำดับ</p>
              )}
            </div>

            {unrankedItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">ตัวเลือก:</p>
                <div className="space-y-2">
                  {unrankedItems.map((item) => (
                    <Button
                      key={item}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => updateResponse(q.id, [...ranking, item])}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'matrix': {
        const rows = qOptions.rows || [];
        const columns = qOptions.columns || [];
        const matrixResponse = (qResponse as Record<string, number>) || {};

        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left"></th>
                  {columns.map((col, index) => (
                    <th key={index} className="p-2 text-center text-sm font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-border">
                    <td className="p-3 text-sm">{row}</td>
                    {columns.map((_, colIndex) => (
                      <td key={colIndex} className="p-2 text-center">
                        <RadioGroup
                          value={matrixResponse[row]?.toString()}
                          onValueChange={(val) =>
                            updateResponse(q.id, { ...matrixResponse, [row]: parseInt(val) })
                          }
                        >
                          <RadioGroupItem
                            value={colIndex.toString()}
                            id={`matrix-${q.id}-${rowIndex}-${colIndex}`}
                          />
                        </RadioGroup>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case 'slider': {
        const min = qOptions.min || 0;
        const max = qOptions.max || 100;
        const step = qOptions.step || 1;
        const sliderValue = (qResponse as number) ?? Math.floor((min + max) / 2);

        return (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <span className="text-4xl font-bold text-primary">{sliderValue}</span>
            </div>
            <Slider
              value={[sliderValue]}
              onValueChange={(val) => updateResponse(q.id, val[0])}
              min={min}
              max={max}
              step={step}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{qOptions.minLabel || min}</span>
              <span>{qOptions.maxLabel || max}</span>
            </div>
          </div>
        );
      }

      case 'image_upload': {
        const allowMultiple = qOptions.allowMultipleImages || false;
        const maxImages = qOptions.maxImages || 5;
        const uploadedImages = (qResponse as string[]) || [];

        const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(e.target.files || []);
          if (files.length === 0) return;

          if (!allowMultiple && files.length > 1) {
            toast({ title: 'อัปโหลดได้เพียง 1 รูป', variant: 'destructive' });
            return;
          }

          if (allowMultiple && uploadedImages.length + files.length > maxImages) {
            toast({ title: `อัปโหลดได้สูงสุด ${maxImages} รูป`, variant: 'destructive' });
            return;
          }

          setIsUploading(true);
          try {
            const newUrls: string[] = [];
            for (const file of files) {
              if (!file.type.startsWith('image/')) {
                 toast({ title: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น', variant: 'destructive' });
                 continue;
              }
              if (file.size > 5 * 1024 * 1024) {
                 toast({ title: 'ขนาดไฟล์ต้องไม่เกิน 5MB', variant: 'destructive' });
                 continue;
              }

              const fileExt = file.name.split('.').pop();
              const fileName = `${user?.id || 'anonymous'}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

              const { error: uploadError } = await supabase.storage
                .from('survey_responses')
                .upload(fileName, file);

              if (uploadError) throw uploadError;

              const { data: urlData } = supabase.storage
                .from('survey_responses')
                .getPublicUrl(fileName);

              newUrls.push(urlData.publicUrl);
            }

            if (newUrls.length > 0) {
              updateResponse(q.id, allowMultiple ? [...uploadedImages, ...newUrls] : newUrls);
            }
          } catch (error) {
            toast({
              title: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
              description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
              variant: 'destructive',
            });
          } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        };

        const removeImage = (indexToRemove: number) => {
          updateResponse(q.id, uploadedImages.filter((_, idx) => idx !== indexToRemove));
        };

        return (
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              multiple={allowMultiple}
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {uploadedImages.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {(!uploadedImages.length || (allowMultiple && uploadedImages.length < maxImages)) && (
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                  isUploading ? "opacity-50 cursor-not-allowed border-muted" : "cursor-pointer hover:border-primary/50 border-muted-foreground/25"
                )}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    ) : (
                      <Camera className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {isUploading ? 'กำลังอัปโหลด...' : 'คลิกเพื่อเลือกรูปภาพ'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5MB
                    </p>
                    {allowMultiple && (
                      <p className="text-xs text-muted-foreground mt-1">
                        (อัปโหลดได้สูงสุด {maxImages} รูป)
                      </p>
                    )}
                  </div>
                  <Button variant="outline" type="button" disabled={isUploading}>
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="mr-2 h-4 w-4" />
                    )}
                    {isUploading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'date':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">เลือกวันที่</span>
            </div>
            <Input
              type="date"
              value={(qResponse as string) || ''}
              onChange={(e) => updateResponse(q.id, e.target.value)}
              className="w-full max-w-xs"
            />
          </div>
        );

      default:
        return (
          <Input
            value={(qResponse as string) || ''}
            onChange={(e) => updateResponse(q.id, e.target.value)}
            placeholder="พิมพ์คำตอบของคุณ..."
          />
        );
    }
  };

  if (isCompleted) {
    return (
      <Card className="text-center">
        <CardContent className="p-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-accent/20 flex items-center justify-center mb-4">
            <Send className="w-10 h-10 text-accent" />
          </div>
          <h3 className="text-2xl font-bold mb-2">ขอบคุณ!</h3>
          <p className="text-muted-foreground">
            คำตอบของคุณถูกบันทึกเรียบร้อยแล้ว
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  if (isLongForm) {
    return (
      <div className="space-y-6">
        {sortedQuestions.map((q, index) => (
          <Card key={q.id}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  ข้อ {index + 1} / {totalQuestions}
                </span>
                {q.is_required && (
                  <span className="text-xs text-destructive">* จำเป็น</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <CardTitle className="text-lg leading-relaxed">
                {q.question}
                {q.is_required && <span className="text-destructive ml-1">*</span>}
              </CardTitle>

              {renderQuestion(q)}
            </CardContent>
          </Card>
        ))}
        
        <div className="flex justify-end pt-4">
          <Button
            onClick={() => onComplete(responses)}
            disabled={!isCurrentValid() || isUploading}
            className="w-full sm:w-auto gradient-primary text-white"
            size="lg"
          >
            <Send className="w-4 h-4 mr-2" />
            ส่งคำตอบฉบับสมบูรณ์
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            ข้อ {currentIndex + 1} / {totalQuestions}
          </span>
          {currentQuestion.is_required && (
            <span className="text-xs text-destructive">* จำเป็น</span>
          )}
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <CardTitle className="text-lg leading-relaxed">
          {currentQuestion.question}
          {currentQuestion.is_required && <span className="text-destructive ml-1">*</span>}
        </CardTitle>

        {renderQuestion(currentQuestion)}

        <div className="flex gap-3">
          {currentIndex > 0 && (
            <Button variant="outline" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              ก่อนหน้า
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!isCurrentValid() || isUploading}
            className={cn('flex-1', currentIndex === totalQuestions - 1 && 'gradient-primary text-white')}
          >
            {currentIndex < totalQuestions - 1 ? (
              <>
                ถัดไป
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
                ส่งคำตอบ
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
