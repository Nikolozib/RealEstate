import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  collectionData,
  query,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { User } from './models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly collectionName = 'users';

  constructor(private firestore: Firestore) {}

  getUserById(uid: string): Observable<User> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return docData(ref, { idField: 'uid' }) as Observable<User>;
  }

  createUser(uid: string, data: Partial<User>): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return setDoc(ref, {
      ...data,
      uid,
      role: 'user',
      savedProperties: [],
      createdAt: new Date(),
      lastLoginAt: new Date()
    });
  }

  updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return updateDoc(ref, { ...data });
  }

  saveProperty(uid: string, propertyId: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return updateDoc(ref, { savedProperties: arrayUnion(propertyId) });
  }

  unsaveProperty(uid: string, propertyId: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return updateDoc(ref, { savedProperties: arrayRemove(propertyId) });
  }

  getSavedPropertyIds(uid: string): Observable<User> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return docData(ref, { idField: 'uid' }) as Observable<User>;
  }
}