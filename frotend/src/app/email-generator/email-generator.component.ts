import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface EmailRequest {
  emailContent: string;
  tone: string;
}

@Component({
  selector: 'app-email-generator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './email-generator.component.html',
  styleUrls: ['./email-generator.component.css']
})
export class EmailGeneratorComponent {
  private formBuilder = inject(FormBuilder);
  private http = inject(HttpClient);

  emailForm = this.formBuilder.group({
    emailContent: ['', Validators.required],
    tone: ['professional', Validators.required]
  });

  generatedEmail = signal<string | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  copySuccess = signal(false);

  tones = ['professional', 'casual', 'friendly', 'humorous', 'nervous', 'rude'];

  generateEmail() {
    if (this.emailForm.valid) {
      this.isLoading.set(true);
      this.error.set(null);
      this.generatedEmail.set(null);

      const emailRequest: EmailRequest = {
        emailContent: this.emailForm.value.emailContent || '',
        tone: this.emailForm.value.tone || 'professional'
      };

      this.http.post('http://localhost:8080/api/email/generate', emailRequest, { responseType: 'text' })
        .subscribe({
          next: (response) => {
            this.generatedEmail.set(response);
            this.isLoading.set(false);
          },
          error: (err) => {
            this.error.set('An error occurred while generating the email. Please try again.');
            this.isLoading.set(false);
            console.error(err);
          }
        });
    }
  }

  copyToClipboard(text: string | null) {
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.copySuccess.set(true);
        setTimeout(() => this.copySuccess.set(false), 2000);
      });
    }
  }
}
