import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { IntlTelInputComponent } from 'intl-tel-input/angularWithUtils';

import { AuthService } from '../../services/auth';
import { NavbarComponent } from '../navbar.component/navbar.component';

interface UserProfile {
  idUtente: number;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  data_nascita: string;
  ruolo: string;
  hasPassword?: boolean;
  photoURL?: string | null;
}

interface PasswordChecklistItem {
  label: string;
  valid: boolean;
}

@Component({
  selector: 'app-info-utente',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    RouterLink,
    IntlTelInputComponent
  ],
  templateUrl: './info-utente.component.html',
  styleUrls: ['./info-utente.component.css']
})
export class InfoUtenteComponent implements OnInit {
  private api = 'http://localhost:3000/api/auth';
  private changePasswordMessageTimeout: ReturnType<typeof setTimeout> | null = null;
  private changePasswordMessageHideTimeout: ReturnType<typeof setTimeout> | null = null;

  user: UserProfile | null = null;
  isProfilePhotoBroken = false;

  password = '';
  confirmPassword = '';
  completionPasswordChecklist: PasswordChecklistItem[] = [];
  completionPasswordValid = false;

  isLoading = true;
  isSaving = false;
  isEditMode = false;

  errorMessage = '';
  successMessage = '';

  missingRequiredFields = false;
  passwordRequired = false;
  showCompletionWarning = false;
  disableCancelButton = false;
  completionMessage = '';
  requirePasswordForCompletion = false;

  showPassword = false;
  showConfirmPassword = false;

  showChangePasswordPanel = false;

  currentPasswordChange = '';
  newPasswordChange = '';
  confirmNewPasswordChange = '';

  showCurrentPasswordChange = false;
  showNewPasswordChange = false;
  showConfirmNewPasswordChange = false;

  isChangingPassword = false;
  changePasswordMessage = '';
  changePasswordError = '';
  changePasswordErrorShake = false;
  changePasswordMessageHiding = false;

  isPhoneValid = true;
  selectedCountryIso2 = 'it';

  preferredCountries = ['it', 'gb', 'fr', 'de', 'es', 'us'];

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

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  private resetCompletionPasswordFields(): void {
    this.password = '';
    this.confirmPassword = '';
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.updateCompletionPasswordState();
  }

  private resetChangePasswordFields(): void {
    this.currentPasswordChange = '';
    this.newPasswordChange = '';
    this.confirmNewPasswordChange = '';

    this.showCurrentPasswordChange = false;
    this.showNewPasswordChange = false;
    this.showConfirmNewPasswordChange = false;
  }

  private clearChangePasswordMessageLater(): void {
    if (this.changePasswordMessageTimeout) {
      clearTimeout(this.changePasswordMessageTimeout);
    }

    if (this.changePasswordMessageHideTimeout) {
      clearTimeout(this.changePasswordMessageHideTimeout);
    }

    this.changePasswordMessageHiding = false;

    this.changePasswordMessageTimeout = setTimeout(() => {
      this.changePasswordMessageHiding = true;
      this.cdr.detectChanges();

      this.changePasswordMessageHideTimeout = setTimeout(() => {
        this.changePasswordMessage = '';
        this.changePasswordMessageHiding = false;
        this.cdr.detectChanges();
      }, 350);
    }, 3200);
  }

  private computeProfileCompletionState(): void {
    if (!this.user) {
      this.missingRequiredFields = false;
      this.passwordRequired = false;
      this.showCompletionWarning = false;
      this.disableCancelButton = false;
      this.completionMessage = '';
      return;
    }

    const nome = String(this.user.nome ?? '').trim();
    const cognome = String(this.user.cognome ?? '').trim();
    const telefono = String(this.user.telefono ?? '').trim();
    const dataNascita = String(this.user.data_nascita ?? '').trim();
    const hasPassword = !!this.user.hasPassword;

    this.missingRequiredFields = !nome || !cognome || !telefono || !dataNascita;

    this.requirePasswordForCompletion = !hasPassword;
    this.passwordRequired = this.requirePasswordForCompletion;

    this.showCompletionWarning =
      this.missingRequiredFields || this.requirePasswordForCompletion;

    this.disableCancelButton =
      this.missingRequiredFields || this.requirePasswordForCompletion;

    if (this.missingRequiredFields && this.requirePasswordForCompletion) {
      this.completionMessage =
        'Completa i dati mancanti e imposta una password per terminare la registrazione.';
    } else if (this.missingRequiredFields) {
      this.completionMessage =
        'Completa i dati mancanti per terminare la registrazione.';
    } else if (this.requirePasswordForCompletion) {
      this.completionMessage =
        'Imposta una password per terminare la registrazione.';
    } else {
      this.completionMessage = '';
    }
  }

  loadUserData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.http.get<any>(`${this.api}/me`).subscribe({
      next: (res) => {
        if (!res) {
          this.errorMessage = 'Il server non ha restituito dati utente.';
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        this.user = {
          idUtente: res.idUtente,
          nome: res.nome ?? '',
          cognome: res.cognome ?? '',
          email: res.email ?? '',
          telefono: res.telefono != null ? String(res.telefono) : '',
          data_nascita: res.data_nascita
            ? String(res.data_nascita).substring(0, 10)
            : '',
          ruolo: res.ruolo ?? '',
          hasPassword: !!res.hasPassword,
          photoURL:
            res.photoURL ??
            res.picture ??
            res.avatar_url ??
            res.avatar ??
            null
        };
        this.isProfilePhotoBroken = false;

        this.computeProfileCompletionState();
        this.isEditMode = this.showCompletionWarning;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Errore recupero profilo:', err);
        this.errorMessage =
          err?.error?.message || 'Impossibile recuperare i dati utente.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getProfilePhotoUrl(): string | null {
    if (!this.user?.photoURL || this.isProfilePhotoBroken) {
      return null;
    }

    const rawUrl = String(this.user.photoURL).trim();
    if (!rawUrl) {
      return null;
    }

    const normalizedUrl = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;

    if (normalizedUrl.includes('googleusercontent.com')) {
      return normalizedUrl.replace(/=s\d+-c$/, '=s256-c');
    }

    return normalizedUrl;
  }

  onProfilePhotoError(): void {
    this.isProfilePhotoBroken = true;
    this.cdr.detectChanges();
  }

  enableEditMode(): void {
    this.isEditMode = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  cancelEditMode(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.disableCancelButton) {
      this.cdr.detectChanges();
      return;
    }

    this.isEditMode = false;
    this.resetCompletionPasswordFields();
    this.cdr.detectChanges();

    this.loadUserData();
  }

  onFieldChange(): void {
    this.computeProfileCompletionState();
    this.cdr.detectChanges();
  }

  onCompletionPasswordChange(): void {
    this.updateCompletionPasswordState();
    this.cdr.detectChanges();
  }

  onPhoneNumberChange(phoneNumber: string): void {
    if (!this.user) {
      return;
    }

    this.user.telefono = phoneNumber || '';
    this.onFieldChange();
  }

  onPhoneValidityChange(isValid: boolean): void {
    this.isPhoneValid = isValid;
    this.cdr.detectChanges();
  }

  onCountryChange(countryIso2: string): void {
    this.selectedCountryIso2 = countryIso2;
    this.cdr.detectChanges();
  }

  private updateCompletionPasswordState(): void {
    this.completionPasswordChecklist = [
      {
        label: 'Almeno 5 caratteri',
        valid: this.password.length >= 5
      },
      {
        label: 'Almeno una lettera maiuscola',
        valid: /[A-Z]/.test(this.password)
      },
      {
        label: 'Almeno un numero o carattere speciale',
        valid: /[0-9!@#$%^&*(),.?":{}|<>]/.test(this.password)
      },
      {
        label: 'Le password coincidono',
        valid:
          this.password.length > 0 &&
          this.confirmPassword.length > 0 &&
          this.password === this.confirmPassword
      }
    ];
    this.completionPasswordValid = this.completionPasswordChecklist.every(
      (item: PasswordChecklistItem) => item.valid
    );
  }

  getUserInitials(): string {
    if (!this.user) {
      return 'U';
    }

    const nome = this.user.nome ? this.user.nome.charAt(0) : 'U';
    const cognome = this.user.cognome ? this.user.cognome.charAt(0) : '';

    return `${nome}${cognome}`.toUpperCase();
  }

  getFullName(): string {
    if (!this.user) {
      return 'Utente';
    }

    const fullName = `${this.user.nome || ''} ${this.user.cognome || ''}`.trim();
    return fullName || 'Utente';
  }

  toggleChangePasswordPanel(): void {
    this.showChangePasswordPanel = !this.showChangePasswordPanel;

    if (this.showChangePasswordPanel) {
      this.changePasswordMessage = '';
      this.changePasswordError = '';
    } else {
      this.resetChangePasswordFields();
      this.changePasswordMessage = '';
      this.changePasswordError = '';
    }

    this.cdr.detectChanges();
  }

  onChangePasswordFieldChange(): void {
    if (this.changePasswordError) {
      const currentValidationError = this.getChangePasswordValidationError();

      if (currentValidationError) {
        this.changePasswordError = currentValidationError;
      } else {
        this.changePasswordError = '';
        this.changePasswordErrorShake = false;
      }
    }

    this.cdr.detectChanges();
  }

  private getChangePasswordValidationError(): string {
    if (!this.currentPasswordChange.trim()) {
      return 'Inserisci la password attuale.';
    }

    if (!this.newPasswordChange.trim()) {
      return 'Inserisci una nuova password.';
    }

    if (this.newPasswordChange.trim().length < 6) {
      return 'La nuova password deve contenere almeno 6 caratteri.';
    }

    if (!this.confirmNewPasswordChange.trim()) {
      return 'Conferma la nuova password.';
    }

    if (this.newPasswordChange !== this.confirmNewPasswordChange) {
      return 'Le nuove password non coincidono.';
    }

    if (this.currentPasswordChange === this.newPasswordChange) {
      return 'La nuova password deve essere diversa da quella attuale.';
    }

    return '';
  }

  private showChangePasswordError(message: string): void {
    this.changePasswordError = message;
    this.changePasswordErrorShake = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.changePasswordErrorShake = true;
      this.cdr.detectChanges();
    }, 10);
  }

  changePasswordAction(): void {
    if (this.isChangingPassword) {
      return;
    }

    this.changePasswordMessage = '';
    this.changePasswordError = '';
    this.changePasswordErrorShake = false;

    if (!this.currentPasswordChange.trim()) {
      this.showChangePasswordError('Inserisci la password attuale.');
      return;
    }

    if (!this.newPasswordChange.trim()) {
      this.showChangePasswordError('Inserisci una nuova password.');
      return;
    }

    if (this.newPasswordChange.trim().length < 6) {
      this.showChangePasswordError(
        'La nuova password deve contenere almeno 6 caratteri.'
      );
      return;
    }

    if (!this.confirmNewPasswordChange.trim()) {
      this.showChangePasswordError('Conferma la nuova password.');
      return;
    }

    if (this.newPasswordChange !== this.confirmNewPasswordChange) {
      this.showChangePasswordError('Le nuove password non coincidono.');
      return;
    }

    if (this.currentPasswordChange === this.newPasswordChange) {
      this.showChangePasswordError(
        'La nuova password deve essere diversa da quella attuale.'
      );
      return;
    }

    this.isChangingPassword = true;
    this.cdr.detectChanges();

    this.http.post(
      `${this.api}/change-password`,
      {
        currentPassword: this.currentPasswordChange.trim(),
        newPassword: this.newPasswordChange.trim(),
        confirmNewPassword: this.confirmNewPasswordChange.trim()
      }
    ).subscribe({
      next: (res: any) => {
        this.isChangingPassword = false;
        this.changePasswordMessage =
          res?.message || 'Password aggiornata con successo.';
        this.changePasswordError = '';
        this.changePasswordErrorShake = false;

        this.resetChangePasswordFields();
        this.showChangePasswordPanel = false;
        this.clearChangePasswordMessageLater();

        if (this.user) {
          this.user.hasPassword = true;
        }

        this.computeProfileCompletionState();
        this.cdr.detectChanges();
        this.loadUserData();
      },
      error: (err) => {
        console.error('Errore modifica password:', err);
        this.isChangingPassword = false;
        this.changePasswordMessage = '';
        this.showChangePasswordError(
          err?.error?.message || 'Impossibile aggiornare la password.'
        );
      }
    });
  }

  saveUserData(): void {
    if (!this.user || this.isSaving) {
      return;
    }

    const wasPasswordRequired = this.passwordRequired;

    this.errorMessage = '';
    this.successMessage = '';

    const nome = String(this.user.nome).trim();
    const cognome = String(this.user.cognome).trim();
    const telefono = String(this.user.telefono).trim();
    const dataNascita = String(this.user.data_nascita).trim();

    if (!nome || !cognome || !telefono || !dataNascita) {
      this.errorMessage = 'Compila tutti i campi obbligatori.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.isPhoneValid) {
      this.errorMessage = 'Inserisci un numero di telefono valido.';
      this.cdr.detectChanges();
      return;
    }

    if (this.passwordRequired) {
      if (!this.password.trim()) {
        this.errorMessage = 'Inserisci una password.';
        this.cdr.detectChanges();
        return;
      }

      if (!this.completionPasswordValid) {
        this.errorMessage =
          'La password deve rispettare tutti i requisiti e coincidere con la conferma.';
        this.cdr.detectChanges();
        return;
      }
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    const payload: {
      nome: string;
      cognome: string;
      telefono: string;
      data_nascita: string;
      password?: string;
    } = {
      nome,
      cognome,
      telefono,
      data_nascita: dataNascita
    };

    if (this.passwordRequired) {
      payload.password = this.password.trim();
    }

    this.http.put(`${this.api}/me`, payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.successMessage = wasPasswordRequired
          ? 'Informazioni salvate correttamente. Profilo completato con successo.'
          : (res?.message || 'Informazioni salvate correttamente.');
        this.errorMessage = '';
        this.isEditMode = false;

        if (this.passwordRequired && this.user) {
          this.user.hasPassword = true;
        }

        this.resetCompletionPasswordFields();
        this.computeProfileCompletionState();
        this.cdr.detectChanges();

        this.loadUserData();
      },
      error: (err) => {
        console.error('Errore aggiornamento profilo:', err);
        this.isSaving = false;
        this.errorMessage =
          err?.error?.message || 'Errore durante il salvataggio dei dati.';
        this.cdr.detectChanges();
      }
    });
  }

  logout(): void {
    this.auth.logout();
  }

  formatDate(date: string | null): string {
    if (!date) {
      return '-';
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return date;
    }

    return d.toLocaleDateString('it-IT');
  }
}
