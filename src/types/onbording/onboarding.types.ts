export interface Question {
  id: number;
  question: string;
}

export interface AnswerInput {
  questionId: number;
  answer: string;
}

export interface SaveAnswersRequest {
  answers: AnswerInput[];
}

export interface UserAnswer {
  id: number;
  userId: number;
  questionId: number;
  answer: string;
}

export interface IsAnsweredResponse {
  allAnswered: boolean;
}
