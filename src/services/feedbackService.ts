import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase.config';

export interface FeedbackInput {
  userId?: string;
  subject: string;
  message: string;
  platform?: string;
  appVersion?: string;
}

export class FeedbackService {
  static async submit(feedback: FeedbackInput): Promise<string> {
    const ref = await addDoc(collection(db, 'feedback'), {
      userId: feedback.userId || null,
      subject: feedback.subject,
      message: feedback.message,
      platform: feedback.platform || null,
      appVersion: feedback.appVersion || null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }
}
