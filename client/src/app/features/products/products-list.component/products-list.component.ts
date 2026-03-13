import { Component } from '@angular/core';
import { NavbarComponent } from '../../navbar.component/navbar.component';
import { AiChatDrawerComponent } from "../../ai-chat-drawer.component/ai-chat-drawer.component";
import { ProductCardComponent } from '../product-card.component/product-card.component';

@Component({
  selector: 'app-products-list.component',
  imports: [AiChatDrawerComponent, NavbarComponent, ProductCardComponent],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.css',
})
export class ProductsListComponent {

}
