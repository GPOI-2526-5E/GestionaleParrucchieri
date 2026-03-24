import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  hasPassword: boolean;
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

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUserData();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  loadUserData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.get<UserProfile>(`${this.api}/me`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (res) => {
        this.user = res;
        this.isLoading = false;

        if (this.hasMissingRequiredFields() || this.needsPassword()) {
          this.isEditMode = true;
        }
      },
      error: (err) => {
        console.error('Errore recupero profilo:', err);
        this.errorMessage = 'Impossibile recuperare i dati utente.';
        this.isLoading = false;
      }
    });
  }

  hasMissingRequiredFields(): boolean {
    if (!this.user) return false;

    return (
      !this.user.nome?.trim() ||
      !this.user.cognome?.trim() ||
      !this.user.telefono?.trim() ||
      !this.user.data_nascita
    );
  }

  needsPassword(): boolean {
    return !!this.user && !this.user.hasPassword;
  }

  enableEditMode(): void {
    this.isEditMode = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEditMode(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.hasMissingRequiredFields() || this.needsPassword()) {
      return;
    }

    this.isEditMode = false;
    this.password = '';
    this.confirmPassword = '';
    this.loadUserData();
  }

  saveUserData(): void {
    if (!this.user) return;

    this.errorMessage = '';
    this.successMessage = '';

    if (
      !this.user.nome?.trim() ||
      !this.user.cognome?.trim() ||
      !this.user.telefono?.trim() ||
      !this.user.data_nascita
    ) {
      this.errorMessage = 'Compila tutti i campi obbligatori.';
      return;
    }

    if (this.needsPassword()) {
      if (!this.password.trim()) {
        this.errorMessage = 'Inserisci una password.';
        return;
      }

      if (this.password.trim().length < 6) {
        this.errorMessage = 'La password deve contenere almeno 6 caratteri.';
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Le password non coincidono.';
        return;
      }
    }

    this.isSaving = true;

    this.http.put(`${this.api}/me`, {
      nome: this.user.nome.trim(),
      cognome: this.user.cognome.trim(),
      telefono: this.user.telefono.trim(),
      data_nascita: this.user.data_nascita,
      password: this.needsPassword() ? this.password : undefined
    }, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = 'Dati aggiornati con successo.';
        this.isEditMode = false;
        this.password = '';
        this.confirmPassword = '';
        this.loadUserData();
      },
      error: (err) => {
        console.error('Errore aggiornamento profilo:', err);
        this.isSaving = false;
        this.errorMessage = err.error?.message || 'Errore durante il salvataggio dei dati.';
      }
    });
  }

  logout(): void {
    this.auth.logout();
  }

  formatDate(date: string | null): string {
    if (!date) return '-';

    const d = new Date(date);
    if (isNaN(d.getTime())) return date;

    return d.toLocaleDateString('it-IT');
  }
}