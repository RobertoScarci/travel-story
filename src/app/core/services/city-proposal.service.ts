import { Injectable, signal } from '@angular/core';
import { CityProposal, CityProposalFormData } from '../models/city-proposal.model';
import { UserService } from './user.service';

/**
 * City Proposal Service
 * 
 * Handles user submissions for new city proposals.
 * In a production environment, this would communicate with a backend API.
 * For now, it stores proposals in localStorage.
 */
@Injectable({
  providedIn: 'root'
})
export class CityProposalService {
  private readonly STORAGE_KEY = 'travelstory_city_proposals';
  
  // Signal for proposals (for admin panel in the future)
  proposals = signal<CityProposal[]>([]);

  constructor(private userService: UserService) {
    this.loadProposals();
  }

  /**
   * Submit a new city proposal
   */
  submitProposal(formData: CityProposalFormData): CityProposal {
    const proposal: CityProposal = {
      id: this.generateId(),
      cityName: formData.cityName.trim(),
      country: formData.country.trim(),
      continent: formData.continent.trim(),
      tagline: formData.tagline.trim(),
      whyPropose: formData.whyPropose.trim(),
      additionalInfo: formData.additionalInfo?.trim() || '',
      userEmail: this.userService.user()?.email,
      userName: this.userService.userName(),
      submittedAt: new Date(),
      status: 'pending'
    };

    const proposals = this.getProposals();
    proposals.push(proposal);
    this.saveProposals(proposals);
    this.proposals.set(proposals);

    return proposal;
  }

  /**
   * Get all proposals (for admin panel)
   */
  getAllProposals(): CityProposal[] {
    return this.getProposals();
  }

  /**
   * Get proposals by status
   */
  getProposalsByStatus(status: CityProposal['status']): CityProposal[] {
    return this.getProposals().filter(p => p.status === status);
  }

  /**
   * Get proposals from localStorage
   */
  private getProposals(): CityProposal[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const proposals = JSON.parse(stored);
      // Convert date strings back to Date objects
      return proposals.map((p: any) => ({
        ...p,
        submittedAt: new Date(p.submittedAt),
        reviewedAt: p.reviewedAt ? new Date(p.reviewedAt) : undefined
      }));
    } catch (error) {
      console.error('Error loading proposals:', error);
      return [];
    }
  }

  /**
   * Save proposals to localStorage
   */
  private saveProposals(proposals: CityProposal[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(proposals));
    } catch (error) {
      console.error('Error saving proposals:', error);
    }
  }

  /**
   * Load proposals into signal
   */
  private loadProposals(): void {
    this.proposals.set(this.getProposals());
  }

  /**
   * Generate a unique ID for proposals
   */
  private generateId(): string {
    return `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate form data
   */
  validateFormData(formData: CityProposalFormData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.cityName || formData.cityName.trim().length < 2) {
      errors.push('Il nome della città deve contenere almeno 2 caratteri');
    }

    if (!formData.country || formData.country.trim().length < 2) {
      errors.push('Il paese deve essere specificato');
    }

    if (!formData.continent || formData.continent.trim().length < 2) {
      errors.push('Il continente deve essere specificato');
    }

    if (!formData.tagline || formData.tagline.trim().length < 10) {
      errors.push('Il tagline deve contenere almeno 10 caratteri');
    }

    if (!formData.whyPropose || formData.whyPropose.trim().length < 20) {
      errors.push('Spiega perché vuoi proporre questa città (almeno 20 caratteri)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

