import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { IntlTelInputComponent } from 'intl-tel-input/angularWithUtils';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IntlTelInputComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  userData = {
    nome: '',
    cognome: '',
    email: '',
    password: '',
    telefono: '',
    data_nascita: '',
    ruolo: 'cliente'
  };

  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  isSuccess = false;
  isPhoneValid = false;
  alertMessage: string | null = null;
  alertType: 'success' | 'error' | 'warning' = 'error';

  initTelOptions = {
    initialCountry: 'auto' as const,
    geoIpLookup: (
      success: (iso2: any) => void,
      failure: () => void
    ) => {
      fetch('https://ipapi.co/json/')
        .then((res) => res.json())
        .then((data) => {
          const code = String(data?.country_code || 'it').toLowerCase();
          success(code as any);
        })
        .catch(() => {
          success('it' as any);
          failure();
        });
    },
    preferredCountries: ['it', 'gb', 'fr', 'de', 'es', 'us'],
    separateDialCode: true,
    nationalMode: false,
    strictMode: true,
    formatOnDisplay: true,
    autoPlaceholder: 'polite' as const
  };

  constructor(public auth: AuthService, private router: Router,
    private http: HttpClient, private cdr: ChangeDetectorRef) { }


  isPasswordMatch(): boolean {
    return this.userData.password === this.confirmPassword && this.confirmPassword.length > 0;
  }

  getPasswordErrors(): string[] {
    const errors: string[] = [];

    if (!this.userData.password || this.userData.password.length < 5) {
      errors.push('La password deve avere almeno 5 caratteri');
    }

    if (this.confirmPassword && this.userData.password !== this.confirmPassword) {
      errors.push('Le password non coincidono');
    }

    return errors;
  }

  getPasswordChecklist() {
    return [
      {
        label: 'Almeno 5 caratteri',
        valid: this.userData.password.length >= 5
      },
      {
        label: 'Almeno una lettera maiuscola',
        valid: /[A-Z]/.test(this.userData.password)
      },
      {
        label: 'Almeno un numero o carattere speciale',
        valid: /[0-9!@#$%^&*(),.?":{}|<>]/.test(this.userData.password)
      },
      {
        label: 'Le password coincidono',
        valid:
          this.userData.password.length > 0 &&
          this.confirmPassword.length > 0 &&
          this.userData.password === this.confirmPassword
      }
    ];
  }

  isPasswordValid(): boolean {
    return this.getPasswordChecklist().every(item => item.valid);
  }

  isValidPhone(): boolean {
    return this.isPhoneValid && this.userData.telefono.trim() !== '';
  }

  onPhoneNumberChange(phoneNumber: string): void {
    this.userData.telefono = phoneNumber || '';
  }

  onPhoneValidityChange(isValid: boolean): void {
    this.isPhoneValid = isValid;
  }

  isAdult(): boolean {
    if (!this.userData.data_nascita) return false;

    const today = new Date();
    const birth = new Date(this.userData.data_nascita);

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 18;
  }

  isFormValid(): boolean {
    return (
      this.userData.nome.trim() !== '' &&
      this.userData.cognome.trim() !== '' &&
      this.userData.email.trim() !== '' &&

      this.isPasswordValid() &&

      this.isValidPhone() &&
      this.isAdult()
    );
  }

  register() {
    if (!this.isFormValid()) return;

    this.isLoading = true;
    this.isSuccess = false; 
    this.alertMessage = '';  
    this.alertType = 'success';

    this.http.post<any>('http://localhost:3000/api/register', this.userData).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
        this.alertMessage = 'Registrazione avvenuta con successo! Stai per essere reindirizzato alla home...';
        this.alertType = 'success';

        this.cdr.detectChanges(); 
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 5000);
      },
      error: (err) => {
        this.isLoading = false;
        this.isSuccess = false;
        this.alertMessage = err.error?.message || 'Errore nella registrazione';
        this.alertType = 'error';

        this.cdr.detectChanges(); 
        setTimeout(() => {
          this.alertMessage = null;
          this.cdr.detectChanges();
        }, 5000);
      }
    });
  }

  goBack() {
    this.router.navigate(['/login']);
  }

  getPasswordStatus(): { valid: boolean; message: string } {

    if (!this.userData.password && !this.confirmPassword) {
      return { valid: false, message: '' };
    }

    if (this.userData.password.length < 6) {
      return { valid: false, message: 'La password deve avere almeno 6 caratteri' };
    }

    if (this.confirmPassword.length === 0) {
      return { valid: false, message: 'Conferma la password' };
    }

    if (this.userData.password !== this.confirmPassword) {
      return { valid: false, message: 'Le password non coincidono' };
    }

    return { valid: true, message: 'Password corretta ✓' };
  }
}
