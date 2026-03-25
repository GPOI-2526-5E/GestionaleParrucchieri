import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

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

@Component({
  selector: 'app-info-utente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './info-utente.component.html',
  styleUrls: ['./info-utente.component.css']
})
export class InfoUtenteComponent implements OnInit {
  private api = 'http://localhost:3000/api/auth';

  user: UserProfile | null = null;

  password = '';
  confirmPassword = '';

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

  showVerifyPasswordPanel = false;
  showChangePasswordPanel = false;

  verifyCurrentPassword = '';
  showVerifyCurrentPassword = false;
  isVerifyingPassword = false;
  verifyPasswordMessage = '';
  verifyPasswordError = '';

  currentPasswordChange = '';
  newPasswordChange = '';
  confirmNewPasswordChange = '';
  showCurrentPasswordChange = false;
  showNewPasswordChange = false;
  showConfirmNewPasswordChange = false;
  isChangingPassword = false;
  changePasswordMessage = '';
  changePasswordError = '';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUserData();
  }

  private getAuthHeaders(): HttpHeaders | null {
    const token = this.auth.getToken();

    if (!token) {
      return null;
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private updateDerivedState(): void {
    if (!this.user) {
      this.missingRequiredFields = false;
      this.passwordRequired = false;
      this.showCompletionWarning = false;
      this.disableCancelButton = false;
      this.completionMessage = '';
      return;
    }

    const nome = String(this.user.nome).trim();
    const cognome = String(this.user.cognome).trim();
    const telefono = String(this.user.telefono).trim();
    const dataNascita = String(this.user.data_nascita).trim();

    this.missingRequiredFields = !nome || !cognome || !telefono || !dataNascita;
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

    const headers = this.getAuthHeaders();

    if (!headers) {
      this.isLoading = false;
      this.errorMessage = 'Sessione non valida. Effettua di nuovo il login.';
      this.cdr.detectChanges();
      this.router.navigate(['/login']);
      return;
    }

    this.http.get<any>(`${this.api}/me`, { headers }).subscribe({
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
          data_nascita: res.data_nascita ? String(res.data_nascita).substring(0, 10) : '',
          ruolo: res.ruolo ?? '',
          hasPassword: res.hasPassword ?? false,
          photoURL: res.photoURL ?? res.picture ?? res.avatar ?? null
        };

        const nome = String(this.user.nome).trim();
        const cognome = String(this.user.cognome).trim();
        const telefono = String(this.user.telefono).trim();
        const dataNascita = String(this.user.data_nascita).trim();

        const hasIncompleteData = !nome || !cognome || !telefono || !dataNascita;
        this.requirePasswordForCompletion = hasIncompleteData;

        this.updateDerivedState();

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
    this.password = '';
    this.confirmPassword = '';
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.cdr.detectChanges();

    this.loadUserData();
  }

  onFieldChange(): void {
    this.updateDerivedState();
    this.cdr.detectChanges();
  }

  getUserInitials(): string {
    if (!this.user) return 'U';

    const nome = this.user.nome ? this.user.nome.charAt(0) : 'U';
    const cognome = this.user.cognome ? this.user.cognome.charAt(0) : '';

    return `${nome}${cognome}`.toUpperCase();
  }

  getFullName(): string {
    if (!this.user) return 'Utente';

    const fullName = `${this.user.nome || ''} ${this.user.cognome || ''}`.trim();
    return fullName || 'Utente';
  }

  toggleVerifyPasswordPanel(): void {
    this.showVerifyPasswordPanel = !this.showVerifyPasswordPanel;

    if (this.showVerifyPasswordPanel) {
      this.showChangePasswordPanel = false;
      this.verifyPasswordMessage = '';
      this.verifyPasswordError = '';
    }

    this.cdr.detectChanges();
  }

  toggleChangePasswordPanel(): void {
    this.showChangePasswordPanel = !this.showChangePasswordPanel;

    if (this.showChangePasswordPanel) {
      this.showVerifyPasswordPanel = false;
      this.changePasswordMessage = '';
      this.changePasswordError = '';
    }

    this.cdr.detectChanges();
  }

  verifyCurrentPasswordAction(): void {
    if (this.isVerifyingPassword) return;

    this.verifyPasswordMessage = '';
    this.verifyPasswordError = '';

    if (!this.verifyCurrentPassword.trim()) {
      this.verifyPasswordError = 'Inserisci la password attuale.';
      this.cdr.detectChanges();
      return;
    }

    const headers = this.getAuthHeaders();

    if (!headers) {
      this.verifyPasswordError = 'Sessione non valida. Effettua di nuovo il login.';
      this.cdr.detectChanges();
      this.router.navigate(['/login']);
      return;
    }

    this.isVerifyingPassword = true;
    this.cdr.detectChanges();

    this.http.post(
      `${this.api}/verify-password`,
      { password: this.verifyCurrentPassword.trim() },
      { headers }
    ).subscribe({
      next: () => {
        this.isVerifyingPassword = false;
        this.verifyPasswordMessage = 'Identità verificata correttamente.';
        this.verifyCurrentPassword = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Errore verifica password:', err);
        this.isVerifyingPassword = false;
        this.verifyPasswordError =
          err?.error?.message || 'Password non corretta.';
        this.cdr.detectChanges();
      }
    });
  }

  changePasswordAction(): void {
    if (this.isChangingPassword) return;

    this.changePasswordMessage = '';
    this.changePasswordError = '';

    if (!this.currentPasswordChange.trim()) {
      this.changePasswordError = 'Inserisci la password attuale.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.newPasswordChange.trim()) {
      this.changePasswordError = 'Inserisci una nuova password.';
      this.cdr.detectChanges();
      return;
    }

    if (this.newPasswordChange.trim().length < 6) {
      this.changePasswordError = 'La nuova password deve contenere almeno 6 caratteri.';
      this.cdr.detectChanges();
      return;
    }

    if (this.newPasswordChange !== this.confirmNewPasswordChange) {
      this.changePasswordError = 'Le nuove password non coincidono.';
      this.cdr.detectChanges();
      return;
    }

    if (this.currentPasswordChange === this.newPasswordChange) {
      this.changePasswordError = 'La nuova password deve essere diversa da quella attuale.';
      this.cdr.detectChanges();
      return;
    }

    const headers = this.getAuthHeaders();

    if (!headers) {
      this.changePasswordError = 'Sessione non valida. Effettua di nuovo il login.';
      this.cdr.detectChanges();
      this.router.navigate(['/login']);
      return;
    }

    this.isChangingPassword = true;
    this.cdr.detectChanges();

    this.http.put(
      `${this.api}/change-password`,
      {
        currentPassword: this.currentPasswordChange.trim(),
        newPassword: this.newPasswordChange.trim()
      },
      { headers }
    ).subscribe({
      next: () => {
        this.isChangingPassword = false;
        this.changePasswordMessage = 'Password aggiornata con successo.';
        this.currentPasswordChange = '';
        this.newPasswordChange = '';
        this.confirmNewPasswordChange = '';
        this.showCurrentPasswordChange = false;
        this.showNewPasswordChange = false;
        this.showConfirmNewPasswordChange = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Errore modifica password:', err);
        this.isChangingPassword = false;
        this.changePasswordError =
          err?.error?.message || 'Impossibile aggiornare la password.';
        this.cdr.detectChanges();
      }
    });
  }

  saveUserData(): void {
    if (!this.user || this.isSaving) return;

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

    if (this.passwordRequired) {
      if (!this.password.trim()) {
        this.errorMessage = 'Inserisci una password.';
        this.cdr.detectChanges();
        return;
      }

      if (this.password.trim().length < 6) {
        this.errorMessage = 'La password deve contenere almeno 6 caratteri.';
        this.cdr.detectChanges();
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Le password non coincidono.';
        this.cdr.detectChanges();
        return;
      }
    }

    const headers = this.getAuthHeaders();

    if (!headers) {
      this.errorMessage = 'Sessione non valida. Effettua di nuovo il login.';
      this.cdr.detectChanges();
      this.router.navigate(['/login']);
      return;
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

    this.http.put(`${this.api}/me`, payload, { headers }).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = 'Dati aggiornati con successo.';
        this.isEditMode = false;
        this.requirePasswordForCompletion = false;
        this.password = '';
        this.confirmPassword = '';
        this.showPassword = false;
        this.showConfirmPassword = false;
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
    this.router.navigate(['/login']);
  }

  formatDate(date: string | null): string {
    if (!date) return '-';

    const d = new Date(date);
    if (isNaN(d.getTime())) return date;

    return d.toLocaleDateString('it-IT');
  }
}