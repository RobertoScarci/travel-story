import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { UserService } from '../../core/services/user.service';

/**
 * LoginComponent - User authentication
 * 
 * Simple, inviting, non-intimidating.
 * "L'utente deve essere padrone del sito"
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-visual">
        <div class="visual-content">
          <h2>Bentornato, viaggiatore</h2>
          <p>Il tuo prossimo viaggio ti aspetta.</p>
          <div class="visual-decoration">
            <span class="float-icon i1">🗼</span>
            <span class="float-icon i2">🏔️</span>
            <span class="float-icon i3">🌴</span>
            <span class="float-icon i4">🏖️</span>
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

          <div class="form-header">
            <h1>Accedi</h1>
            <p>Accedi per ritrovare i tuoi viaggi e le tue preferenze</p>
          </div>

          <form #loginForm="ngForm" (ngSubmit)="onSubmit(loginForm)">
            <div class="form-group" [class.has-error]="emailField.invalid && emailField.touched">
              <label for="email">Email</label>
              <input 
                type="email" 
                id="email"
                [(ngModel)]="email"
                name="email"
                #emailField="ngModel"
                placeholder="la-tua-email@esempio.com"
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
              <label for="password">Password</label>
              <div class="password-input">
                <input 
                  [type]="showPassword() ? 'text' : 'password'"
                  id="password"
                  [(ngModel)]="password"
                  name="password"
                  #passwordField="ngModel"
                  placeholder="La tua password"
                  required
                  minlength="6"
                  [class.invalid]="passwordField.invalid && passwordField.touched"
                  [class.valid]="passwordField.valid && passwordField.touched">
                <button 
                  type="button" 
                  class="toggle-password"
                  (click)="togglePassword()">
                  {{ showPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
              @if (passwordField.invalid && passwordField.touched) {
                <span class="field-error">
                  @if (passwordField.errors?.['required']) {
                    La password è obbligatoria
                  } @else if (passwordField.errors?.['minlength']) {
                    La password deve avere almeno 6 caratteri
                  }
                </span>
              }
            </div>

            <div class="form-options">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="rememberMe" name="remember">
                <span>Ricordami</span>
              </label>
              <a href="#" class="forgot-link">Password dimenticata?</a>
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
              [disabled]="loading() || loginForm.invalid">
              @if (loading()) {
                <span class="spinner"></span>
                Accesso in corso...
              } @else {
                Accedi
              }
            </button>
          </form>

          <div class="divider">
            <span>oppure</span>
          </div>

          <div class="social-login">
            <button class="btn btn-secondary social-btn">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continua con Google
            </button>
          </div>

          <p class="auth-switch">
            Non hai un account? 
            <a routerLink="/register">Registrati gratuitamente</a>
          </p>
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

    // Visual Side
    .auth-visual {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
      padding: var(--space-8);
      position: relative;
      overflow: hidden;

      @media (max-width: 992px) {
        display: none;
      }
    }

    .visual-content {
      text-align: center;
      color: white;
      z-index: 1;

      h2 {
        font-size: var(--text-4xl);
        color: white;
        margin-bottom: var(--space-4);
      }

      p {
        font-size: var(--text-lg);
        opacity: 0.9;
      }
    }

    .visual-decoration {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .float-icon {
      position: absolute;
      font-size: 2.5rem;
      animation: float 6s ease-in-out infinite;
      opacity: 0.6;

      &.i1 { top: 15%; left: 20%; animation-delay: 0s; }
      &.i2 { top: 25%; right: 15%; animation-delay: 1s; }
      &.i3 { bottom: 25%; left: 15%; animation-delay: 2s; }
      &.i4 { bottom: 15%; right: 20%; animation-delay: 3s; }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(5deg); }
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
      max-width: 420px;
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

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-6);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-gray-500);
      cursor: pointer;

      input {
        accent-color: var(--color-accent);
        width: 16px;
        height: 16px;
      }
    }

    .forgot-link {
      font-size: var(--text-sm);
      color: var(--color-accent);

      &:hover {
        text-decoration: underline;
      }
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

    .social-login {
      margin-bottom: var(--space-6);
    }

    .social-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
    }

    .auth-switch {
      text-align: center;
      color: var(--color-gray-500);
      font-size: var(--text-sm);

      a {
        color: var(--color-accent);
        font-weight: 500;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    // Button disabled state
    button[type="submit"]:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class LoginComponent {
  @ViewChild('loginForm') loginForm!: NgForm;
  
  email = '';
  password = '';
  rememberMe = false;
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

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

  async onSubmit(form: NgForm): Promise<void> {
    if (form.invalid) {
      // Mark all fields as touched to show errors
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const success = await this.userService.login(this.email, this.password);
      if (success) {
        this.router.navigate(['/']);
      } else {
        this.error.set('Email o password non corretti. Riprova.');
      }
    } catch {
      this.error.set('Si è verificato un errore. Riprova più tardi.');
    } finally {
      this.loading.set(false);
    }
  }
}
