import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SidenavComponent } from '../sidenav.component/sidenav.component';

@Component({
  selector: 'app-home.component',
  standalone: true,
  imports: [CommonModule, SidenavComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  readonly stats = [
    { label: 'Appuntamenti oggi', value: '18', trend: '+4 vs ieri' },
    { label: 'Incasso giornaliero', value: 'EUR 642', trend: '+12%' },
    { label: 'Prodotti in riordino', value: '7', trend: 'attenzione stock' },
    { label: 'Clienti in salone', value: '3', trend: '2 in attesa' }
  ];

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
