import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SidenavComponent } from '../sidenav.component/sidenav.component';

@Component({
  selector: 'app-clienti.component',
  standalone: true,
  imports: [CommonModule, SidenavComponent],
  templateUrl: './clienti.component.html',
  styleUrl: './clienti.component.css',
})
export class ClientiComponent {
  isSidenavCollapsed = false;

  toggleSidenav(): void {
    this.isSidenavCollapsed = !this.isSidenavCollapsed;
  }
}
