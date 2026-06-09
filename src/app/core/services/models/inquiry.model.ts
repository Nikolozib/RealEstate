export interface Inquiry {
  id?: string;
  propertyId: string;
  propertyTitle: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  message: string;
  userId: string | null;
  agentId: string;
  status: 'new' | 'read' | 'replied';
  createdAt: any;
}