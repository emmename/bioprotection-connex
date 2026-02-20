import { useState } from 'react';
import { ChevronRight, ChevronLeft, Send } from 'lucide-react';
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
}

export default function SurveyPlayer({ questions, onComplete }: SurveyPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const sortedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);
  const currentQuestion = sortedQuestions[currentIndex];
  const totalQuestions = sortedQuestions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const getOptions = (options: Json): QuestionOptions => {
    if (typeof options === 'object' && options !== null && !Array.isArray(options)) {
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
      case 'screening':
        return (
          <RadioGroup
            value={currentResponse?.toString()}
            onValueChange={(val) => updateResponse(parseInt(val))}
            className="space-y-3"
          >
            {(options.choices || []).map((choice, index) => (
              <div
                key={index}
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
            ))}
          </RadioGroup>
        );

      case 'multiple': {
        const multiResponse = (currentResponse as number[]) || [];
        return (
          <div className="space-y-3">
            {(options.choices || []).map((choice, index) => (
              <div
                key={index}
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
            ))}
          </div>
        );
      }

      case 'rating': {
        const maxRating = options.max || 5;
        return (
          <div className="flex justify-center gap-2 py-4">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <Button
                key={rating}
                variant={currentResponse === rating ? 'default' : 'outline'}
                size="lg"
                onClick={() => updateResponse(rating)}
                className={cn(
                  'w-12 h-12 text-lg',
                  currentResponse === rating && 'gradient-primary text-white'
                )}
              >
                {rating}
              </Button>
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

      case 'likert':
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              {(options.labels || ['ไม่เห็นด้วยอย่างยิ่ง', 'ไม่เห็นด้วย', 'เฉยๆ', 'เห็นด้วย', 'เห็นด้วยอย่างยิ่ง']).map(
                (label, index) => (
                  <span key={index} className="text-center flex-1">
                    {label}
                  </span>
                )
              )}
            </div>
            <RadioGroup
              value={currentResponse?.toString()}
              onValueChange={(val) => updateResponse(parseInt(val))}
              className="flex justify-between"
            >
              {(options.labels || ['', '', '', '', '']).map((_, index) => (
                <div key={index} className="flex flex-col items-center">
                  <RadioGroupItem
                    value={index.toString()}
                    id={`likert-${index}`}
                    className="h-6 w-6"
                  />
                </div>
              ))}
            </RadioGroup>
          </div>
        );

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
            disabled={!isCurrentValid()}
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
