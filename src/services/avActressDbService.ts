import { db } from '../config/firebase.config';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  startAfter,
} from 'firebase/firestore';

export interface AvActress {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const COLLECTION_NAME = 'avActresses';

export async function getAvActressNames(max = 20000): Promise<string[]> {
  try {
    const names: string[] = [];
    let last: any | undefined = undefined;
    const pageSize = 1000;

    // ページングで最大 max 件まで取得
    while (names.length < max) {
      const q = last
        ? query(
            collection(db, COLLECTION_NAME),
            orderBy('name'),
            startAfter(last),
            limit(pageSize),
          )
        : query(collection(db, COLLECTION_NAME), orderBy('name'), limit(pageSize));

      const snapshot = await getDocs(q);
      if (snapshot.empty) break;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AvActress;
        if ((data as any).isActive !== false) {
          // isActive が無いデータは有効扱い
          if (data.name && typeof data.name === 'string') names.push(data.name);
        }
      });

      last = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.size < pageSize) break; // 取り切った
    }

    return names;
  } catch (error) {
    console.error('Failed to fetch AV actress names:', error);
    return [];
  }
}

export async function addAvActressName(name: string): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      name: name.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    });

    return docRef.id;
  } catch (error) {
    console.error('Failed to add AV actress name:', error);
    return null;
  }
}

export async function deactivateAvActressName(idOrName: string): Promise<boolean> {
  try {
    const directRef = doc(db, COLLECTION_NAME, idOrName);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      await deleteDoc(directRef);
      return true;
    }

    const findByName = query(
      collection(db, COLLECTION_NAME),
      where('name', '==', idOrName.trim()),
      limit(1),
    );

    const snapshot = await getDocs(findByName);
    if (snapshot.empty) {
      return false;
    }

    await deleteDoc(snapshot.docs[0].ref);
    return true;
  } catch (error) {
    console.error('Failed to deactivate AV actress name:', error);
    return false;
  }
}

export async function addMultipleAvActressNames(names: string[]): Promise<number> {
  let successCount = 0;

  for (const name of names) {
    if (name.trim()) {
      const result = await addAvActressName(name.trim());
      if (result) {
        successCount += 1;
      }
    }
  }

  return successCount;
}
