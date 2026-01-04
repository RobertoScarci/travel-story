/**
 * City Proposal Model
 * 
 * Model for user-submitted city proposals that need admin approval
 */

export interface CityProposal {
  id?: string;
  cityName: string;
  country: string;
  continent: string;
  tagline: string;
  whyPropose: string; // Why the user wants to propose this city
  additionalInfo?: string; // Optional additional information
  userEmail?: string; // User email if authenticated
  userName?: string; // User name if authenticated
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string; // Admin who reviewed it
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface CityProposalFormData {
  cityName: string;
  country: string;
  continent: string;
  tagline: string;
  whyPropose: string;
  additionalInfo?: string;
}

