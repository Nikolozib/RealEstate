import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Inquiry } from './models/inquiry.model';

@Injectable({ providedIn: 'root' })
export class InquiryService {
  private firestore = inject(Firestore);
  private readonly collectionName = 'inquiries';

  sendInquiry(inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'status'>): Promise<any> {
    const ref = collection(this.firestore, this.collectionName);
    return addDoc(ref, {
      ...inquiry,
      status: 'new',
      createdAt: serverTimestamp()
    });
  }

  getInquiriesByProperty(propertyId: string): Observable<Inquiry[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('propertyId', '==', propertyId), orderBy('createdAt', 'desc'));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as Inquiry)))
    );
  }

  getInquiriesByAgent(agentId: string): Observable<Inquiry[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('createdAt', 'desc'));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as Inquiry)))
    );
  }

  updateInquiryStatus(id: string, status: 'new' | 'read' | 'replied'): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return updateDoc(ref, { status });
  }
}