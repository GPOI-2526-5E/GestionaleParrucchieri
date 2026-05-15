import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IntlTelInputComponent } from 'intl-tel-input/angularWithUtils';
import { timeout } from 'rxjs/operators';
import { SidenavComponent } from '../sidenav.component/sidenav.component';
import { UtentiService } from '../../services/utentiService';
import { Utente } from '../../models/utente.model';

interface ClienteFormDraft {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  data_nascita: string;
  ruolo: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-clienti.component',
  standalone: true,
  imports: [CommonModule, FormsModule, SidenavComponent, IntlTelInputComponent],
  templateUrl: './clienti.component.html',
  styleUrl: './clienti.component.css',
})
export class ClientiComponent implements OnInit {
  private feedbackTimeout: ReturnType<typeof setTimeout> | null = null;
  isSidenavCollapsed = false;
  clienti: Utente[] = [];
  selectedCliente: Utente | null = null;
  draftCliente: Utente | null = null;
  newCliente: ClienteFormDraft = this.createEmptyClienteDraft();
  pendingDeleteCliente: Utente | null = null;
  brokenProfilePhotos = new Set<number | string>();
  searchTerm = '';
  isLoading = true;
  isSaving = false;
  isCreating = false;
  isCreateMode = false;
  isDeleting = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' | '' = '';
  feedbackTitle = '';
  isNewPhoneValid = false;
  initTelOptions = {
    initialCountry: 'it' as const,
    preferredCountries: ['it', 'gb', 'fr', 'de', 'es', 'us'],
    separateDialCode: true,
    nationalMode: false,
    strictMode: true,
    formatOnDisplay: true,
    autoPlaceholder: 'polite' as const
  };

  constructor(
    private utentiService: UtentiService,
    private cdr: ChangeDetectorRef
  ) {}

  get filteredClienti(): Utente[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.clienti;
    }

    return this.clienti.filter((cliente) =>
      [
        cliente.nome,
        cliente.cognome,
        cliente.email,
        cliente.telefono,
        String(cliente.idUtente)
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }

  get clientiConTelefono(): number {
    return this.clienti.filter((cliente) => !!cliente.telefono).length;
  }

  get clientiSenzaTelefono(): number {
    return this.clienti.length - this.clientiConTelefono;
  }

  get hasDraftChanges(): boolean {
    if (!this.selectedCliente || !this.draftCliente) {
      return false;
    }

    return this.selectedCliente.nome !== this.draftCliente.nome ||
      this.selectedCliente.cognome !== this.draftCliente.cognome ||
      this.selectedCliente.email !== this.draftCliente.email ||
      (this.selectedCliente.telefono ?? '') !== (this.draftCliente.telefono ?? '') ||
      this.toDateInputValue(this.selectedCliente.data_nascita) !== (this.draftCliente.data_nascita ?? '');
  }

  get isNewClienteValid(): boolean {
    return this.newCliente.nome.trim() !== '' &&
      this.newCliente.cognome.trim() !== '' &&
      this.newCliente.email.trim() !== '' &&
      this.newCliente.telefono.trim() !== '' &&
      this.isNewPhoneValid &&
      this.isAdult(this.newCliente.data_nascita) &&
      this.isNewPasswordValid &&
      this.newCliente.password === this.newCliente.confirmPassword;
  }

  get isNewPasswordValid(): boolean {
    const password = this.newCliente.password;

    return password.length >= 6 &&
      /[A-Z]/.test(password) &&
      /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  }

  ngOnInit(): void {
    this.loadClienti();
  }

  toggleSidenav(): void {
    this.isSidenavCollapsed = !this.isSidenavCollapsed;
  }

  private getClientiRequest() {
    return this.utentiService.getClienti().pipe(timeout(8000));
  }

  loadClienti(): void {
    this.isLoading = true;
    this.clearFeedback();
    this.refreshView();

    this.getClientiRequest().subscribe({
      next: (clienti: Utente[]) => {
        this.clienti = clienti;
        this.pendingDeleteCliente = null;
        if (this.selectedCliente) {
          const updatedSelection = clienti.find((cliente: Utente) => cliente.idUtente === this.selectedCliente?.idUtente) ?? null;
          if (updatedSelection) {
            this.selectCliente(updatedSelection);
          } else {
            this.selectedCliente = null;
            this.draftCliente = null;
          }
        }
        this.isLoading = false;
        this.refreshView();
      },
      error: (err: any) => {
        console.error('Errore caricamento clienti:', err);
        this.showFeedback(
          'Impossibile caricare i clienti. Controlla che il backend sia avviato e collegato a Supabase.',
          'error',
          'Caricamento non riuscito'
        );
        this.isLoading = false;
        this.refreshView();
      }
    });
  }

  selectCliente(cliente: Utente): void {
    this.isCreateMode = false;
    this.selectedCliente = cliente;
    this.draftCliente = {
      ...cliente,
      telefono: cliente.telefono ?? '',
      data_nascita: this.toDateInputValue(cliente.data_nascita),
      ruolo: cliente.ruolo ?? 'cliente'
    };
    this.clearFeedback();
  }

  clearSelection(): void {
    this.selectedCliente = null;
    this.draftCliente = null;
    this.isCreateMode = false;
    this.clearFeedback();
  }

  startCreateCliente(): void {
    this.isCreateMode = true;
    this.selectedCliente = null;
    this.draftCliente = null;
    this.newCliente = this.createEmptyClienteDraft();
    this.isNewPhoneValid = false;
    this.clearFeedback();
    this.scrollToEditor();
  }

  cancelCreateCliente(): void {
    if (this.isCreating) {
      return;
    }

    this.isCreateMode = false;
    this.newCliente = this.createEmptyClienteDraft();
    this.isNewPhoneValid = false;
    this.clearFeedback();
  }

  onNewPhoneNumberChange(phoneNumber: string): void {
    this.newCliente.telefono = phoneNumber || '';
  }

  onNewPhoneValidityChange(isValid: boolean): void {
    this.isNewPhoneValid = isValid;
    this.refreshView();
  }

  requestDeleteCliente(cliente: Utente): void {
    if (this.isDeleting) {
      return;
    }

    this.pendingDeleteCliente = cliente;
    this.clearFeedback();
  }

  cancelDeleteCliente(): void {
    if (!this.isDeleting) {
      this.pendingDeleteCliente = null;
    }
  }

  confirmDeleteCliente(): void {
    if (!this.pendingDeleteCliente) {
      return;
    }

    this.deleteCliente(this.pendingDeleteCliente);
  }

  saveCliente(): void {
    if (!this.selectedCliente || !this.draftCliente || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.clearFeedback();
    this.refreshView();

    this.utentiService.updateCliente(this.selectedCliente.idUtente, {
      nome: this.draftCliente.nome,
      cognome: this.draftCliente.cognome,
      email: this.draftCliente.email,
      telefono: this.draftCliente.telefono ?? '',
      data_nascita: this.draftCliente.data_nascita ?? ''
    }).subscribe({
      next: (clienteAggiornato: Utente) => {
        this.clienti = this.clienti.map((cliente) =>
          cliente.idUtente === clienteAggiornato.idUtente ? clienteAggiornato : cliente
        );
        this.selectCliente(clienteAggiornato);
        this.showFeedback('Cliente modificato con successo.', 'success', 'Modifica completata');
        this.isSaving = false;
        this.refreshView();
      },
      error: (err: any) => {
        console.error('Errore aggiornamento cliente:', err);
        this.showFeedback(
          err?.error?.message || 'Aggiornamento cliente non riuscito.',
          'error',
          'Modifica non riuscita'
        );
        this.isSaving = false;
        this.refreshView();
      }
    });
  }

  saveNewCliente(): void {
    if (this.isCreating || !this.isNewClienteValid) {
      return;
    }

    this.isCreating = true;
    this.clearFeedback();
    this.refreshView();

    this.utentiService.createCliente({
      nome: this.newCliente.nome.trim(),
      cognome: this.newCliente.cognome.trim(),
      email: this.newCliente.email.trim().toLowerCase(),
      telefono: this.newCliente.telefono.trim(),
      data_nascita: this.newCliente.data_nascita,
      ruolo: 'cliente',
      password: this.newCliente.password.trim()
    }).subscribe({
      next: (clienteCreato: Utente) => {
        this.clienti = [...this.clienti, clienteCreato].sort((a, b) => {
          const cognomeCompare = a.cognome.localeCompare(b.cognome, 'it', { sensitivity: 'base' });
          return cognomeCompare !== 0
            ? cognomeCompare
            : a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' });
        });
        this.newCliente = this.createEmptyClienteDraft();
        this.isCreateMode = false;
        this.selectCliente(clienteCreato);
        this.showFeedback('Cliente inserito con successo.', 'success', 'Cliente creato');
        this.isCreating = false;
        this.refreshView();
      },
      error: (err: any) => {
        console.error('Errore inserimento cliente:', err);
        this.showFeedback(
          err?.error?.message || 'Inserimento cliente non riuscito.',
          'error',
          'Inserimento non riuscito'
        );
        this.isCreating = false;
        this.refreshView();
      }
    });
  }

  private deleteCliente(cliente: Utente): void {
    if (this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.clearFeedback();
    this.refreshView();

    this.utentiService.deleteCliente(cliente.idUtente).subscribe({
      next: () => {
        this.clienti = this.clienti.filter((item) => item.idUtente !== cliente.idUtente);
        this.pendingDeleteCliente = null;
        if (this.selectedCliente?.idUtente === cliente.idUtente) {
          this.clearSelection();
        }
        this.showFeedback('Cliente rimosso con successo.', 'success', 'Cliente eliminato');
        this.isDeleting = false;
        this.refreshView();
      },
      error: (err: any) => {
        console.error('Errore eliminazione cliente:', err);
        this.showFeedback(
          err?.error?.message || 'Eliminazione cliente non riuscita.',
          'error',
          'Eliminazione non riuscita'
        );
        this.isDeleting = false;
        this.refreshView();
      }
    });
  }

  getInitials(cliente: Pick<Utente, 'nome' | 'cognome'>): string {
    const initials = `${cliente.nome?.[0] ?? ''}${cliente.cognome?.[0] ?? ''}`.trim();
    return initials ? initials.toUpperCase() : 'CL';
  }

  private toDateInputValue(value?: string | null): string {
    if (!value) {
      return '';
    }

    return value.includes('T') ? value.split('T')[0] : value;
  }

  private refreshView(): void {
    this.cdr.detectChanges();
  }

  private showFeedback(
    message: string,
    type: 'success' | 'error',
    title: string
  ): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }

    this.feedbackMessage = message;
    this.feedbackType = type;
    this.feedbackTitle = title;

    if (type === 'success') {
      this.feedbackTimeout = setTimeout(() => {
        this.clearFeedback();
        this.refreshView();
      }, 2600);
    }
  }

  clearFeedback(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }

    this.feedbackMessage = '';
    this.feedbackType = '';
    this.feedbackTitle = '';
  }

  getClientePhotoUrl(cliente: Partial<Utente> | ClienteFormDraft): string | null {
    const key = 'idUtente' in cliente && cliente.idUtente
      ? cliente.idUtente
      : `${cliente.email || cliente.nome || 'new'}`;

    if (this.brokenProfilePhotos.has(key)) {
      return null;
    }

    const rawUrl = String(
      ('photoURL' in cliente && cliente.photoURL) ||
      ('picture' in cliente && cliente.picture) ||
      ('avatar_url' in cliente && cliente.avatar_url) ||
      ('avatar' in cliente && cliente.avatar) ||
      ''
    ).trim();

    if (!rawUrl) {
      return null;
    }

    const normalizedUrl = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;

    if (normalizedUrl.includes('googleusercontent.com')) {
      return normalizedUrl.replace(/=s\d+-c$/, '=s256-c');
    }

    return normalizedUrl;
  }

  onClientePhotoError(cliente: Partial<Utente> | ClienteFormDraft): void {
    const key = 'idUtente' in cliente && cliente.idUtente
      ? cliente.idUtente
      : `${cliente.email || cliente.nome || 'new'}`;

    this.brokenProfilePhotos.add(key);
    this.refreshView();
  }

  private createEmptyClienteDraft(): ClienteFormDraft {
    return {
      nome: '',
      cognome: '',
      email: '',
      telefono: '',
      data_nascita: '',
      ruolo: 'cliente',
      password: '',
      confirmPassword: ''
    };
  }

  private scrollToEditor(): void {
    setTimeout(() => {
      document.getElementById('modifica-cliente')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  private isAdult(value: string): boolean {
    if (!value) {
      return false;
    }

    const birth = new Date(`${value}T00:00:00`);

    if (Number.isNaN(birth.getTime())) {
      return false;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 18;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('it-IT').format(date);
  }
}
