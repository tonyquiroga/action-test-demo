import { Component } from '@angular/core';
import { LanguageService } from '../services/language.service';
import { availableLocales } from 'src/env/available-locales';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})

export class HomeComponent {
  public title = $localize`HELLO`;
  public title2 = $localize`HELLO`;
  availableLanguages = availableLocales;
  chosenLanguage = this.languageService.language;
  mySubscription: any;

  constructor(private readonly languageService: LanguageService) {}

  changeLanguage({ target: { value } }: any) {
    this.languageService.language = value;
    window.location.reload();
  }
}
