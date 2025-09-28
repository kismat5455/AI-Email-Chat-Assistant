import { Component } from '@angular/core';
import { EmailGeneratorComponent } from './email-generator/email-generator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EmailGeneratorComponent],
  template: '<app-email-generator></app-email-generator>',
  styles: []
})
export class App {}

