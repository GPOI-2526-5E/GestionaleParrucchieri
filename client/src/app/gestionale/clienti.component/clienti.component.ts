import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs/operators';
import { SidenavComponent } from '../sidenav.component/sidenav.component';
import { UtentiService } from '../../services/utentiService';
import { Utente } from '../../models/utente.model';

@Component({
  selector: 'app-clienti.component',
  standalone: true,
  imports: [CommonModule, FormsModule, SidenavComponent],
  templateUrl: './clienti.component.html',
  styleUrl: './clienti.component.css',
})
export class ClientiComponent implements OnInit {
  isSidenavCollapsed = false;
  clienti: Utente[] = [];
  selectedCliente: Utente | null = null;
  draftCliente: Utente | null = null;
  pendingDeleteCliente: Utente | null = null;
  searchTerm = '';
  isLoading = true;
  isSaving = false;
  isDeleting = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' | '' = '';

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
    this.feedbackMessage = '';
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
        this.feedbackType = 'error';
        this.feedbackMessage = 'Impossibile caricare i clienti. Controlla che il backend sia avviato e collegato a Supabase.';
        this.isLoading = false;
        this.refreshView();
      }
    });
  }

  selectCliente(cliente: Utente): void {
    this.selectedCliente = cliente;
    this.draftCliente = {
      ...cliente,
      telefono: cliente.telefono ?? '',
      data_nascita: this.toDateInputValue(cliente.data_nascita),
      ruolo: cliente.ruolo ?? 'cliente'
    };
    this.feedbackMessage = '';
    this.feedbackType = '';
  }

  clearSelection(): void {
    this.selectedCliente = null;
    this.draftCliente = null;
    this.feedbackMessage = '';
    this.feedbackType = '';
  }

  requestDeleteCliente(cliente: Utente): void {
    if (this.isDeleting) {
      return;
    }

    this.pendingDeleteCliente = cliente;
    this.feedbackMessage = '';
    this.feedbackType = '';
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
    this.feedbackMessage = '';
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
        this.feedbackType = 'success';
        this.feedbackMessage = 'Cliente modificato con successo.';
        this.isSaving = false;
        this.refreshView();
      },
      error: (err: any) => {
        console.error('Errore aggiornamento cliente:', err);
        this.feedbackType = 'error';
        this.feedbackMessage = err?.error?.message || 'Aggiornamento cliente non riuscito.';
        this.isSaving = false;
        this.refreshView();
      }
    });
  }

  private deleteCliente(cliente: Utente): void {
    if (this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.feedbackMessage = '';
    this.refreshView();

    this.utentiService.deleteCliente(cliente.idUtente).subscribe({
      next: () => {
        this.clienti = this.clienti.filter((item) => item.idUtente !== cliente.idUtente);
        this.pendingDeleteCliente = null;
        if (this.selectedCliente?.idUtente === cliente.idUtente) {
          this.clearSelection();
        }
        this.feedbackType = 'success';
        this.feedbackMessage = 'Cliente rimosso con successo.';
        this.isDeleting = false;
        this.refreshView();
      },
      error: (err: any) => {
        console.error('Errore eliminazione cliente:', err);
        this.feedbackType = 'error';
        this.feedbackMessage = err?.error?.message || 'Eliminazione cliente non riuscita.';
        this.isDeleting = false;
        this.refreshView();
      }
    });
  }

  getInitials(cliente: Utente): string {
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
