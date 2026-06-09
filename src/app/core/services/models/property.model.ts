export interface Property {
  id?: string;
  title: string;
  description: string;
  price: number;
  priceType: 'sale' | 'rent';
  propertyType: 'apartment' | 'house' | 'villa' | 'land' | 'commercial';
  status: 'available' | 'sold' | 'rented';
  city: string;
  district: string;
  address: string;
  coordinates: { lat: number; lng: number };
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor: number;
  totalFloors: number;
  yearBuilt: number;
  parkingSpots: number;
  features: string[];
  images: string[];
  thumbnailUrl: string;
  agentId: string;
  isFeatured: boolean;
  views: number;
  createdAt: any;
  updatedAt: any;
}