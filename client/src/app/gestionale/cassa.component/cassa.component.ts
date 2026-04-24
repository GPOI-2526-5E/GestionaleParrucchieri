import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SidenavComponent } from '../sidenav.component/sidenav.component';

@Component({
  selector: 'app-cassa.component',
  standalone: true,
  imports: [CommonModule, SidenavComponent],
  templateUrl: './cassa.component.html',
  styleUrl: './cassa.component.css',
})
export class CassaComponent {
  isSidenavCollapsed = false;

  toggleSidenav(): void {
    this.isSidenavCollapsed = !this.isSidenavCollapsed;
  }
}
