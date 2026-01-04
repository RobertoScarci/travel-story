import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CityProposalService } from '../../core/services/city-proposal.service';
import { CityProposalFormData } from '../../core/models/city-proposal.model';

/**
 * ProposeCityFormComponent
 * 
 * Form for users to propose new cities to be added to TravelStory.
 * Simple but complete form to gather all necessary information.
 */
@Component({
  selector: 'app-propose-city-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="propose-page">
      <div class="propose-container">
        <div class="propose-header">
          <button type="button" class="back-link" (click)="goHome()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Torna alla Home
          </button>
          
          <div class="header-content">
            <div class="header-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <h1>Proponi una Città</h1>
            <p class="subtitle">Condividi con noi una destinazione che merita di essere scoperta</p>
          </div>
        </div>

        <form #proposalForm="ngForm" (ngSubmit)="onSubmit(proposalForm)" class="proposal-form">
          <!-- City Name -->
          <div class="form-group" [class.has-error]="cityNameField.invalid && cityNameField.touched">
            <label for="cityName">
              Nome della Città <span class="required">*</span>
            </label>
            <input 
              type="text" 
              id="cityName"
              [(ngModel)]="formData.cityName"
              name="cityName"
              #cityNameField="ngModel"
              placeholder="Es. Firenze, Kyoto, Marrakech..."
              required
              minlength="2"
              maxlength="100"
              [class.invalid]="cityNameField.invalid && cityNameField.touched"
              [class.valid]="cityNameField.valid && cityNameField.touched">
            @if (cityNameField.invalid && cityNameField.touched) {
              <span class="field-error">
                @if (cityNameField.errors?.['required']) {
                  Il nome della città è obbligatorio
                } @else if (cityNameField.errors?.['minlength']) {
                  Il nome deve contenere almeno 2 caratteri
                }
              </span>
            }
          </div>

          <!-- Country -->
          <div class="form-group" [class.has-error]="countryField.invalid && countryField.touched">
            <label for="country">
              Paese <span class="required">*</span>
            </label>
            <input 
              type="text" 
              id="country"
              [(ngModel)]="formData.country"
              name="country"
              #countryField="ngModel"
              placeholder="Es. Italia, Giappone, Marocco..."
              required
              minlength="2"
              maxlength="100"
              [class.invalid]="countryField.invalid && countryField.touched"
              [class.valid]="countryField.valid && countryField.touched">
            @if (countryField.invalid && countryField.touched) {
              <span class="field-error">
                @if (countryField.errors?.['required']) {
                  Il paese è obbligatorio
                } @else if (countryField.errors?.['minlength']) {
                  Il paese deve contenere almeno 2 caratteri
                }
              </span>
            }
          </div>

          <!-- Continent -->
          <div class="form-group" [class.has-error]="continentField.invalid && continentField.touched">
            <label for="continent">
              Continente <span class="required">*</span>
            </label>
            <select 
              id="continent"
              [(ngModel)]="formData.continent"
              name="continent"
              #continentField="ngModel"
              required
              [class.invalid]="continentField.invalid && continentField.touched"
              [class.valid]="continentField.valid && continentField.touched">
              <option value="">Seleziona un continente</option>
              <option value="Europa">Europa</option>
              <option value="Asia">Asia</option>
              <option value="Africa">Africa</option>
              <option value="Nord America">Nord America</option>
              <option value="Sud America">Sud America</option>
              <option value="Oceania">Oceania</option>
              <option value="Antartide">Antartide</option>
            </select>
            @if (continentField.invalid && continentField.touched) {
              <span class="field-error">Il continente è obbligatorio</span>
            }
          </div>

          <!-- Tagline -->
          <div class="form-group" [class.has-error]="taglineField.invalid && taglineField.touched">
            <label for="tagline">
              Tagline / Descrizione Breve <span class="required">*</span>
            </label>
            <textarea 
              id="tagline"
              [(ngModel)]="formData.tagline"
              name="tagline"
              #taglineField="ngModel"
              placeholder="Una frase breve che cattura l'essenza della città (es. 'Città eterna tra storia e modernità')"
              required
              minlength="10"
              maxlength="200"
              rows="3"
              [class.invalid]="taglineField.invalid && taglineField.touched"
              [class.valid]="taglineField.valid && taglineField.touched"></textarea>
            <span class="char-count">{{ formData.tagline.length }}/200</span>
            @if (taglineField.invalid && taglineField.touched) {
              <span class="field-error">
                @if (taglineField.errors?.['required']) {
                  Il tagline è obbligatorio
                } @else if (taglineField.errors?.['minlength']) {
                  Il tagline deve contenere almeno 10 caratteri
                }
              </span>
            }
          </div>

          <!-- Why Propose -->
          <div class="form-group" [class.has-error]="whyProposeField.invalid && whyProposeField.touched">
            <label for="whyPropose">
              Perché vuoi proporre questa città? <span class="required">*</span>
            </label>
            <textarea 
              id="whyPropose"
              [(ngModel)]="formData.whyPropose"
              name="whyPropose"
              #whyProposeField="ngModel"
              placeholder="Raccontaci cosa rende questa città speciale, cosa ti ha colpito, perché merita di essere scoperta..."
              required
              minlength="20"
              maxlength="1000"
              rows="5"
              [class.invalid]="whyProposeField.invalid && whyProposeField.touched"
              [class.valid]="whyProposeField.valid && whyProposeField.touched"></textarea>
            <span class="char-count">{{ formData.whyPropose.length }}/1000</span>
            @if (whyProposeField.invalid && whyProposeField.touched) {
              <span class="field-error">
                @if (whyProposeField.errors?.['required']) {
                  Questo campo è obbligatorio
                } @else if (whyProposeField.errors?.['minlength']) {
                  Spiega meglio perché vuoi proporre questa città (almeno 20 caratteri)
                }
              </span>
            }
            <p class="field-hint">Più dettagli fornisci, più facile sarà per noi valutare la proposta</p>
          </div>

          <!-- Additional Info -->
          <div class="form-group">
            <label for="additionalInfo">
              Informazioni Aggiuntive <span class="optional">(opzionale)</span>
            </label>
            <textarea 
              id="additionalInfo"
              [(ngModel)]="formData.additionalInfo"
              name="additionalInfo"
              placeholder="Eventuali informazioni extra: attrazioni principali, periodo migliore per visitarla, curiosità..."
              maxlength="500"
              rows="4"></textarea>
            <span class="char-count">{{ (formData.additionalInfo || '').length }}/500</span>
          </div>

          <!-- Error Messages -->
          @if (validationErrors().length > 0) {
            <div class="form-errors">
              <h4>Correggi i seguenti errori:</h4>
              <ul>
                @for (error of validationErrors(); track error) {
                  <li>{{ error }}</li>
                }
              </ul>
            </div>
          }

          <!-- Submit Button -->
          <div class="form-actions">
            <button 
              type="submit" 
              class="btn btn-primary btn-lg"
              [disabled]="submitting()">
              @if (submitting()) {
                <span class="spinner"></span>
                Invio in corso...
              } @else {
                Invia Proposta
              }
            </button>
            <p class="form-note">
              La tua proposta verrà esaminata dal team di TravelStory. 
              Ti contatteremo via email se la città verrà aggiunta al sito.
            </p>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .propose-page {
      min-height: 100vh;
      background: linear-gradient(180deg, var(--color-off-white) 0%, var(--color-cream) 100%);
      padding: calc(var(--header-height) + var(--space-8)) var(--space-6) var(--space-8);
    }

    .propose-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      background: var(--color-white);
      border: 1px solid var(--color-gray-200);
      border-radius: var(--border-radius-md);
      color: var(--color-gray-600);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
      margin-bottom: var(--space-6);

      &:hover {
        background: var(--color-cream);
        border-color: var(--color-accent);
        color: var(--color-accent);
        transform: translateX(-4px);
      }

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .propose-header {
      text-align: center;
      margin-bottom: var(--space-12);
    }

    .header-content {
      .header-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 80px;
        height: 80px;
        margin: 0 auto var(--space-4);
        background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-highlight) 100%);
        border-radius: 50%;
        color: white;
        box-shadow: 0 8px 24px rgba(233, 69, 96, 0.3);
      }

      h1 {
        font-size: clamp(2rem, 5vw, 3rem);
        font-weight: 900;
        background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 50%, var(--color-highlight) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: var(--space-3);
      }

      .subtitle {
        font-size: var(--text-lg);
        color: var(--color-gray-500);
        max-width: 600px;
        margin: 0 auto;
      }
    }

    .proposal-form {
      background: var(--color-white);
      border-radius: var(--border-radius-xl);
      padding: var(--space-8);
      box-shadow: var(--shadow-lg);

      @media (max-width: 768px) {
        padding: var(--space-6);
      }
    }

    .form-group {
      margin-bottom: var(--space-6);

      label {
        display: block;
        font-weight: 600;
        color: var(--color-primary);
        margin-bottom: var(--space-2);
        font-size: var(--text-sm);

        .required {
          color: var(--color-accent);
        }

        .optional {
          color: var(--color-gray-400);
          font-weight: 400;
        }
      }

      input,
      select,
      textarea {
        width: 100%;
        padding: var(--space-4);
        border: 2px solid var(--color-gray-200);
        border-radius: var(--border-radius-md);
        font-family: var(--font-body);
        font-size: var(--text-base);
        color: var(--color-primary);
        transition: all var(--transition-fast);
        background: var(--color-white);

        &:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
        }

        &.valid {
          border-color: #22c55e;
        }

        &.invalid {
          border-color: var(--color-error);
        }

        &::placeholder {
          color: var(--color-gray-300);
        }
      }

      textarea {
        resize: vertical;
        min-height: 100px;
      }

      select {
        cursor: pointer;
        background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23333' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right var(--space-4) center;
        padding-right: var(--space-12);
        appearance: none;
      }

      .char-count {
        display: block;
        text-align: right;
        font-size: var(--text-xs);
        color: var(--color-gray-400);
        margin-top: var(--space-1);
      }

      .field-error {
        display: block;
        color: var(--color-error);
        font-size: var(--text-sm);
        margin-top: var(--space-1);
      }

      .field-hint {
        display: block;
        color: var(--color-gray-400);
        font-size: var(--text-xs);
        margin-top: var(--space-1);
        font-style: italic;
      }

      &.has-error {
        input,
        select,
        textarea {
          border-color: var(--color-error);
        }
      }
    }

    .form-errors {
      background: rgba(239, 68, 68, 0.1);
      border: 2px solid var(--color-error);
      border-radius: var(--border-radius-md);
      padding: var(--space-4);
      margin-bottom: var(--space-6);

      h4 {
        color: var(--color-error);
        font-size: var(--text-sm);
        font-weight: 600;
        margin-bottom: var(--space-2);
      }

      ul {
        list-style: none;
        margin: 0;
        padding-left: var(--space-4);

        li {
          color: var(--color-error);
          font-size: var(--text-sm);
          margin-bottom: var(--space-1);

          &::before {
            content: '•';
            margin-right: var(--space-2);
          }
        }
      }
    }

    .form-actions {
      margin-top: var(--space-8);
      text-align: center;

      .btn {
        min-width: 200px;
        position: relative;

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: var(--space-2);
        }
      }

      .form-note {
        margin-top: var(--space-4);
        font-size: var(--text-sm);
        color: var(--color-gray-500);
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ProposeCityFormComponent {
  formData: CityProposalFormData = {
    cityName: '',
    country: '',
    continent: '',
    tagline: '',
    whyPropose: '',
    additionalInfo: ''
  };

  submitting = signal(false);
  validationErrors = signal<string[]>([]);

  constructor(
    private proposalService: CityProposalService,
    private router: Router
  ) {}

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      // Mark all fields as touched to show errors
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      return;
    }

    // Validate using service
    const validation = this.proposalService.validateFormData(this.formData);
    if (!validation.valid) {
      this.validationErrors.set(validation.errors);
      return;
    }

    this.validationErrors.set([]);
    this.submitting.set(true);

    // Submit proposal
    try {
      const proposal = this.proposalService.submitProposal(this.formData);
      
      // Navigate to confirmation page
      setTimeout(() => {
        this.router.navigate(['/propose-city/confirmation'], {
          queryParams: { id: proposal.id }
        });
      }, 500);
    } catch (error) {
      console.error('Error submitting proposal:', error);
      this.validationErrors.set(['Si è verificato un errore. Riprova più tardi.']);
      this.submitting.set(false);
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}

