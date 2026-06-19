import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from './models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);
  private readonly collectionName = 'users';

  // getDoc (one-shot Promise) instead of docData (real-time WebSocket listener).
  // docData was causing the "Firebase APIs outside Injection context" warning
  // because real-time listeners don't play well with firstValueFrom/async contexts.
  getUserById(uid: string): Observable<User> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return from(getDoc(ref)).pipe(
      map(snap => snap.exists() ? ({ uid: snap.id, ...snap.data() } as User) : null as any)
    );
  }

  // setDoc creates the full document on registration
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

  // setDoc + merge:true — creates the doc if missing, patches it if it exists.
  // updateDoc throws "No document to update" if the user doc was never created
  // (e.g. users registered before createUser was wired up).
  updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return setDoc(ref, { ...data }, { merge: true });
  }

  saveProperty(uid: string, propertyId: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return setDoc(ref, { savedProperties: arrayUnion(propertyId) }, { merge: true });
  }

  unsaveProperty(uid: string, propertyId: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return setDoc(ref, { savedProperties: arrayRemove(propertyId) }, { merge: true });
  }

  getSavedPropertyIds(uid: string): Observable<User> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return from(getDoc(ref)).pipe(
      map(snap => snap.exists() ? ({ uid: snap.id, ...snap.data() } as User) : null as any)
    );
  }
}