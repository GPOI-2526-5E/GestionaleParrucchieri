import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SidenavComponent } from '../sidenav.component/sidenav.component';
import { AppuntamentoService } from '../../services/appuntamentoService';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-home.component',
  standalone: true,
  imports: [CommonModule, SidenavComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  constructor(private readonly appuntamentoService: AppuntamentoService, private cdr: ChangeDetectorRef,) {}

  isSidenavCollapsed = false;

  toggleSidenav(): void {
    this.isSidenavCollapsed = !this.isSidenavCollapsed;
  }
  readonly stats = [
    { label: 'Appuntamenti oggi', value: '', trend: '+4 vs ieri' },
    { label: 'Incasso giornaliero', value: 'EUR 642', trend: '+12%' },
    { label: 'Prodotti in riordino', value: '7', trend: 'attenzione stock' },
    { label: 'Clienti in salone', value: '3', trend: '2 in attesa' }
  ];

  ngOnInit(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    this.appuntamentoService.getAppuntamentiCount(today).subscribe({
      next: (totale) => {
        this.stats[0].value = String(totale);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Errore nel recupero del totale appuntamenti di oggi:', error);
      }
    });
  }

  readonly focusCards = [
    {
      title: 'Agenda del giorno',
      text: 'Vista rapida degli slot, ritardi e conferme prenotazione da gestire in reception.'
    },
    {
      title: 'Movimenti cassa',
      text: 'Controllo incassi, metodi di pagamento e chiusura operativa di fine giornata.'
    },
    {
      title: 'Magazzino attivo',
      text: 'Monitoraggio prodotti professionali, vendita retail e soglie minime di riordino.'
    }
  ];
}
