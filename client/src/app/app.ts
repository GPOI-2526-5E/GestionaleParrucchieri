import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './features/navbar.component/navbar.component';
import { HomeBodyComponent } from './features/home-body.component/home-body.component';
import { AiChatDrawerComponent } from './features/ai-chat-drawer.component/ai-chat-drawer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, HomeBodyComponent, AiChatDrawerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('client');
}
