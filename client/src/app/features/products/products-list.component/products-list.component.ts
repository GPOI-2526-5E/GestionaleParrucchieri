import { Component } from '@angular/core';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { AiChatDrawerComponent } from "../../ai-chat-drawer.component/ai-chat-drawer.component";


@Component({
  selector: 'app-products-list.component',
  imports: [AiChatDrawerComponent, NavbarComponent],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.css',
})
export class ProductsListComponent {

}
