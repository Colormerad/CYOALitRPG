import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { PlayerProgress } from '../../models/player-progress.model';
import { firstValueFrom } from 'rxjs';
import { BottomTabsComponent } from '../../components/bottom-tabs/bottom-tabs.component';

interface HistoryEntry {
  nodeTitle?: string;
  nodeId?: number;
  nodeContent?: string;
  choiceText?: string;
  choiceId?: number;
  timestamp?: string | number;
  raw?: any;
}

@Component({
  selector: 'app-last-time',
  standalone: true,
  imports: [CommonModule, BottomTabsComponent],
  templateUrl: './last-time.page.html',
  styleUrls: ['./last-time.page.scss']
})
export class LastTimePage implements OnInit {
  characterId!: number;
  loading = true;
  error: string | null = null;
  entries: HistoryEntry[] = [];
  showDebug = false;
  roleLabel: 'hero' | 'villain' | 'adventurer' = 'adventurer';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private db: DatabaseService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = Number(params['id']);
      if (!Number.isFinite(id)) {
        this.error = 'Invalid character id';
        this.loading = false;
        return;
      }
      this.characterId = id;
      this.load();
      this.loadRoleLabel();
    });
  }

  load(): void {
    this.loading = true;
    this.db.getPlayerProgress(this.characterId).subscribe({
      next: (progress: PlayerProgress) => {
        const hist = Array.isArray(progress?.choiceHistory) ? progress.choiceHistory : [];
        const last3 = hist.slice(-3);
        this.entries = last3.map((h: any): HistoryEntry => {
          // Support nested structures like { node: { id,title,content }, choice: { id,text } }
          const node = h.node || h.prompt || h.storyNode || h.story_node;
          const choice = h.choice || h.selected || h.option || h.selected_option;
          // Determine a nodeId. Prefer explicit node id; otherwise fall back to destination ids
          const nodeIdCandidate = (
            h.nodeId ?? h.node_id ?? h.nodeID ??
            h.currentNodeId ?? h.current_node_id ??
            h.fromNodeId ?? h.from_node_id ??
            h.promptId ?? h.prompt_id ??
            h.toNodeId ?? h.to_node_id ??
            h.nextNodeId ?? h.next_node_id ??
            h.nextPromptId ?? h.next_prompt_id ??
            node?.id
          );

          const entry: HistoryEntry = {
            nodeTitle: h.nodeTitle || h.node_title || h.title || h.promptTitle || h.prompt_title || node?.title || undefined,
            nodeId: nodeIdCandidate,
            nodeContent: node?.content,
            choiceText: h.choiceText || h.choice_text || h.text || h.selectedText || h.selected_text || h.optionText || h.option_text || h.choice || choice?.text || undefined,
            choiceId: (h.choiceId ?? h.choice_id ?? h.selectedChoiceId ?? h.selected_choice_id ?? h.selectedId ?? h.selected_id ?? choice?.id),
            timestamp: h.timestamp || h.time || h.date || undefined,
            raw: h
          };
          return entry;
        });
        this.populateNodeContent().finally(() => {
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('Failed to load progress for last-time:', err);
        this.error = 'Failed to load recent history';
        this.loading = false;
      }
    });
  }

  private async populateNodeContent(): Promise<void> {
    const tasks: Promise<void>[] = [];
    for (const entry of this.entries) {
      const task = (async () => {
        // 1) If we have a choiceId but no choiceText, fetch the choice
        if (entry.choiceId && !entry.choiceText) {
          try {
            const choice: any = await firstValueFrom(this.db.getChoice(entry.choiceId));
            entry.choiceText = choice?.choicetext || choice?.text || entry.choiceText;
            // If nodeId is missing, try to infer from the choice's story node id
            if (!entry.nodeId) {
              entry.nodeId = choice?.storynodeid ?? choice?.storyNodeId ?? entry.nodeId;
            }
          } catch (_) {}
        }

        // 2) If we still need node content/title and we have nodeId, fetch the node
        if (entry.nodeId && !entry.nodeContent) {
          try {
            const node = await firstValueFrom(this.db.getStoryNode(entry.nodeId));
            entry.nodeTitle = entry.nodeTitle || (node as any).title;
            entry.nodeContent = (node as any).content;
            // If choiceText still missing, try to match by choiceId from node choices
            if (!entry.choiceText && entry.choiceId && Array.isArray((node as any).choices)) {
              const found = (node as any).choices.find((c: any) => (c.id ?? c.choiceId ?? c.choice_id) === entry.choiceId);
              if (found) {
                entry.choiceText = found.text || found.choiceText || found.choicetext;
              }
            }
          } catch (_) {}
        }
      })();
      tasks.push(task);
    }
    await Promise.all(tasks);
  }

  toggleDebug(): void {
    this.showDebug = !this.showDebug;
  }

  backToGame(): void {
    this.router.navigate(['/game', this.characterId]);
  }

  private loadRoleLabel(): void {
    this.db.getCharacterProfile(this.characterId).subscribe({
      next: (profile: any) => {
        const good = Number(profile?.goodEvilAxis);
        if (Number.isFinite(good)) {
          if (good >= 75) {
            this.roleLabel = 'hero';
          } else if (good <= 25) {
            this.roleLabel = 'villain';
          } else {
            this.roleLabel = 'adventurer';
          }
        }
      },
      error: () => {
        // Keep default 'adventurer' on error
      }
    });
  }
}
