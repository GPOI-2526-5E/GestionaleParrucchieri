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
  telefono: string | null;
  data_nascita: string | null;
  ruolo: string;
  hasPassword?: boolean;
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

  // resta true per tutto il flusso di completamento
  requirePasswordForCompletion = false;

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

    const nome = String(this.user.nome ?? '').trim();
    const cognome = String(this.user.cognome ?? '').trim();
    const telefono = String(this.user.telefono ?? '').trim();
    const dataNascita = String(this.user.data_nascita ?? '').trim();

    this.missingRequiredFields = !nome || !cognome || !telefono || !dataNascita;

    // La password resta richiesta per tutto il flusso di completamento
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

    this.http.get<UserProfile>(`${this.api}/me`, { headers }).subscribe({
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
          hasPassword: res.hasPassword
        };

        // Se i dati sono incompleti all'apertura, allora richiedi anche la password
        const nome = String(this.user.nome ?? '').trim();
        const cognome = String(this.user.cognome ?? '').trim();
        const telefono = String(this.user.telefono ?? '').trim();
        const dataNascita = String(this.user.data_nascita ?? '').trim();

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
    this.cdr.detectChanges();

    this.loadUserData();
  }

  onFieldChange(): void {
    this.updateDerivedState();
    this.cdr.detectChanges();
  }

  saveUserData(): void {
    if (!this.user || this.isSaving) return;

    this.errorMessage = '';
    this.successMessage = '';

    const nome = String(this.user.nome ?? '').trim();
    const cognome = String(this.user.cognome ?? '').trim();
    const telefono = String(this.user.telefono ?? '').trim();
    const dataNascita = String(this.user.data_nascita ?? '').trim();

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

    const payload: any = {
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

        // reset del flusso completamento
        this.requirePasswordForCompletion = false;

        this.password = '';
        this.confirmPassword = '';
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