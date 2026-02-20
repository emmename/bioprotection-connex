import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Video, FileQuestion, ClipboardList, Star, CheckCircle } from 'lucide-react';
import DOMPurify from 'dompurify';
import { QuizQuestion } from './QuizEditor';
import { SurveyQuestion } from './SurveyEditor';

interface ContentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  contentType: 'article' | 'video' | 'quiz' | 'survey';
  contentBody: string;
  videoUrl: string;
  pointsReward: number;
  quizQuestions: QuizQuestion[];
  surveyQuestions: SurveyQuestion[];
}

const getContentIcon = (type: string) => {
  switch (type) {
    case 'article': return <BookOpen className="w-4 h-4" />;
    case 'video': return <Video className="w-4 h-4" />;
    case 'quiz': return <FileQuestion className="w-4 h-4" />;
    case 'survey': return <ClipboardList className="w-4 h-4" />;
    default: return <BookOpen className="w-4 h-4" />;
  }
};

const getContentTypeLabel = (type: string) => {
  switch (type) {
    case 'article': return 'บทความ';
    case 'video': return 'วิดีโอ';
    case 'quiz': return 'แบบทดสอบ';
    case 'survey': return 'แบบสำรวจ';
    default: return type;
  }
};

const getQuestionTypeLabel = (type: string) => {
  switch (type) {
    case 'single_choice': return 'เลือกตัวเลือกเดียว';
    case 'multiple_choice': return 'เลือกหลายตัวเลือก';
    case 'rating': return 'ให้คะแนน';
    case 'text': return 'ข้อความ';
    case 'likert': return 'Likert Scale';
    case 'ranking': return 'จัดลำดับ';
    case 'matrix': return 'ตาราง';
    case 'slider': return 'Slider';
    default: return type;
  }
};

export function ContentPreview({
  open,
  onOpenChange,
  title,
  description,
  contentType,
  contentBody,
  videoUrl,
  pointsReward,
  quizQuestions,
  surveyQuestions,
}: ContentPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>ตัวอย่างเนื้อหา</span>
            <Badge variant="outline">Preview</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="space-y-6 p-1">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {getContentIcon(contentType)}
                  <span className="ml-1">{getContentTypeLabel(contentType)}</span>
                </Badge>
                <div className="flex items-center gap-1 text-warning">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-medium">{pointsReward} คะแนน</span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold">{title || 'ยังไม่ได้ระบุชื่อ'}</h2>
                {description && (
                  <p className="text-muted-foreground mt-2">{description}</p>
                )}
              </div>
            </div>

            {/* Article Content */}
            {contentType === 'article' && (
              <Card>
                <CardContent className="p-6">
                  {contentBody ? (
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(contentBody, {
                          ADD_TAGS: ['iframe'],
                          ADD_ATTR: ['style', 'class', 'target', 'src', 'frameborder', 'allow', 'allowfullscreen', 'scrolling']
                        })
                      }}
                    />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">ยังไม่มีเนื้อหาบทความ</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Video Content */}
            {contentType === 'video' && (
              <Card>
                <CardContent className="p-6">
                  {videoUrl ? (
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <iframe
                        src={videoUrl}
                        title="Video Preview"
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <Video className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quiz Preview */}
            {contentType === 'quiz' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">คำถามแบบทดสอบ ({quizQuestions.length} ข้อ)</h3>
                {quizQuestions.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      ยังไม่มีคำถาม
                    </CardContent>
                  </Card>
                ) : (
                  quizQuestions.map((question, index) => (
                    <Card key={question.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">
                            ข้อ {index + 1}: {question.question}
                          </span>
                          <Badge variant="outline">{question.points} คะแนน</Badge>
                        </div>
                        <div className="space-y-2 pl-4">
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`flex items-center gap-2 p-2 rounded-md ${optIndex === question.correctAnswer
                                  ? 'bg-accent/20 border border-accent/50'
                                  : 'bg-muted/50'
                                }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${optIndex === question.correctAnswer
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-muted-foreground/20'
                                }`}>
                                {String.fromCharCode(65 + optIndex)}
                              </div>
                              <span className="text-sm">{option}</span>
                              {optIndex === question.correctAnswer && (
                                <CheckCircle className="w-4 h-4 text-accent ml-auto" />
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Survey Preview */}
            {contentType === 'survey' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">คำถามแบบสำรวจ ({surveyQuestions.length} ข้อ)</h3>
                {surveyQuestions.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      ยังไม่มีคำถาม
                    </CardContent>
                  </Card>
                ) : (
                  surveyQuestions.map((question, index) => (
                    <Card key={question.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-medium">
                            ข้อ {index + 1}: {question.question}
                            {question.isRequired && <span className="text-destructive">*</span>}
                          </span>
                          <div className="flex gap-2 flex-shrink-0">
                            <Badge variant="secondary">{getQuestionTypeLabel(question.questionType)}</Badge>
                            {question.isScreening && (
                              <Badge variant="destructive">คัดกรอง</Badge>
                            )}
                          </div>
                        </div>

                        {/* Preview based on question type */}
                        <div className="pl-4">
                          {(question.questionType === 'single_choice' || question.questionType === 'multiple_choice') && (
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                                  <div className={`w-4 h-4 border ${question.questionType === 'single_choice' ? 'rounded-full' : 'rounded-sm'
                                    }`} />
                                  <span className="text-sm">{option}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {question.questionType === 'rating' && (
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="w-6 h-6 text-muted-foreground" />
                              ))}
                            </div>
                          )}

                          {question.questionType === 'text' && (
                            <div className="bg-muted/50 rounded-md p-3 h-20 flex items-start">
                              <span className="text-muted-foreground text-sm">ช่องให้พิมพ์คำตอบ...</span>
                            </div>
                          )}

                          {question.questionType === 'likert' && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-muted-foreground px-2">
                                <span>ไม่เห็นด้วยอย่างยิ่ง</span>
                                <span>เห็นด้วยอย่างยิ่ง</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                {[1, 2, 3, 4, 5].map((level) => (
                                  <div key={level} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/30" />
                                    <span className="text-xs">{level}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {question.questionType === 'ranking' && (
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md cursor-move">
                                  <span className="text-muted-foreground">≡</span>
                                  <span className="text-sm">{option}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {question.questionType === 'matrix' && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr>
                                    <th className="p-2 text-left"></th>
                                    {question.matrixColumns?.map((col, i) => (
                                      <th key={i} className="p-2 text-center">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {question.matrixRows?.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="border-t">
                                      <td className="p-2">{row}</td>
                                      {question.matrixColumns?.map((_, colIndex) => (
                                        <td key={colIndex} className="p-2 text-center">
                                          <div className="w-4 h-4 rounded-full border mx-auto" />
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {question.questionType === 'slider' && (
                            <div className="space-y-2 px-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{question.sliderMin ?? 0}</span>
                                <span>{question.sliderMax ?? 100}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full">
                                <div className="h-full w-1/2 bg-primary rounded-full" />
                              </div>
                            </div>
                          )}

                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
