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

  getUserById(uid: string): Observable<User> {
    const ref = doc(this.firestore, this.collectionName, uid);
    return from(getDoc(ref)).pipe(
      map(snap => snap.exists() ? ({ uid: snap.id, ...snap.data() } as User) : null as any)
    );
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

  // Creates the profile only when one doesn't exist yet, for sign-in methods
  // that can't tell a first-time signup from a repeat visit (OAuth). Calling
  // createUser() unconditionally would be destructive: its setDoc has no
  // merge, so a returning user would lose savedProperties and an admin/agent
  // would be reset to role 'user'. Resolves true only when a new profile was
  // written, so callers can treat that as "a new account just joined".
  async ensureUserDocument(uid: string, data: Partial<User>): Promise<boolean> {
    const ref = doc(this.firestore, this.collectionName, uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await setDoc(ref, { lastLoginAt: new Date() }, { merge: true });
      return false;
    }
    await this.createUser(uid, data);
    return true;
  }

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