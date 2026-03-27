import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

type AlertType = 'success' | 'error' | 'warning';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

  isLoading: boolean = false;

  alertMessage: string = '';
  alertType: AlertType = 'error';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';

      if (!this.token) {
        this.showAlert('Link non valido o incompleto.', 'error');
      }
    });
  }

  showAlert(message: string, type: AlertType = 'error'): void {
    this.alertMessage = message;
    this.alertType = type;
    this.cdr.detectChanges();
  }

  resetPasswordAction(): void {
    if (!this.token.trim()) {
      this.showAlert('Token di reset mancante.', 'error');
      return;
    }

    if (!this.newPassword.trim()) {
      this.showAlert('Inserisci la nuova password.', 'warning');
      return;
    }

    if (this.newPassword.trim().length < 6) {
      this.showAlert('La password deve contenere almeno 6 caratteri.', 'warning');
      return;
    }

    if (!this.confirmPassword.trim()) {
      this.showAlert('Conferma la nuova password.', 'warning');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.showAlert('Le password non coincidono.', 'warning');
      return;
    }

    this.isLoading = true;
    this.alertMessage = '';
    this.cdr.detectChanges();

    this.auth.resetPassword(
      this.token.trim(),
      this.newPassword.trim(),
      this.confirmPassword.trim()
    ).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.showAlert(
          res?.message || 'Password aggiornata con successo.',
          'success'
        );
        this.cdr.detectChanges();

        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { resetSuccess: '1' }
          });
        }, 1400);
      },
      error: (err) => {
        console.error('Errore reset password:', err);
        this.isLoading = false;
        this.showAlert(
          err?.error?.message || 'Impossibile aggiornare la password.',
          'error'
        );
        this.cdr.detectChanges();
      }
    });
  }
}