import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
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
                [class.current]="currentStep() === i + 1"
                [class.completed]="currentStep() > i + 1">
                <span class="step-number">
                  @if (currentStep() > i + 1) {
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  } @else {
                    {{ i + 1 }}
                  }
                </span>
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

          <!-- Step indicator mobile -->
          <div class="mobile-steps">
            <div class="step-progress">
              <div class="step-progress-bar" [style.width.%]="(currentStep() / 3) * 100"></div>
            </div>
            <span class="step-text">Passo {{ currentStep() }} di 3</span>
          </div>

          <!-- Step 1: Basic Info -->
          @if (currentStep() === 1) {
            <div class="form-step animate-fade-in-up">
              <div class="form-header">
                <h1>Crea il tuo account</h1>
                <p>Pochi secondi per iniziare a esplorare</p>
              </div>

              <form #registerForm="ngForm" (ngSubmit)="validateAndNext(registerForm)">
                <div class="form-group" [class.has-error]="nameField.invalid && nameField.touched">
                  <label for="name">Come ti chiami?</label>
                  <input 
                    type="text" 
                    id="name"
                    [(ngModel)]="name"
                    name="name"
                    #nameField="ngModel"
                    placeholder="Il tuo nome"
                    required
                    minlength="2"
                    maxlength="50"
                    [class.invalid]="nameField.invalid && nameField.touched"
                    [class.valid]="nameField.valid && nameField.touched">
                  @if (nameField.invalid && nameField.touched) {
                    <span class="field-error">
                      @if (nameField.errors?.['required']) {
                        Il nome è obbligatorio
                      } @else if (nameField.errors?.['minlength']) {
                        Il nome deve avere almeno 2 caratteri
                      }
                    </span>
                  }
                </div>

                <div class="form-group" [class.has-error]="emailField.invalid && emailField.touched">
                  <label for="email">La tua email</label>
                  <input 
                    type="email" 
                    id="email"
                    [(ngModel)]="email"
                    name="email"
                    #emailField="ngModel"
                    placeholder="nome@esempio.com"
                    required
                    email
                    [class.invalid]="emailField.invalid && emailField.touched"
                    [class.valid]="emailField.valid && emailField.touched">
                  @if (emailField.invalid && emailField.touched) {
                    <span class="field-error">
                      @if (emailField.errors?.['required']) {
                        L'email è obbligatoria
                      } @else if (emailField.errors?.['email']) {
                        Inserisci un'email valida
                      }
                    </span>
                  }
                </div>

                <div class="form-group" [class.has-error]="passwordField.invalid && passwordField.touched">
                  <label for="password">Crea una password</label>
                  <div class="password-input">
                    <input 
                      [type]="showPassword() ? 'text' : 'password'"
                      id="password"
                      [(ngModel)]="password"
                      name="password"
                      #passwordField="ngModel"
                      placeholder="Almeno 8 caratteri"
                      required
                      minlength="8"
                      [class.invalid]="passwordField.invalid && passwordField.touched"
                      [class.valid]="passwordField.valid && passwordField.touched">
                    <button 
                      type="button" 
                      class="toggle-password"
                      (click)="togglePassword()">
                      {{ showPassword() ? '🙈' : '👁️' }}
                    </button>
                  </div>
                  @if (passwordField.touched) {
                    <div class="password-strength">
                      <div class="strength-bars">
                        <span class="bar" [class.active]="password.length >= 1" [class.weak]="password.length >= 1 && password.length < 8"></span>
                        <span class="bar" [class.active]="password.length >= 8" [class.medium]="password.length >= 8 && password.length < 12"></span>
                        <span class="bar" [class.active]="password.length >= 12" [class.strong]="password.length >= 12"></span>
                      </div>
                      <span class="strength-text">
                        @if (password.length === 0) {
                          
                        } @else if (password.length < 8) {
                          Troppo corta
                        } @else if (password.length < 12) {
                          Buona
                        } @else {
                          Ottima!
                        }
                      </span>
                    </div>
                  }
                  @if (passwordField.invalid && passwordField.touched && passwordField.errors?.['required']) {
                    <span class="field-error">La password è obbligatoria</span>
                  }
                </div>

                <div class="form-group" [class.has-error]="confirmPasswordField.invalid && confirmPasswordField.touched">
                  <label for="confirmPassword">Conferma password</label>
                  <input 
                    type="password"
                    id="confirmPassword"
                    [(ngModel)]="confirmPassword"
                    name="confirmPassword"
                    #confirmPasswordField="ngModel"
                    placeholder="Ripeti la password"
                    required
                    [class.invalid]="(confirmPasswordField.touched && confirmPassword !== password) || (confirmPasswordField.invalid && confirmPasswordField.touched)"
                    [class.valid]="confirmPasswordField.valid && confirmPasswordField.touched && confirmPassword === password">
                  @if (confirmPasswordField.touched && confirmPassword !== password && confirmPassword.length > 0) {
                    <span class="field-error">Le password non corrispondono</span>
                  }
                  @if (confirmPasswordField.invalid && confirmPasswordField.touched && confirmPasswordField.errors?.['required']) {
                    <span class="field-error">Conferma la password</span>
                  }
                </div>

                @if (error()) {
                  <div class="error-message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 8v4M12 16h.01"/>
                    </svg>
                    {{ error() }}
                  </div>
                }

                <button 
                  type="submit" 
                  class="btn btn-primary btn-lg full-width"
                  [disabled]="registerForm.invalid || confirmPassword !== password">
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
                <p>Seleziona fino a 4 stili di viaggio preferiti</p>
              </div>

              <div class="selection-hint">
                <span class="hint-count">{{ selectedStyles.length }}/4</span> selezionati
              </div>

              <div class="preference-grid">
                @for (style of travelStyles; track style.id) {
                  <button 
                    type="button"
                    class="preference-card"
                    [class.selected]="selectedStyles.includes(style.id)"
                    [class.disabled]="selectedStyles.length >= 4 && !selectedStyles.includes(style.id)"
                    (click)="toggleStyle(style.id)">
                    <span class="preference-icon">{{ style.icon }}</span>
                    <span class="preference-label">{{ style.label }}</span>
                    @if (selectedStyles.includes(style.id)) {
                      <span class="check-badge">✓</span>
                    }
                  </button>
                }
              </div>

              <div class="form-actions">
                <button 
                  type="button" 
                  class="btn btn-ghost"
                  (click)="prevStep()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
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
                Salta per ora, deciderò dopo
              </button>
            </div>
          }

          <!-- Step 3: Budget -->
          @if (currentStep() === 3) {
            <div class="form-step animate-fade-in-up">
              <div class="form-header">
                <h1>Qual è il tuo budget tipico?</h1>
                <p>Questo ci aiuta a suggerirti destinazioni adatte a te</p>
              </div>

              <div class="budget-options">
                @for (option of budgetOptions; track option.value) {
                  <button 
                    type="button"
                    class="budget-option"
                    [class.selected]="selectedBudget === option.value"
                    (click)="selectBudget(option.value)">
                    <span class="budget-icon">{{ option.icon }}</span>
                    <div class="budget-info">
                    <span class="budget-label">{{ option.label }}</span>
                    <span class="budget-desc">{{ option.description }}</span>
                    </div>
                    @if (selectedBudget === option.value) {
                      <span class="check-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      </span>
                    }
                  </button>
                }
              </div>

              @if (error()) {
                <div class="error-message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                  </svg>
                  {{ error() }}
                </div>
              }

              <div class="form-actions">
                <button 
                  type="button" 
                  class="btn btn-ghost"
                  (click)="prevStep()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Indietro
                </button>
                <button 
                  type="button" 
                  class="btn btn-primary btn-lg"
                  [disabled]="loading()"
                  (click)="completeRegistration()">
                  @if (loading()) {
                    <span class="spinner"></span>
                    Creazione...
                  } @else {
                    Inizia a esplorare 🚀
                  }
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

      &.completed .step-number {
        background: #27ae60;
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
      transition: background var(--transition-fast);

      svg {
        stroke: white;
      }
    }

    .step-label {
      font-weight: 500;
    }

    // Mobile Steps
    .mobile-steps {
      display: none;
      margin-bottom: var(--space-6);

      @media (max-width: 992px) {
        display: block;
      }
    }

    .step-progress {
      height: 4px;
      background: var(--color-gray-200);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: var(--space-2);
    }

    .step-progress-bar {
      height: 100%;
      background: var(--color-accent);
      transition: width var(--transition-base);
    }

    .step-text {
      font-size: var(--text-sm);
      color: var(--color-gray-400);
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
      margin-bottom: var(--space-6);

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
        transition: color var(--transition-fast);
      }

      input:not([type="checkbox"]) {
        width: 100%;
        padding: var(--space-4);
        font-family: var(--font-body);
        font-size: var(--text-base);
        border: 1.5px solid var(--color-gray-200);
        border-radius: var(--border-radius-md);
        background: var(--color-white);
        transition: all var(--transition-fast);

        &:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
        }

        &::placeholder {
          color: var(--color-gray-300);
        }

        &.invalid {
          border-color: #e74c3c;
          background: rgba(231, 76, 60, 0.02);
        }

        &.valid {
          border-color: #27ae60;
        }
      }

      &.has-error label {
        color: #c0392b;
      }
    }

    .field-error {
      display: block;
      margin-top: var(--space-2);
      font-size: var(--text-xs);
      color: #c0392b;
      animation: shake 0.3s ease;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .password-input {
      position: relative;

      input {
        padding-right: var(--space-12);
      }

      .toggle-password {
        position: absolute;
        right: var(--space-3);
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2em;
        opacity: 0.7;
        transition: opacity var(--transition-fast);

        &:hover {
          opacity: 1;
        }
      }
    }

    .password-strength {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-top: var(--space-2);
    }

    .strength-bars {
      display: flex;
      gap: 4px;
    }

    .bar {
      width: 40px;
      height: 4px;
      background: var(--color-gray-200);
      border-radius: 2px;
      transition: all var(--transition-fast);

      &.active.weak { background: #e74c3c; }
      &.active.medium { background: #f39c12; }
      &.active.strong { background: #27ae60; }
    }

    .strength-text {
      font-size: var(--text-xs);
      color: var(--color-gray-400);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background: rgba(231, 76, 60, 0.1);
      color: #c0392b;
      border-radius: var(--border-radius-md);
      font-size: var(--text-sm);
      margin-bottom: var(--space-4);
      border-left: 3px solid #e74c3c;
    }

    .full-width {
      width: 100%;
    }

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

    @keyframes spin {
      to { transform: rotate(360deg); }
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

    // Selection hint
    .selection-hint {
      font-size: var(--text-sm);
      color: var(--color-gray-400);
      margin-bottom: var(--space-4);

      .hint-count {
        font-weight: 600;
        color: var(--color-accent);
      }
    }

    // Preferences Grid
    .preference-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }

    .preference-card {
      position: relative;
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

      &:hover:not(.disabled) {
        border-color: var(--color-accent);
        transform: translateY(-2px);
      }

      &.selected {
        border-color: var(--color-accent);
        background: rgba(233, 69, 96, 0.05);
      }

      &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .preference-icon {
        font-size: 2rem;
      }

      .preference-label {
        font-weight: 500;
        color: var(--color-gray-500);
      }

      .check-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-accent);
        color: white;
        border-radius: 50%;
        font-size: 12px;
        font-weight: bold;
      }
    }

    // Budget Options
    .budget-options {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }

    .budget-option {
      display: flex;
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
        min-width: 40px;
      }

      .budget-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .budget-label {
        font-weight: 500;
      }

      .budget-desc {
        font-size: var(--text-sm);
        color: var(--color-gray-400);
      }

      .check-icon {
        color: var(--color-accent);
      }
    }

    // Form Actions
    .form-actions {
      display: flex;
      gap: var(--space-3);
      justify-content: space-between;
      align-items: center;
    }

    .btn-ghost svg {
      margin-right: var(--space-1);
    }

    .skip-link {
      display: block;
      width: 100%;
      margin-top: var(--space-4);
      padding: var(--space-3);
      background: none;
      border: none;
      color: var(--color-gray-400);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      cursor: pointer;
      text-align: center;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-gray-500);
        text-decoration: underline;
      }
    }

    // Animation
    .animate-fade-in-up {
      animation: fadeInUp 0.4s ease;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    // Button disabled state
    button[type="submit"]:disabled,
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class RegisterComponent {
  @ViewChild('registerForm') registerForm!: NgForm;
  
  // Form data
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  selectedStyles: TravelStyle[] = [];
  selectedBudget: 1 | 2 | 3 | 4 | 5 = 3;

  // State
  currentStep = signal(1);
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

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
    { value: 1 as const, icon: '🎒', label: 'Zaino in spalla', description: 'Meno di €50/giorno' },
    { value: 2 as const, icon: '💵', label: 'Budget smart', description: '€50-100/giorno' },
    { value: 3 as const, icon: '🏨', label: 'Comfort', description: '€100-200/giorno' },
    { value: 4 as const, icon: '✨', label: 'Premium', description: '€200-400/giorno' },
    { value: 5 as const, icon: '💎', label: 'Lusso', description: '€400+/giorno' }
  ];

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  goHome(): void {
    this.router.navigate(['/']);
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  validateAndNext(form: NgForm): void {
    if (form.invalid || this.password !== this.confirmPassword) {
      // Mark all fields as touched to show errors
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
        return;
      }
      this.error.set('');
    this.nextStep();
    }
    
  nextStep(): void {
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
    this.error.set('');

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
