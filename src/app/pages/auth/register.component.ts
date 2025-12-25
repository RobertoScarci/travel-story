import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { TravelStyle } from '../../core/models/user.model';

/**
 * RegisterComponent - New user onboarding
 * 
 * Multi-step registration with preference gathering.
 * Makes the user feel special from the start.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-visual">
        <div class="visual-content">
          <h2>Inizia il tuo viaggio</h2>
          <p>Crea il tuo profilo e scopri destinazioni su misura per te.</p>
          <div class="visual-steps">
            @for (step of steps; track step.id; let i = $index) {
              <div 
                class="step-item"
                [class.active]="currentStep() >= i + 1"
                [class.current]="currentStep() === i + 1">
                <span class="step-number">{{ i + 1 }}</span>
                <span class="step-label">{{ step.label }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="auth-form-container">
        <div class="auth-form">
          <button type="button" class="back-link" (click)="goHome()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Torna alla Home
          </button>

          <!-- Step 1: Basic Info -->
          @if (currentStep() === 1) {
            <div class="form-step animate-fade-in-up">
              <div class="form-header">
                <h1>Crea il tuo account</h1>
                <p>Pochi secondi per iniziare a esplorare</p>
              </div>

              <form (ngSubmit)="nextStep()">
                <div class="form-group">
                  <label for="name">Come ti chiami?</label>
                  <input 
                    type="text" 
                    id="name"
                    [(ngModel)]="name"
                    name="name"
                    placeholder="Il tuo nome"
                    required>
                </div>

                <div class="form-group">
                  <label for="email">La tua email</label>
                  <input 
                    type="email" 
                    id="email"
                    [(ngModel)]="email"
                    name="email"
                    placeholder="nome@esempio.com"
                    required>
                </div>

                <div class="form-group">
                  <label for="password">Crea una password</label>
                  <input 
                    type="password"
                    id="password"
                    [(ngModel)]="password"
                    name="password"
                    placeholder="Almeno 8 caratteri"
                    required
                    minlength="8">
                </div>

                @if (error()) {
                  <div class="error-message">{{ error() }}</div>
                }

                <button type="submit" class="btn btn-primary btn-lg full-width">
                  Continua
                </button>
              </form>

              <div class="divider"><span>oppure</span></div>

              <button class="btn btn-secondary social-btn full-width">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Registrati con Google
              </button>

              <p class="auth-switch">
                Hai già un account? <a routerLink="/login">Accedi</a>
              </p>
            </div>
          }

          <!-- Step 2: Travel Preferences -->
          @if (currentStep() === 2) {
            <div class="form-step animate-fade-in-up">
              <div class="form-header">
                <h1>Che tipo di viaggiatore sei?</h1>
                <p>Seleziona i tuoi stili di viaggio preferiti</p>
              </div>

              <div class="preference-grid">
                @for (style of travelStyles; track style.id) {
                  <button 
                    type="button"
                    class="preference-card"
                    [class.selected]="selectedStyles.includes(style.id)"
                    (click)="toggleStyle(style.id)">
                    <span class="preference-icon">{{ style.icon }}</span>
                    <span class="preference-label">{{ style.label }}</span>
                  </button>
                }
              </div>

              <div class="form-actions">
                <button 
                  type="button" 
                  class="btn btn-ghost"
                  (click)="prevStep()">
                  Indietro
                </button>
                <button 
                  type="button" 
                  class="btn btn-primary btn-lg"
                  (click)="nextStep()">
                  Continua
                </button>
              </div>

              <button 
                type="button" 
                class="skip-link"
                (click)="skipPreferences()">
                Salta per ora
              </button>
            </div>
          }

          <!-- Step 3: Budget -->
          @if (currentStep() === 3) {
            <div class="form-step animate-fade-in-up">
              <div class="form-header">
                <h1>Qual è il tuo budget tipico?</h1>
                <p>Questo ci aiuta a suggerirti destinazioni adatte</p>
              </div>

              <div class="budget-options">
                @for (option of budgetOptions; track option.value) {
                  <button 
                    type="button"
                    class="budget-option"
                    [class.selected]="selectedBudget === option.value"
                    (click)="selectBudget(option.value)">
                    <span class="budget-icon">{{ option.icon }}</span>
                    <span class="budget-label">{{ option.label }}</span>
                    <span class="budget-desc">{{ option.description }}</span>
                  </button>
                }
              </div>

              <div class="form-actions">
                <button 
                  type="button" 
                  class="btn btn-ghost"
                  (click)="prevStep()">
                  Indietro
                </button>
                <button 
                  type="button" 
                  class="btn btn-primary btn-lg"
                  [disabled]="loading()"
                  (click)="completeRegistration()">
                  {{ loading() ? 'Creazione...' : 'Inizia a esplorare' }}
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 100vh;

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
      }
    }

    .auth-visual {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-highlight) 100%);
      padding: var(--space-8);

      @media (max-width: 992px) {
        display: none;
      }
    }

    .visual-content {
      text-align: center;
      color: white;

      h2 {
        font-size: var(--text-4xl);
        color: white;
        margin-bottom: var(--space-4);
      }

      p {
        font-size: var(--text-lg);
        opacity: 0.9;
        margin-bottom: var(--space-10);
      }
    }

    .visual-steps {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      text-align: left;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: rgba(255, 255, 255, 0.1);
      border-radius: var(--border-radius-md);
      opacity: 0.5;
      transition: all var(--transition-base);

      &.active {
        opacity: 1;
        background: rgba(255, 255, 255, 0.2);
      }

      &.current {
        transform: scale(1.05);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      }
    }

    .step-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: white;
      color: var(--color-accent);
      border-radius: 50%;
      font-weight: 600;
    }

    .step-label {
      font-weight: 500;
    }

    // Form Side
    .auth-form-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-8);
      background: var(--color-off-white);
    }

    .auth-form {
      width: 100%;
      max-width: 480px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      color: var(--color-gray-500);
      background: none;
      border: none;
      padding: var(--space-2) var(--space-3);
      margin-left: calc(-1 * var(--space-3));
      margin-bottom: var(--space-6);
      border-radius: var(--border-radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-primary);
        background: var(--color-cream);
      }
    }

    .form-header {
      margin-bottom: var(--space-8);

      h1 {
        font-size: var(--text-3xl);
        margin-bottom: var(--space-2);
      }

      p {
        color: var(--color-gray-500);
      }
    }

    .form-group {
      margin-bottom: var(--space-5);

      label {
        display: block;
        font-size: var(--text-sm);
        font-weight: 500;
        color: var(--color-gray-500);
        margin-bottom: var(--space-2);
      }

      input {
        width: 100%;
        padding: var(--space-4);
        font-family: var(--font-body);
        font-size: var(--text-base);
        border: 1.5px solid var(--color-gray-200);
        border-radius: var(--border-radius-md);
        background: var(--color-white);
        transition: border-color var(--transition-fast);

        &:focus {
          outline: none;
          border-color: var(--color-accent);
        }
      }
    }

    .error-message {
      padding: var(--space-3);
      background: rgba(231, 76, 60, 0.1);
      color: #c0392b;
      border-radius: var(--border-radius-sm);
      font-size: var(--text-sm);
      margin-bottom: var(--space-4);
    }

    .full-width {
      width: 100%;
    }

    .divider {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin: var(--space-6) 0;
      color: var(--color-gray-400);
      font-size: var(--text-sm);

      &::before,
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--color-gray-200);
      }
    }

    .social-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }

    .auth-switch {
      text-align: center;
      color: var(--color-gray-500);
      font-size: var(--text-sm);

      a {
        color: var(--color-accent);
        font-weight: 500;
      }
    }

    // Preferences Grid
    .preference-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
      margin-bottom: var(--space-8);
    }

    .preference-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-5);
      background: var(--color-white);
      border: 2px solid var(--color-gray-200);
      border-radius: var(--border-radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-accent);
      }

      &.selected {
        border-color: var(--color-accent);
        background: rgba(233, 69, 96, 0.05);
      }

      .preference-icon {
        font-size: 2rem;
      }

      .preference-label {
        font-weight: 500;
        color: var(--color-gray-500);
      }
    }

    // Budget Options
    .budget-options {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin-bottom: var(--space-8);
    }

    .budget-option {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: var(--color-white);
      border: 2px solid var(--color-gray-200);
      border-radius: var(--border-radius-lg);
      text-align: left;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-accent);
      }

      &.selected {
        border-color: var(--color-accent);
        background: rgba(233, 69, 96, 0.05);
      }

      .budget-icon {
        font-size: 1.5rem;
      }

      .budget-label {
        font-weight: 500;
      }

      .budget-desc {
        font-size: var(--text-sm);
        color: var(--color-gray-400);
      }
    }

    // Form Actions
    .form-actions {
      display: flex;
      gap: var(--space-3);
      justify-content: space-between;
    }

    .skip-link {
      display: block;
      width: 100%;
      margin-top: var(--space-4);
      padding: var(--space-3);
      background: none;
      border: none;
      color: var(--color-gray-400);
      font-size: var(--text-sm);
      cursor: pointer;
      text-align: center;

      &:hover {
        color: var(--color-gray-500);
        text-decoration: underline;
      }
    }
  `]
})
export class RegisterComponent {
  // Form data
  name = '';
  email = '';
  password = '';
  selectedStyles: TravelStyle[] = [];
  selectedBudget: 1 | 2 | 3 | 4 | 5 = 3;

  // State
  currentStep = signal(1);
  loading = signal(false);
  error = signal('');

  steps = [
    { id: 1, label: 'Crea account' },
    { id: 2, label: 'Stile di viaggio' },
    { id: 3, label: 'Budget' }
  ];

  travelStyles: { id: TravelStyle; icon: string; label: string }[] = [
    { id: 'adventure', icon: '🏔️', label: 'Avventura' },
    { id: 'relaxation', icon: '🏖️', label: 'Relax' },
    { id: 'cultural', icon: '🏛️', label: 'Cultura' },
    { id: 'foodie', icon: '🍝', label: 'Gastronomia' },
    { id: 'nightlife', icon: '🌙', label: 'Vita notturna' },
    { id: 'nature', icon: '🌿', label: 'Natura' },
    { id: 'romantic', icon: '💕', label: 'Romantico' },
    { id: 'budget', icon: '💰', label: 'Low-cost' }
  ];

  budgetOptions = [
    { value: 1 as const, icon: '💵', label: 'Zaino in spalla', description: 'Meno di €50/giorno' },
    { value: 2 as const, icon: '💵💵', label: 'Budget smart', description: '€50-100/giorno' },
    { value: 3 as const, icon: '💵💵💵', label: 'Comfort', description: '€100-200/giorno' },
    { value: 4 as const, icon: '💵💵💵💵', label: 'Premium', description: '€200-400/giorno' },
    { value: 5 as const, icon: '💎', label: 'Lusso', description: '€400+/giorno' }
  ];

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  goHome(): void {
    this.router.navigate(['/']);
  }

  nextStep(): void {
    if (this.currentStep() === 1) {
      if (!this.name || !this.email || !this.password) {
        this.error.set('Compila tutti i campi');
        return;
      }
      if (this.password.length < 8) {
        this.error.set('La password deve avere almeno 8 caratteri');
        return;
      }
      this.error.set('');
    }
    
    if (this.currentStep() < 3) {
      this.currentStep.update(v => v + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(v => v - 1);
    }
  }

  toggleStyle(style: TravelStyle): void {
    if (this.selectedStyles.includes(style)) {
      this.selectedStyles = this.selectedStyles.filter(s => s !== style);
    } else if (this.selectedStyles.length < 4) {
      this.selectedStyles = [...this.selectedStyles, style];
    }
  }

  selectBudget(value: 1 | 2 | 3 | 4 | 5): void {
    this.selectedBudget = value;
  }

  skipPreferences(): void {
    this.completeRegistration();
  }

  async completeRegistration(): Promise<void> {
    this.loading.set(true);

    try {
      this.userService.register(this.email, this.name, {
        travelStyle: this.selectedStyles,
        budgetLevel: this.selectedBudget,
        interests: [],
        preferredClimates: [],
        avoidCrowds: false,
        accessibilityNeeds: []
      });

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      this.router.navigate(['/']);
    } catch {
      this.error.set('Si è verificato un errore. Riprova.');
    } finally {
      this.loading.set(false);
    }
  }
}

