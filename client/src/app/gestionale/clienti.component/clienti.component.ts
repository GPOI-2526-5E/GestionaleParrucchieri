import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  isLoading = true;
  isSaving = false;
  isDeleting = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' | '' = '';

  constructor(private utentiService: UtentiService) {}

  ngOnInit(): void {
    this.loadClienti();
  }

  toggleSidenav(): void {
    this.isSidenavCollapsed = !this.isSidenavCollapsed;
  }

  loadClienti(): void {
    this.isLoading = true;
    this.feedbackMessage = '';

    this.utentiService.getClienti().subscribe({
      next: (clienti: Utente[]) => {
        this.clienti = clienti;
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
      },
      error: (err: any) => {
        console.error('Errore caricamento clienti:', err);
        this.feedbackType = 'error';
        this.feedbackMessage = 'Impossibile caricare i clienti.';
        this.isLoading = false;
      }
    });
  }

  selectCliente(cliente: Utente): void {
    this.selectedCliente = cliente;
    this.draftCliente = {
      ...cliente,
      telefono: cliente.telefono ?? '',
      data_nascita: cliente.data_nascita ?? '',
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

  saveCliente(): void {
    if (!this.selectedCliente || !this.draftCliente || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.feedbackMessage = '';

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
        this.feedbackMessage = 'Cliente aggiornato con successo.';
        this.isSaving = false;
      },
      error: (err: any) => {
        console.error('Errore aggiornamento cliente:', err);
        this.feedbackType = 'error';
        this.feedbackMessage = err?.error?.message || 'Aggiornamento cliente non riuscito.';
        this.isSaving = false;
      }
    });
  }

  deleteCliente(cliente: Utente): void {
    if (this.isDeleting) {
      return;
    }

    const confirmed = window.confirm(`Vuoi davvero eliminare ${cliente.nome} ${cliente.cognome}?`);
    if (!confirmed) {
      return;
    }

    this.isDeleting = true;
    this.feedbackMessage = '';

    this.utentiService.deleteCliente(cliente.idUtente).subscribe({
      next: () => {
        this.clienti = this.clienti.filter((item) => item.idUtente !== cliente.idUtente);
        if (this.selectedCliente?.idUtente === cliente.idUtente) {
          this.clearSelection();
        }
        this.feedbackType = 'success';
        this.feedbackMessage = 'Cliente eliminato con successo.';
        this.isDeleting = false;
      },
      error: (err: any) => {
        console.error('Errore eliminazione cliente:', err);
        this.feedbackType = 'error';
        this.feedbackMessage = err?.error?.message || 'Eliminazione cliente non riuscita.';
        this.isDeleting = false;
      }
    });
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
