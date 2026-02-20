import { useState } from 'react';
import { CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  points: number;
  order_index: number;
}

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onComplete: (score: number, totalPoints: number) => void;
}

export default function QuizPlayer({ questions, onComplete }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const sortedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);
  const currentQuestion = sortedQuestions[currentIndex];
  const totalQuestions = sortedQuestions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    setIsAnswered(true);
    if (selectedAnswer === currentQuestion.correct_answer) {
      setScore((prev) => prev + 1);
      setEarnedPoints((prev) => prev + currentQuestion.points);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsCompleted(true);
      // We don't call onComplete here anymore, we wait for user to click "Claim Reward" in the summary view if they pass
      // onComplete(finalScore, finalPoints);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setEarnedPoints(0);
    setIsCompleted(false);
  };

  if (isCompleted) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const isPassed = percentage === 100;

    return (
      <Card className="text-center">
        <CardContent className="p-8">
          <div
            className={cn(
              'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4',
              isPassed ? 'bg-accent/20' : 'bg-destructive/20'
            )}
          >
            {isPassed ? (
              <CheckCircle className="w-10 h-10 text-accent" />
            ) : (
              <XCircle className="w-10 h-10 text-destructive" />
            )}
          </div>
          <h3 className="text-2xl font-bold mb-2">
            {isPassed ? '🎉 ยินดีด้วย!' : 'เสียใจด้วยนะ'}
          </h3>
          <p className="text-muted-foreground mb-4">
            คุณตอบถูก {score} จาก {totalQuestions} ข้อ ({percentage}%)
          </p>

          {isPassed ? (
            <div className="bg-primary/10 rounded-lg p-4 mb-4">
              <p className="text-lg font-semibold text-primary">
                ได้รับ {earnedPoints} คะแนน
              </p>
            </div>
          ) : (
            <div className="bg-destructive/10 rounded-lg p-4 mb-4">
              <p className="text-destructive">
                คุณต้องตอบถูกทุกข้อเพื่อรับคะแนน
              </p>
            </div>
          )}

          {isPassed ? (
            <Button
              onClick={() => onComplete(score, earnedPoints)}
              className="w-full gradient-primary text-white"
            >
              รับคะแนน
            </Button>
          ) : (
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary/5"
            >
              ลองใหม่อีกครั้ง
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            ข้อ {currentIndex + 1} / {totalQuestions}
          </span>
          <span className="text-sm font-medium text-primary">
            {currentQuestion.points} คะแนน
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <CardTitle className="text-lg leading-relaxed">
          {currentQuestion.question}
        </CardTitle>

        <RadioGroup
          value={selectedAnswer?.toString()}
          onValueChange={(val) => !isAnswered && setSelectedAnswer(parseInt(val))}
          className="space-y-3"
        >
          {currentQuestion.options.map((option, index) => {
            const isCorrect = index === currentQuestion.correct_answer;
            const isSelected = selectedAnswer === index;

            return (
              <div
                key={index}
                className={cn(
                  'flex items-center space-x-3 rounded-lg border p-4 transition-colors',
                  isAnswered && isCorrect && 'border-accent bg-accent/10',
                  isAnswered && isSelected && !isCorrect && 'border-destructive bg-destructive/10',
                  !isAnswered && isSelected && 'border-primary bg-primary/5',
                  !isAnswered && !isSelected && 'hover:bg-muted/50 cursor-pointer'
                )}
              >
                <RadioGroupItem
                  value={index.toString()}
                  id={`option-${index}`}
                  disabled={isAnswered}
                />
                <Label
                  htmlFor={`option-${index}`}
                  className={cn(
                    'flex-1 cursor-pointer',
                    isAnswered && 'cursor-default'
                  )}
                >
                  {option}
                </Label>
                {isAnswered && isCorrect && (
                  <CheckCircle className="w-5 h-5 text-accent" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>
            );
          })}
        </RadioGroup>

        <div className="flex gap-3">
          {!isAnswered ? (
            <Button
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
              className="flex-1"
            >
              ตรวจคำตอบ
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1 gradient-primary text-white">
              {currentIndex < totalQuestions - 1 ? (
                <>
                  ข้อถัดไป
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                'ดูผลลัพธ์'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
