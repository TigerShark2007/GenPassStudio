export interface PasswordEntry {
  id?: string;
  password: string;
  label: string;
  entropy: number;
  score: number;
  timestamp: any; // Firestore Timestamp or ISO string
  uid: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
}

export interface GlobalMetrics {
  totalGenerated: number;
  avgEntropy: number;
  strongPercentage: number;
}
