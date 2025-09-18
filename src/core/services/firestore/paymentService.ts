import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { db } from '@app/config/firebase.config';
import { COLLECTIONS } from './constants';
import type { FirestorePayment } from './types';

export class PaymentFirestoreService {
  static async addPayment(data: Omit<FirestorePayment, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(db, COLLECTIONS.PAYMENTS), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }
}

