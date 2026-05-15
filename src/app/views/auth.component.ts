import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { LucideAngularModule } from "lucide-angular";
import { AuthService } from "../services/auth.service";
import { Logger } from "../services/logger.service";
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

type AuthMode = "login" | "signup" | "forgot_password";

@Component({
  selector: "app-auth-view",
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactiveFormsModule],
  template: `
    <div
      class="w-full h-full bg-black flex flex-col items-center justify-center p-6 relative"
    >
      <div class="w-full max-w-sm text-center flex flex-col items-center gap-6">
        <h1
          class="text-4xl font-[1000] uppercase tracking-tighter text-white mb-2"
        >
          CAKENEWS
        </h1>

        <div
          *ngIf="!authService.isAuthReady()"
          class="text-white text-sm animate-pulse"
        >
          Chargement sécurisé...
        </div>

        <!-- Options de connexion -->
        <div
          *ngIf="authService.isAuthReady()"
          class="w-full flex flex-col gap-4"
        >
          <div
            *ngIf="errorMessage()"
            class="text-red-500 text-sm font-medium p-3 bg-red-500/10 rounded-xl border border-red-500/20"
          >
            {{ errorMessage() }}
          </div>

          <div
            *ngIf="successMessage()"
            class="text-emerald-500 text-sm font-medium p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
          >
            {{ successMessage() }}
          </div>

          <!-- Formulaire Email -->
          <form
            [formGroup]="authForm"
            (ngSubmit)="onSubmit()"
            class="flex flex-col gap-3 text-left"
          >
            <div class="flex flex-col">
              <label
                class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1"
                >Email</label
              >
              <input
                type="email"
                formControlName="email"
                placeholder="votre@email.com"
                class="bg-[#111] border border-[#333] rounded-xl p-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors w-full"
              />
            </div>

            <div class="flex flex-col" *ngIf="mode() !== 'forgot_password'">
              <label
                class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1"
                >Mot de passe</label
              >
              <input
                type="password"
                formControlName="password"
                placeholder="••••••••"
                class="bg-[#111] border border-[#333] rounded-xl p-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors w-full"
              />
            </div>

            <div class="flex justify-end mt-1" *ngIf="mode() === 'login'">
              <button
                type="button"
                (click)="setMode('forgot_password')"
                class="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="submit"
              [disabled]="authForm.invalid || isLoading()"
              class="w-full mt-2 py-4 bg-blue-600 text-white font-[1000] uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <lucide-icon
                *ngIf="isLoading()"
                name="loader-2"
                class="w-5 h-5 animate-spin"
              ></lucide-icon>
              {{
                mode() === "login"
                  ? "Se connecter"
                  : mode() === "signup"
                    ? "Créer un compte"
                    : "Réinitialiser"
              }}
            </button>
          </form>

          <div class="relative flex items-center py-4">
            <div class="flex-grow border-t border-zinc-800"></div>
            <span
              class="flex-shrink-0 mx-4 text-xs font-bold text-zinc-500 uppercase tracking-widest"
              >ou</span
            >
            <div class="flex-grow border-t border-zinc-800"></div>
          </div>

          <button
            (click)="loginWithGoogle()"
            [disabled]="isLoading()"
            class="flex items-center justify-center gap-3 w-full p-4 bg-white text-black font-[1000] uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              class="w-6 h-6"
              alt="Google"
            />
            <span>Google</span>
          </button>

          <div class="mt-4 text-center">
            <button
              *ngIf="mode() !== 'signup'"
              type="button"
              (click)="setMode('signup')"
              class="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Pas de compte ?
              <strong class="text-blue-400 hover:text-blue-300"
                >S'inscrire</strong
              >
            </button>
            <button
              *ngIf="mode() !== 'login'"
              type="button"
              (click)="setMode('login')"
              class="text-sm text-zinc-400 hover:text-white transition-colors mt-2"
            >
              Retour à
              <strong class="text-blue-400 hover:text-blue-300"
                >la connexion</strong
              >
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AuthViewComponent {
  public authService = inject(AuthService);
  private logger = inject(Logger);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string>("");
  successMessage = signal<string>("");

  mode = signal<AuthMode>("login");

  authForm = new FormGroup({
    email: new FormControl("", [Validators.required, Validators.email]),
    password: new FormControl("", [
      Validators.required,
      Validators.minLength(6),
    ]),
  });

  constructor() {
    this.updateFormValidation();
  }

  setMode(newMode: AuthMode) {
    this.mode.set(newMode);
    this.errorMessage.set("");
    this.successMessage.set("");
    this.authForm.reset();
    this.updateFormValidation();
  }

  updateFormValidation() {
    const passControl = this.authForm.get("password");
    if (this.mode() === "forgot_password") {
      passControl?.clearValidators();
    } else {
      passControl?.setValidators([
        Validators.required,
        Validators.minLength(6),
      ]);
    }
    passControl?.updateValueAndValidity();
  }

  async onSubmit() {
    if (this.authForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set("");
    this.successMessage.set("");

    const email = this.authForm.value.email!;
    const pass = this.authForm.value.password || "";

    try {
      if (this.mode() === "login") {
        await this.authService.loginWithEmail(email, pass);
      } else if (this.mode() === "signup") {
        await this.authService.signupWithEmail(email, pass);
        this.successMessage.set(
          "Inscription réussie. Vérifiez vos emails si nécessaire.",
        );
      } else if (this.mode() === "forgot_password") {
        await this.authService.resetPassword(email);
        this.successMessage.set("Un email de réinitialisation a été envoyé.");
        this.setMode("login");
      }
    } catch (e: any) {
      this.logger.error('auth.submit', e);
      if (e.message) {
        this.errorMessage.set(e.message);
      } else {
        this.errorMessage.set(
          "Une erreur s'est produite lors de l'authentification.",
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithGoogle() {
    this.isLoading.set(true);
    this.errorMessage.set("");

    try {
      await this.authService.loginWithGoogle();
    } catch (e: any) {
      this.logger.error('auth.googleLogin', e);
      this.errorMessage.set("Erreur de connexion via Google.");
    } finally {
      this.isLoading.set(false);
    }
  }

}
