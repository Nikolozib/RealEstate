import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  increment
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Property } from './models/property.model';

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private readonly collectionName = 'properties';

  constructor(private firestore: Firestore) {}

  getAllProperties(): Observable<Property[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Property[]>;
  }

  getFeaturedProperties(): Observable<Property[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(
      ref,
      where('isFeatured', '==', true),
      orderBy('createdAt', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Property[]>;
  }

  getPropertyById(id: string): Observable<Property> {
    const ref = doc(this.firestore, this.collectionName, id);
    return docData(ref, { idField: 'id' }) as Observable<Property>;
  }

  getPropertiesByFilter(filters: {
    priceType?: string;
    propertyType?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
  }): Observable<Property[]> {
    const ref = collection(this.firestore, this.collectionName);
    const conditions: any[] = [];

    if (filters.priceType) {
      conditions.push(where('priceType', '==', filters.priceType));
    }
    if (filters.propertyType) {
      conditions.push(where('propertyType', '==', filters.propertyType));
    }
    if (filters.city) {
      conditions.push(where('city', '==', filters.city));
    }
    if (filters.bedrooms) {
      conditions.push(where('bedrooms', '==', filters.bedrooms));
    }

    const q = query(ref, ...conditions, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Property[]>;
  }

  addProperty(property: Omit<Property, 'id'>): Promise<any> {
    const ref = collection(this.firestore, this.collectionName);
    return addDoc(ref, property);
  }

  updateProperty(id: string, data: Partial<Property>): Promise<void> {
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