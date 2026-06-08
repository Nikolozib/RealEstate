import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Header } from './Components/shared/header/header';
import { Footer } from './Components/shared/footer/footer';
import * as AOS from 'aos';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => window.scrollTo(0, 0));
  }

  ngOnInit() {
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: true,
      offset: 80
    });
  }
}