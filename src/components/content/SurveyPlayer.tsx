import { useState, useRef } from 'react';
import { ChevronRight, ChevronLeft, Send, Upload, X, Loader2, Camera, Image as ImageIcon, Star } from 'lucide-react';
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

export default function SurveyPlayer({ questions, onComplete }: SurveyPlayerProps) {
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
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

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

  const isCurrentValid = () => {
    if (!currentQuestion.is_required) return true;
    const response = responses[currentQuestion.id];
    if (response === undefined || response === null || response === '') return false;
    if (Array.isArray(response) && response.length === 0) return false;
    if (currentQuestion.question_type === 'matrix' && typeof response === 'object') {
      const rows = options.rows || [];
      return rows.every((row) => response[row] !== undefined);
    }
    
    // Validate additional text if required
    if (currentQuestion.question_type === 'single' || currentQuestion.question_type === 'single_choice' || currentQuestion.question_type === 'screening') {
      if (options.allowAdditionalText?.[response as number]) {
         const text = responses[`${currentQuestion.id}_text_${response}`];
         if (!text || (text as string).trim() === '') return false;
      }
    }
    if (currentQuestion.question_type === 'multiple' || currentQuestion.question_type === 'multiple_choice') {
      for (const idx of (response as number[])) {
        if (options.allowAdditionalText?.[idx]) {
           const text = responses[`${currentQuestion.id}_text_${idx}`];
           if (!text || (text as string).trim() === '') return false;
        }
      }
    }

    return true;
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

  const updateResponse = (value: unknown) => {
    setResponses((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const renderQuestion = () => {
    switch (currentQuestion.question_type) {
      case 'single':
      case 'single_choice':
      case 'screening':
        return (
          <RadioGroup
            value={currentResponse?.toString()}
            onValueChange={(val) => updateResponse(parseInt(val))}
            className="space-y-3"
          >
            {(options.choices || []).map((choice, index) => (
              <div key={index} className="space-y-2">
                <div
                  className={cn(
                    'flex items-center space-x-3 rounded-lg border p-4 transition-colors',
                    currentResponse === index && 'border-primary bg-primary/5',
                    currentResponse !== index && 'hover:bg-muted/50 cursor-pointer'
                  )}
                >
                  <RadioGroupItem value={index.toString()} id={`choice-${index}`} />
                  <Label htmlFor={`choice-${index}`} className="flex-1 cursor-pointer">
                    {choice}
                  </Label>
                </div>
                {options.allowAdditionalText?.[index] && currentResponse === index && (
                  <div className="pl-8 pr-4 pb-2 animate-in fade-in slide-in-from-top-1">
                    <Input
                      placeholder={options.additionalTextPlaceholder?.[index] || "โปรดระบุรายละเอียดเพิ่มเติม..."}
                      value={(responses[`${currentQuestion.id}_text_${index}`] as string) || ''}
                      onChange={(e) => setResponses(prev => ({ ...prev, [`${currentQuestion.id}_text_${index}`]: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </RadioGroup>
        );

      case 'multiple':
      case 'multiple_choice': {
        const multiResponse = (currentResponse as number[]) || [];
        return (
          <div className="space-y-3">
            {(options.choices || []).map((choice, index) => (
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
                    updateResponse(newResponse);
                  }}
                >
                  <Checkbox
                    checked={multiResponse.includes(index)}
                    id={`choice-${index}`}
                  />
                  <Label htmlFor={`choice-${index}`} className="flex-1 cursor-pointer">
                    {choice}
                  </Label>
                </div>
                {options.allowAdditionalText?.[index] && multiResponse.includes(index) && (
                  <div className="pl-8 pr-4 pb-2 animate-in fade-in slide-in-from-top-1">
                    <Input
                      placeholder={options.additionalTextPlaceholder?.[index] || "โปรดระบุรายละเอียดเพิ่มเติม..."}
                      value={(responses[`${currentQuestion.id}_text_${index}`] as string) || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setResponses(prev => ({ ...prev, [`${currentQuestion.id}_text_${index}`]: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      case 'rating': {
        const maxRating = options.max || 5;
        const currentRating = (currentResponse as number) || 0;
        return (
          <div className="flex justify-center gap-2 py-4">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => updateResponse(rating)}
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
            value={(currentResponse as string) || ''}
            onChange={(e) => updateResponse(e.target.value)}
            placeholder="พิมพ์คำตอบของคุณ..."
            className="min-h-[120px]"
          />
        );

      case 'likert': {
        const labels = options.labels || ['ไม่เห็นด้วยอย่างยิ่ง', 'ไม่เห็นด้วย', 'เฉยๆ', 'เห็นด้วย', 'เห็นด้วยอย่างยิ่ง'];
        return (
          <div className="pt-2 pb-2">
            <RadioGroup
              value={currentResponse?.toString()}
              onValueChange={(val) => updateResponse(parseInt(val))}
              className="flex justify-between"
            >
              {labels.map((label, index) => (
                <div key={index} className="flex flex-col items-center flex-1 gap-2">
                  <span className="text-xs text-center text-muted-foreground h-10 flex items-end justify-center px-1">
                    {label}
                  </span>
                  <RadioGroupItem
                    value={index.toString()}
                    id={`likert-${index}`}
                    className="h-6 w-6"
                  />
                  <Label 
                    htmlFor={`likert-${index}`} 
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
        const items = options.items || [];
        const ranking = (currentResponse as string[]) || [];
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
                        onClick={() => updateResponse(ranking.filter((i) => i !== item))}
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
                      onClick={() => updateResponse([...ranking, item])}
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
        const rows = options.rows || [];
        const columns = options.columns || [];
        const matrixResponse = (currentResponse as Record<string, number>) || {};

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
                            updateResponse({ ...matrixResponse, [row]: parseInt(val) })
                          }
                        >
                          <RadioGroupItem
                            value={colIndex.toString()}
                            id={`matrix-${rowIndex}-${colIndex}`}
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
        const min = options.min || 0;
        const max = options.max || 100;
        const step = options.step || 1;
        const sliderValue = (currentResponse as number) ?? Math.floor((min + max) / 2);

        return (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <span className="text-4xl font-bold text-primary">{sliderValue}</span>
            </div>
            <Slider
              value={[sliderValue]}
              onValueChange={(val) => updateResponse(val[0])}
              min={min}
              max={max}
              step={step}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{options.minLabel || min}</span>
              <span>{options.maxLabel || max}</span>
            </div>
          </div>
        );
      }

      case 'image_upload': {
        const allowMultiple = options.allowMultipleImages || false;
        const maxImages = options.maxImages || 5;
        const uploadedImages = (currentResponse as string[]) || [];

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
              updateResponse(allowMultiple ? [...uploadedImages, ...newUrls] : newUrls);
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
          updateResponse(uploadedImages.filter((_, idx) => idx !== indexToRemove));
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

      default:
        return (
          <Input
            value={(currentResponse as string) || ''}
            onChange={(e) => updateResponse(e.target.value)}
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

        {renderQuestion()}

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
