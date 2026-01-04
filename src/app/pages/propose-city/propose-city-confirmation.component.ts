import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

/**
 * ProposeCityConfirmationComponent
 * 
 * Confirmation page shown after a user submits a city proposal.
 * Informs the user that their proposal will be reviewed by the TravelStory team.
 */
@Component({
  selector: 'app-propose-city-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="confirmation-page">
      <div class="confirmation-container">
        <div class="confirmation-content">
          <div class="success-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>

          <h1>Proposta Inviata!</h1>
          
          <p class="confirmation-message">
            Grazie per aver condiviso la tua proposta con noi. 
            Il team di TravelStory esaminerà attentamente la città che hai suggerito.
          </p>

          <div class="info-box">
            <h3>Cosa succede ora?</h3>
            <ul>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>La tua proposta è stata ricevuta e registrata</span>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Il nostro team la valuterà nei prossimi giorni</span>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>Ti contatteremo via email se la città verrà aggiunta</span>
              </li>
            </ul>
          </div>

          <div class="actions">
            <a routerLink="/" class="btn btn-primary btn-lg">
              Torna alla Home
            </a>
            <button 
              type="button" 
              class="btn btn-secondary"
              (click)="proposeAnother()">
              Proponi un'altra città
            </button>
          </div>

          <p class="thank-you">
            Grazie per contribuire a rendere TravelStory ancora più ricco di destinazioni!
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirmation-page {
      min-height: 100vh;
      background: linear-gradient(180deg, var(--color-off-white) 0%, var(--color-cream) 100%);
      padding: var(--space-8) var(--space-6);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .confirmation-container {
      max-width: 700px;
      width: 100%;
    }

    .confirmation-content {
      background: var(--color-white);
      border-radius: var(--border-radius-xl);
      padding: var(--space-12);
      box-shadow: var(--shadow-lg);
      text-align: center;
      animation: fadeInUp 0.6s ease-out;

      @media (max-width: 768px) {
        padding: var(--space-8);
      }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .success-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 120px;
      margin: 0 auto var(--space-6);
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 50%;
      color: white;
      box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
      animation: scaleIn 0.5s ease-out 0.2s both;
    }

    @keyframes scaleIn {
      from {
        transform: scale(0);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    h1 {
      font-size: clamp(2rem, 5vw, 2.5rem);
      font-weight: 900;
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 50%, var(--color-highlight) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: var(--space-4);
    }

    .confirmation-message {
      font-size: var(--text-lg);
      color: var(--color-gray-600);
      line-height: 1.7;
      margin-bottom: var(--space-8);
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .info-box {
      background: linear-gradient(135deg, rgba(233, 69, 96, 0.05) 0%, rgba(248, 181, 0, 0.03) 100%);
      border-left: 4px solid var(--color-accent);
      border-radius: var(--border-radius-lg);
      padding: var(--space-6);
      margin-bottom: var(--space-8);
      text-align: left;

      h3 {
        font-size: var(--text-lg);
        font-weight: 600;
        color: var(--color-primary);
        margin-bottom: var(--space-4);
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-4);

        li {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          color: var(--color-gray-600);
          font-size: var(--text-base);
          line-height: 1.6;

          svg {
            flex-shrink: 0;
            margin-top: 2px;
            stroke: var(--color-accent);
          }
        }
      }
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin-bottom: var(--space-6);

      @media (min-width: 480px) {
        flex-direction: row;
        justify-content: center;
      }

      .btn {
        min-width: 200px;
      }
    }

    .thank-you {
      font-size: var(--text-sm);
      color: var(--color-gray-500);
      font-style: italic;
      margin: 0;
    }
  `]
})
export class ProposeCityConfirmationComponent implements OnInit {
  proposalId?: string;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.proposalId = params['id'];
    });
  }

  proposeAnother(): void {
    this.router.navigate(['/propose-city']);
  }
}

