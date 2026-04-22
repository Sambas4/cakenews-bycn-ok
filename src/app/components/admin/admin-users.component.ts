import { Component, signal, computed, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { LucideAngularModule } from "lucide-angular";
import { UserData } from "../../types";
import { MOCK_USERS } from "../../data/mockData";

@Component({
  selector: "app-admin-users",
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="h-full flex flex-col bg-zinc-950 font-sans relative">
      <!-- HEADER RECHERCHE -->
      <div class="p-4 border-b border-zinc-800 bg-black">
        <div
          class="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800/50 text-zinc-500"
        >
          <lucide-icon name="filter" class="w-4 h-4"></lucide-icon>
          <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">
            RECHERCHE & FILTRES
          </h3>
        </div>

        <div class="relative">
          <lucide-icon
            name="search"
            class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
          ></lucide-icon>
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            [(ngModel)]="searchTerm"
            class="w-full bg-zinc-900 border border-zinc-800 py-3 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-colors rounded-none"
          />
        </div>

        <div class="flex justify-between mt-4">
          <div class="flex gap-2">
            @for (f of filters; track f) {
              <button
                (click)="filter.set(f)"
                class="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border"
                [ngClass]="
                  filter() === f
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'
                "
              >
                {{ f }}
              </button>
            }
          </div>
          <button
            (click)="handleOpenMessage(null)"
            class="px-4 py-1.5 bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest border border-zinc-700 hover:bg-zinc-700 flex items-center gap-2"
          >
            <lucide-icon name="megaphone" class="w-3 h-3"></lucide-icon>
            Broadcast
          </button>
        </div>
      </div>

      <!-- LISTE UTILISATEURS -->
      <div class="flex-1 overflow-y-auto pb-20 p-4">
        <div
          class="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800/50 text-zinc-500"
        >
          <lucide-icon name="list" class="w-4 h-4"></lucide-icon>
          <h3 class="text-[10px] font-black uppercase tracking-[0.2em]">
            ANALYSE D'ACTIVITÉ
          </h3>
        </div>

        <div class="divide-y divide-zinc-900">
          @for (user of filteredUsers(); track user.id) {
            <div
              class="py-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors group px-2 rounded-lg"
            >
              <div class="flex items-center gap-4 w-1/3">
                <div class="relative">
                  <img
                    [src]="user.avatar"
                    referrerpolicy="no-referrer"
                    class="w-12 h-12 rounded-full object-cover border-2"
                    [ngClass]="
                      user.status === 'BANNED'
                        ? 'border-red-600 grayscale'
                        : 'border-zinc-800'
                    "
                    alt=""
                  />
                  @if (user.role === "ADMIN") {
                    <div
                      class="absolute -bottom-1 -right-1 bg-white text-black p-1 rounded-full"
                    >
                      <lucide-icon
                        name="shield"
                        class="w-3 h-3 fill-current"
                      ></lucide-icon>
                    </div>
                  }
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-white truncate">{{
                      user.name
                    }}</span>
                  </div>
                  <span class="text-xs text-zinc-500 truncate block">{{
                    user.handle
                  }}</span>
                  <div class="flex items-center gap-2 mt-1">
                    <span
                      class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                      [ngClass]="{
                        'bg-emerald-500/20 text-emerald-500':
                          user.status === 'ACTIVE',
                        'bg-red-500/20 text-red-500': user.status === 'BANNED',
                        'bg-amber-500/20 text-amber-500':
                          user.status !== 'ACTIVE' && user.status !== 'BANNED',
                      }"
                    >
                      {{ user.status }}
                    </span>
                  </div>
                </div>
              </div>

              <div
                class="flex-1 flex justify-center gap-6 border-l border-r border-zinc-800/50 px-4"
              >
                <div class="flex flex-col items-center w-16">
                  <span class="text-xs font-black text-white">{{
                    user.stats?.likesGiven || 0
                  }}</span>
                  <span
                    class="text-[8px] text-zinc-500 uppercase flex items-center gap-1"
                    ><lucide-icon name="heart" class="w-2 h-2"></lucide-icon>
                    Donnés</span
                  >
                </div>
                <div class="flex flex-col items-center w-16">
                  <span class="text-xs font-black text-white">{{
                    user.stats?.commentsPosted || 0
                  }}</span>
                  <span
                    class="text-[8px] text-zinc-500 uppercase flex items-center gap-1"
                    ><lucide-icon
                      name="message-square"
                      class="w-2 h-2"
                    ></lucide-icon>
                    Posts</span
                  >
                </div>
                <div class="flex flex-col items-center w-16">
                  <span
                    class="text-xs font-black"
                    [ngClass]="
                      (user.stats?.reportsReceived || 0) > 0
                        ? 'text-red-500'
                        : 'text-zinc-600'
                    "
                    >{{ user.stats?.reportsReceived || 0 }}</span
                  >
                  <span
                    class="text-[8px] text-zinc-500 uppercase flex items-center gap-1"
                    ><lucide-icon
                      name="alert-triangle"
                      class="w-2 h-2"
                    ></lucide-icon>
                    Reports</span
                  >
                </div>
              </div>

              <div class="flex items-center gap-2 w-1/4 justify-end">
                <button
                  (click)="handleCertify(user)"
                  class="p-2 text-zinc-600 hover:text-yellow-500 transition-colors"
                  title="Certifier / Hall of Fame"
                >
                  <lucide-icon name="trophy" class="w-4 h-4"></lucide-icon>
                </button>
                <button
                  (click)="handleOpenMessage(user)"
                  class="p-2 text-zinc-600 hover:text-white transition-colors"
                >
                  <lucide-icon name="mail" class="w-4 h-4"></lucide-icon>
                </button>
                <button
                  (click)="toggleStatus(user.id)"
                  class="p-2 transition-colors"
                  [ngClass]="
                    user.status === 'BANNED'
                      ? 'text-emerald-500 hover:bg-emerald-500/10'
                      : 'text-red-500 hover:bg-red-500/10'
                  "
                >
                  @if (user.status === "BANNED") {
                    <lucide-icon
                      name="check-circle"
                      class="w-4 h-4"
                    ></lucide-icon>
                  } @else {
                    <lucide-icon name="ban" class="w-4 h-4"></lucide-icon>
                  }
                </button>
              </div>
            </div>
          }

          @if (filteredUsers().length === 0) {
            <div class="py-20 flex flex-col items-center text-zinc-600">
              <lucide-icon
                name="shield"
                class="w-12 h-12 mb-4 opacity-20"
              ></lucide-icon>
              <p class="text-xs font-mono uppercase">
                Aucun utilisateur trouvé
              </p>
            </div>
          }
        </div>
      </div>

      <!-- OVERLAY MESSAGE (NO ANIMATION) -->
      @if (showMessageForm()) {
        <div
          class="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
        >
          <div
            class="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl"
          >
            <h3
              class="text-sm font-black uppercase text-white mb-4 flex items-center gap-2"
            >
              <lucide-icon name="send" class="w-4 h-4"></lucide-icon>
              {{
                selectedUser()
                  ? "Message à " + selectedUser()?.handle
                  : "Broadcast Général"
              }}
            </h3>
            <textarea
              [(ngModel)]="messageContent"
              placeholder="Contenu du message système..."
              class="w-full h-32 bg-black border border-zinc-700 rounded-xl p-4 text-white text-sm font-bold outline-none resize-none mb-4 focus:border-white"
            ></textarea>
            <div class="flex gap-2">
              <button
                (click)="showMessageForm.set(false)"
                class="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-700"
              >
                Annuler
              </button>
              <button
                (click)="handleSend()"
                [disabled]="isSending()"
                class="flex-1 py-3 bg-white text-black rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200 disabled:opacity-50"
              >
                {{ isSending() ? "Envoi..." : "Envoyer" }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminUsersComponent {
  sendNotification = output<{ target: string; content: string }>();

  searchTerm = signal("");
  filter = signal<"ALL" | "ADMIN" | "BANNED">("ALL");
  users = signal<UserData[]>(MOCK_USERS);

  showMessageForm = signal(false);
  selectedUser = signal<UserData | null>(null);
  messageContent = signal("");
  isSending = signal(false);

  filters: ("ALL" | "ADMIN" | "BANNED")[] = ["ALL", "ADMIN", "BANNED"];

  filteredUsers = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const currentFilter = this.filter();

    return this.users().filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(search) ||
        user.handle.toLowerCase().includes(search);
      if (currentFilter === "ALL") return matchesSearch;
      if (currentFilter === "ADMIN")
        return (
          matchesSearch && (user.role === "ADMIN" || user.role === "MODERATOR")
        );
      if (currentFilter === "BANNED")
        return matchesSearch && user.status === "BANNED";
      return matchesSearch;
    });
  });

  handleBack(): boolean {
    if (this.showMessageForm()) {
      this.showMessageForm.set(false);
      return true;
    }
    return false;
  }

  toggleStatus(id: string) {
    this.users.update((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          return { ...u, status: u.status === "BANNED" ? "ACTIVE" : "BANNED" };
        }
        return u;
      }),
    );
  }

  handleOpenMessage(user: UserData | null) {
    this.selectedUser.set(user);
    this.showMessageForm.set(true);
  }

  handleCertify(user: UserData) {
    this.sendNotification.emit({
      target: user.handle,
      content: "FÉLICITATIONS ! Vous avez rejoint le Hall of Fame CakeNews.",
    });
    // In a real app, we would show a custom toast or modal here.
    // For now, we just emit the notification.
  }

  handleSend() {
    if (!this.messageContent().trim()) return;
    this.isSending.set(true);

    const target = this.selectedUser() ? this.selectedUser()!.handle : "ALL";

    setTimeout(() => {
      this.sendNotification.emit({ target, content: this.messageContent() });
      this.isSending.set(false);
      this.showMessageForm.set(false);
      this.messageContent.set("");
    }, 100);
  }
}
