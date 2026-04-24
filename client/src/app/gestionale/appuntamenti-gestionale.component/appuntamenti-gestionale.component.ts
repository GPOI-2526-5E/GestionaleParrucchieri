import { Component } from '@angular/core';
import { SidenavComponent } from '../sidenav.component/sidenav.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-appuntamenti-gestionale.component',
  standalone: true,
  imports: [CommonModule, SidenavComponent],
  templateUrl: './appuntamenti-gestionale.component.html',
  styleUrl: './appuntamenti-gestionale.component.css',
})
export class AppuntamentiGestionaleComponent {
  isSidenavCollapsed = false;

  toggleSidenav(): void {
    this.isSidenavCollapsed = !this.isSidenavCollapsed;
  }
}
