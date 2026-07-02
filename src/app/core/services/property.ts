import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  documentId,
  QueryDocumentSnapshot
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Property } from './models/property.model';

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private firestore = inject(Firestore);
  private readonly collectionName = 'properties';
  private readonly PAGE_SIZE = 9;

  private lastVisible: QueryDocumentSnapshot | null = null;
  private hasMorePages = true;

  get hasMore(): boolean {
    return this.hasMorePages;
  }

  resetPagination(): void {
    this.lastVisible = null;
    this.hasMorePages = true;
  }

  async getPropertiesPage(filters: {
    priceType?: string;
    propertyType?: string;
    city?: string;
  } = {}): Promise<{ properties: Property[]; hasMore: boolean }> {
    if (!this.hasMorePages) return { properties: [], hasMore: false };

    const ref = collection(this.firestore, this.collectionName);
    const conditions: any[] = [];

    if (filters.priceType)    conditions.push(where('priceType', '==', filters.priceType));
    if (filters.propertyType) conditions.push(where('propertyType', '==', filters.propertyType));
    if (filters.city)         conditions.push(where('city', '==', filters.city));

    conditions.push(orderBy('createdAt', 'desc'));
    if (this.lastVisible) conditions.push(startAfter(this.lastVisible));
    conditions.push(limit(this.PAGE_SIZE));

    const snapshot = await getDocs(query(ref, ...conditions));

    this.hasMorePages = snapshot.docs.length === this.PAGE_SIZE;
    this.lastVisible = snapshot.docs[snapshot.docs.length - 1] ?? null;

    const properties = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Property));
    return { properties, hasMore: this.hasMorePages };
  }

  async getAllPropertiesFiltered(filters: {
    priceType?: string;
    propertyType?: string;
    city?: string;
  } = {}): Promise<Property[]> {
    this.resetPagination();
    const all: Property[] = [];
    let hasMore = true;

    while (hasMore) {
      const page = await this.getPropertiesPage(filters);
      all.push(...page.properties);
      hasMore = page.hasMore;
    }

    return all;
  }

  getAllPropertiesForAdmin(): Promise<Property[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('createdAt', 'desc'));
    return getDocs(q).then(snap =>
      snap.docs.map(d => ({ id: d.id, ...d.data() } as Property))
    );
  }

  async getPropertiesByIds(ids: string[]): Promise<Property[]> {
    if (!ids.length) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) {
      chunks.push(ids.slice(i, i + 30));
    }

    const results: Property[] = [];
    for (const chunk of chunks) {
      const ref = collection(this.firestore, this.collectionName);
      const q = query(ref, where(documentId(), 'in', chunk));
      const snap = await getDocs(q);
      results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as Property)));
    }
    return results;
  }

  getFeaturedProperties(count?: number): Observable<Property[]> {
    const ref = collection(this.firestore, this.collectionName);
    const constraints: any[] = [
      where('isFeatured', '==', true),
      orderBy('createdAt', 'desc'),
    ];
    if (count) constraints.push(limit(count));
    const q = query(ref, ...constraints);
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as Property)))
    );
  }

  getLatestProperties(count = 3): Observable<Property[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('createdAt', 'desc'), limit(count));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as Property)))
    );
  }

  getPropertyById(id: string): Observable<Property | null> {
    const ref = doc(this.firestore, this.collectionName, id);
    return from(getDoc(ref)).pipe(
      map(snap =>
        snap.exists() ? ({ id: snap.id, ...snap.data() } as Property) : null
      )
    );
  }

  addProperty(property: any): Promise<any> {
    const ref = collection(this.firestore, this.collectionName);
    return addDoc(ref, property);
  }

  updateProperty(id: string, data: any): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return updateDoc(ref, { ...data });
  }

  deleteProperty(id: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return deleteDoc(ref);
  }

  incrementViews(id: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return updateDoc(ref, { views: increment(1) });
  }
}