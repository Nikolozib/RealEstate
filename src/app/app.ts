import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Header } from './Components/shared/header/header';
import { Footer } from './Components/shared/footer/footer';
import { ToastContainer } from './Components/shared/toast/toast';
import { Chatbot } from './Components/shared/chatbot/chatbot';
import { SeoService } from './core/services/seo';
import { initAos } from './core/utils/aos';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer, ToastContainer, Chatbot],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.setOrganizationData();

    if (!this.isBrowser) return;
    initAos({
      duration: 800,
      easing: 'ease-in-out',
      once: true,
      offset: 80
    });
  }
}
