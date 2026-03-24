import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

type AlertType = 'success' | 'error' | 'warning';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;

  isLoading: boolean = false;

  alertMessage: string = '';
  alertType: AlertType = 'error';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const savedEmail = localStorage.getItem('rememberedEmail');

    if (savedEmail) {
      this.email = savedEmail;
      this.rememberMe = true;
    }

    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const googleError = params['googleError'];

      if (token) {
        this.auth.saveToken(token);
        this.isLoading = false;
        this.showAlert('Accesso con Google effettuato con successo!', 'success');

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });

        setTimeout(() => {
          this.router.navigate(['/products']);
        }, 800);
      }

      if (googleError) {
        this.isLoading = false;
        this.showAlert('Errore durante l’accesso con Google.', 'error');

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
  }

  goBack(): void {
    window.history.back();
  }

  showAlert(message: string, type: AlertType = 'error'): void {
    this.alertMessage = message;
    this.alertType = type;

    setTimeout(() => {
      this.alertMessage = '';
    }, 4000);
  }

  login(): void {
    if (!this.email.trim() || !this.password.trim()) {
      this.showAlert('Inserisci email e password.', 'warning');
      return;
    }

    this.isLoading = true;
    this.alertMessage = '';

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        if (res?.token) {
          this.auth.saveToken(res.token);
        }

        if (this.rememberMe) {
          localStorage.setItem('rememberedEmail', this.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        this.showAlert('Accesso effettuato con successo!', 'success');

        setTimeout(() => {
          this.router.navigate(['/products']);
        }, 800);
      },
      error: (err) => {
        console.error('Errore login:', err);

        if (err.status === 404) {
          this.showAlert('Utente non trovato.', 'error');
        } else if (err.status === 401) {
          this.showAlert('Email o password non validi.', 'error');
        } else if (err.status === 400) {
          this.showAlert(err.error?.message || 'Dati non validi.', 'error');
        } else if (err.status === 0) {
          this.showAlert('Impossibile contattare il server.', 'error');
        } else {
          this.showAlert('Errore durante il login.', 'error');
        }

        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  loginWithGoogle(): void {
    this.alertMessage = '';
    this.isLoading = true;
    this.auth.loginWithGoogle();
  }
}