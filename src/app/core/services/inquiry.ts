import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Inquiry } from './models/inquiry.model';

@Injectable({ providedIn: 'root' })
export class InquiryService {
  private readonly collectionName = 'inquiries';

  constructor(private firestore: Firestore) {}

  sendInquiry(inquiry: Omit<Inquiry, 'id' | 'createdAt'>): Promise<any> {
    const ref = collection(this.firestore, this.collectionName);
    return addDoc(ref, {
      ...inquiry,
      status: 'new',
      createdAt: serverTimestamp()
    });
  }

  getInquiriesByProperty(propertyId: string): Observable<Inquiry[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(
      ref,
      where('propertyId', '==', propertyId),
      orderBy('createdAt', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Inquiry[]>;
  }

  getInquiriesByAgent(agentId: string): Observable<Inquiry[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(
      ref,
      where('agentId', '==', agentId),
      orderBy('createdAt', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Inquiry[]>;
  }

  updateInquiryStatus(id: string, status: 'new' | 'read' | 'replied'): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return updateDoc(ref, { status });
  }
}
