import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Star, MoveVertical, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

export type SurveyQuestionType = 
  | 'single_choice' 
  | 'multiple_choice' 
  | 'rating' 
  | 'text' 
  | 'likert' 
  | 'ranking' 
  | 'matrix' 
  | 'slider';

export interface SurveyQuestion {
  id: string;
  question: string;
  questionType: SurveyQuestionType;
  options: string[];
  isRequired: boolean;
  maxRating?: number;
  // Likert scale
  likertScale?: number;
  likertLabels?: { left: string; right: string };
  // Slider
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  sliderMinLabel?: string;
  sliderMaxLabel?: string;
  // Matrix
  matrixRows?: string[];
  matrixColumns?: string[];
  // Screening
  isScreening?: boolean;
  screeningLogic?: { option: string; action: 'continue' | 'terminate' };
}

interface SurveyEditorProps {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
}

const questionTypeLabels: Record<SurveyQuestionType, string> = {
  single_choice: 'เลือกตัวเลือกเดียว',
  multiple_choice: 'เลือกหลายตัวเลือก',
  rating: 'เรตติ้ง (ดาว)',
  text: 'ตอบในช่องว่าง',
  likert: 'Likert Scale',
  ranking: 'จัดลำดับ',
  matrix: 'ตาราง',
  slider: 'Slider',
};

export function SurveyEditor({ questions, onChange }: SurveyEditorProps) {
  const addQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: crypto.randomUUID(),
      question: '',
      questionType: 'single_choice',
      options: ['', ''],
      isRequired: true,
      maxRating: 5,
      likertScale: 5,
      likertLabels: { left: 'ไม่เห็นด้วยอย่างยิ่ง', right: 'เห็นด้วยอย่างยิ่ง' },
      sliderMin: 0,
      sliderMax: 100,
      sliderStep: 1,
      sliderMinLabel: '',
      sliderMaxLabel: '',
      matrixRows: [''],
      matrixColumns: [''],
      isScreening: false,
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<SurveyQuestion>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    onChange(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    onChange(newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    onChange(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length < 10) {
      newQuestions[questionIndex].options.push('');
      onChange(newQuestions);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length > 2) {
      newQuestions[questionIndex].options.splice(optionIndex, 1);
      onChange(newQuestions);
    }
  };

  const updateMatrixRow = (qIndex: number, rowIndex: number, value: string) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].matrixRows) {
      newQuestions[qIndex].matrixRows![rowIndex] = value;
      onChange(newQuestions);
    }
  };

  const updateMatrixColumn = (qIndex: number, colIndex: number, value: string) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].matrixColumns) {
      newQuestions[qIndex].matrixColumns![colIndex] = value;
      onChange(newQuestions);
    }
  };

  const addMatrixRow = (qIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].matrixRows && newQuestions[qIndex].matrixRows!.length < 10) {
      newQuestions[qIndex].matrixRows!.push('');
      onChange(newQuestions);
    }
  };

  const addMatrixColumn = (qIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].matrixColumns && newQuestions[qIndex].matrixColumns!.length < 10) {
      newQuestions[qIndex].matrixColumns!.push('');
      onChange(newQuestions);
    }
  };

  const removeMatrixRow = (qIndex: number, rowIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].matrixRows && newQuestions[qIndex].matrixRows!.length > 1) {
      newQuestions[qIndex].matrixRows!.splice(rowIndex, 1);
      onChange(newQuestions);
    }
  };

  const removeMatrixColumn = (qIndex: number, colIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].matrixColumns && newQuestions[qIndex].matrixColumns!.length > 1) {
      newQuestions[qIndex].matrixColumns!.splice(colIndex, 1);
      onChange(newQuestions);
    }
  };

  const renderQuestionTypePreview = (q: SurveyQuestion) => {
    switch (q.questionType) {
      case 'rating':
        return (
          <div className="flex items-center gap-1 mt-2">
            {[...Array(q.maxRating || 5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              ({q.maxRating || 5} ดาว)
            </span>
          </div>
        );
      case 'text':
        return (
          <div className="mt-2">
            <div className="h-20 border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground text-sm">
              ช่องสำหรับพิมพ์คำตอบ
            </div>
          </div>
        );
      case 'likert':
        return (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{q.likertLabels?.left || 'ไม่เห็นด้วย'}</span>
              <span>{q.likertLabels?.right || 'เห็นด้วย'}</span>
            </div>
            <div className="flex justify-between gap-2">
              {[...Array(q.likertScale || 5)].map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-6 h-6 rounded-full border-2 border-primary/50" />
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'ranking':
        return (
          <div className="mt-2 space-y-2">
            {q.options.filter(o => o).map((option, i) => (
              <div key={i} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                <MoveVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{i + 1}. {option || `ตัวเลือก ${i + 1}`}</span>
              </div>
            ))}
          </div>
        );
      case 'matrix':
        return (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2"></th>
                  {(q.matrixColumns || []).filter(c => c).map((col, i) => (
                    <th key={i} className="p-2 text-center text-xs font-medium">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(q.matrixRows || []).filter(r => r).map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 text-xs">{row}</td>
                    {(q.matrixColumns || []).filter(c => c).map((_, j) => (
                      <td key={j} className="p-2 text-center">
                        <div className="w-4 h-4 rounded-full border-2 mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'slider':
        return (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{q.sliderMinLabel || q.sliderMin}</span>
              <span>{q.sliderMaxLabel || q.sliderMax}</span>
            </div>
            <Slider
              value={[(q.sliderMin || 0) + ((q.sliderMax || 100) - (q.sliderMin || 0)) / 2]}
              min={q.sliderMin || 0}
              max={q.sliderMax || 100}
              step={q.sliderStep || 1}
              disabled
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderQuestionSettings = (q: SurveyQuestion, qIndex: number) => {
    switch (q.questionType) {
      case 'likert':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">จำนวนระดับ</Label>
                <Select
                  value={(q.likertScale || 5).toString()}
                  onValueChange={(value) => updateQuestion(qIndex, { likertScale: parseInt(value) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7].map((num) => (
                      <SelectItem key={num} value={num.toString()}>{num} ระดับ</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Label ด้านซ้าย</Label>
                <Input
                  value={q.likertLabels?.left || ''}
                  onChange={(e) => updateQuestion(qIndex, { 
                    likertLabels: { ...q.likertLabels!, left: e.target.value }
                  })}
                  placeholder="ไม่เห็นด้วยอย่างยิ่ง"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Label ด้านขวา</Label>
                <Input
                  value={q.likertLabels?.right || ''}
                  onChange={(e) => updateQuestion(qIndex, { 
                    likertLabels: { ...q.likertLabels!, right: e.target.value }
                  })}
                  placeholder="เห็นด้วยอย่างยิ่ง"
                />
              </div>
            </div>
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">ค่าต่ำสุด</Label>
                <Input
                  type="number"
                  value={q.sliderMin || 0}
                  onChange={(e) => updateQuestion(qIndex, { sliderMin: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">ค่าสูงสุด</Label>
                <Input
                  type="number"
                  value={q.sliderMax || 100}
                  onChange={(e) => updateQuestion(qIndex, { sliderMax: parseInt(e.target.value) || 100 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Step</Label>
                <Input
                  type="number"
                  value={q.sliderStep || 1}
                  onChange={(e) => updateQuestion(qIndex, { sliderStep: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Label ค่าต่ำสุด</Label>
                <Input
                  value={q.sliderMinLabel || ''}
                  onChange={(e) => updateQuestion(qIndex, { sliderMinLabel: e.target.value })}
                  placeholder="(ไม่ระบุจะแสดงตัวเลข)"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Label ค่าสูงสุด</Label>
                <Input
                  value={q.sliderMaxLabel || ''}
                  onChange={(e) => updateQuestion(qIndex, { sliderMaxLabel: e.target.value })}
                  placeholder="(ไม่ระบุจะแสดงตัวเลข)"
                />
              </div>
            </div>
          </div>
        );

      case 'matrix':
        return (
          <div className="space-y-4">
            {/* Matrix Rows */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">แถว (หัวข้อ)</Label>
                {(q.matrixRows?.length || 0) < 10 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addMatrixRow(qIndex)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    เพิ่มแถว
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {(q.matrixRows || []).map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center gap-2">
                    <Input
                      value={row}
                      onChange={(e) => updateMatrixRow(qIndex, rowIndex, e.target.value)}
                      placeholder={`แถวที่ ${rowIndex + 1}`}
                      className="flex-1"
                    />
                    {(q.matrixRows?.length || 0) > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMatrixRow(qIndex, rowIndex)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix Columns */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">คอลัมน์ (ตัวเลือก)</Label>
                {(q.matrixColumns?.length || 0) < 10 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addMatrixColumn(qIndex)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    เพิ่มคอลัมน์
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {(q.matrixColumns || []).map((col, colIndex) => (
                  <div key={colIndex} className="flex items-center gap-2">
                    <Input
                      value={col}
                      onChange={(e) => updateMatrixColumn(qIndex, colIndex, e.target.value)}
                      placeholder={`คอลัมน์ที่ ${colIndex + 1}`}
                      className="flex-1"
                    />
                    {(q.matrixColumns?.length || 0) > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMatrixColumn(qIndex, colIndex)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'rating':
        return (
          <div className="space-y-2">
            <Label className="text-sm">จำนวนดาว</Label>
            <Select
              value={(q.maxRating || 5).toString()}
              onValueChange={(value) => updateQuestion(qIndex, { maxRating: parseInt(value) })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 4, 5, 6, 7, 10].map((num) => (
                  <SelectItem key={num} value={num.toString()}>{num} ดาว</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">คำถามสำรวจ ({questions.length} ข้อ)</Label>
        <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
          <Plus className="h-4 w-4 mr-1" />
          เพิ่มคำถาม
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            ยังไม่มีคำถาม คลิก "เพิ่มคำถาม" เพื่อเริ่มต้น
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <Card key={q.id} className="relative">
              <CardContent className="pt-6 pb-4">
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveQuestion(qIndex, 'up')}
                    disabled={qIndex === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveQuestion(qIndex, 'down')}
                    disabled={qIndex === questions.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4 pl-8">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>คำถามที่ {qIndex + 1}</Label>
                      <Input
                        value={q.question}
                        onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                        placeholder="ระบุคำถาม"
                      />
                    </div>
                    <div className="w-48 space-y-2">
                      <Label>ประเภทคำถาม</Label>
                      <Select
                        value={q.questionType}
                        onValueChange={(value: SurveyQuestionType) => updateQuestion(qIndex, { questionType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(questionTypeLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive mt-6"
                      onClick={() => deleteQuestion(qIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={q.isRequired}
                        onCheckedChange={(checked) => updateQuestion(qIndex, { isRequired: checked })}
                      />
                      <Label className="text-sm">จำเป็นต้องตอบ</Label>
                    </div>
                    
                    {(q.questionType === 'single_choice' || q.questionType === 'multiple_choice') && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={q.isScreening || false}
                          onCheckedChange={(checked) => updateQuestion(qIndex, { isScreening: checked })}
                        />
                        <Label className="text-sm flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          คำถามคัดกรอง
                        </Label>
                      </div>
                    )}
                  </div>

                  {/* Options for choice types */}
                  {(q.questionType === 'single_choice' || q.questionType === 'multiple_choice' || q.questionType === 'ranking') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">ตัวเลือก</Label>
                        {q.options.length < 10 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addOption(qIndex)}
                            className="h-7 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            เพิ่มตัวเลือก
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {q.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            {q.questionType === 'ranking' ? (
                              <span className="shrink-0 w-6 h-6 flex items-center justify-center text-xs font-medium bg-muted rounded">
                                {oIndex + 1}
                              </span>
                            ) : (
                              <div className={cn(
                                "shrink-0 w-4 h-4 border-2 rounded",
                                q.questionType === 'single_choice' ? 'rounded-full' : 'rounded-sm'
                              )} />
                            )}
                            <Input
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder={`ตัวเลือกที่ ${oIndex + 1}`}
                              className="flex-1"
                            />
                            {q.options.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeOption(qIndex, oIndex)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Screening Logic */}
                      {q.isScreening && q.questionType === 'single_choice' && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-1">
                            <Filter className="h-3 w-3" />
                            ตั้งค่าการคัดกรอง
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            เลือกตัวเลือกที่จะยุติการสำรวจ (ผู้ตอบที่เลือกตัวเลือกนี้จะไม่ได้ทำแบบสำรวจต่อ)
                          </p>
                          <Select
                            value={q.screeningLogic?.option || ''}
                            onValueChange={(value) => updateQuestion(qIndex, { 
                              screeningLogic: { option: value, action: 'terminate' }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกตัวเลือกที่จะยุติการสำรวจ" />
                            </SelectTrigger>
                            <SelectContent>
                              {q.options.filter(o => o).map((option, i) => (
                                <SelectItem key={i} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Type-specific settings */}
                  {renderQuestionSettings(q, qIndex)}

                  {/* Preview */}
                  {renderQuestionTypePreview(q)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
