import { Injectable } from '@nestjs/common';

type ApprovalDecision = 'approve' | 'reject';

@Injectable()
export class ApprovalsService {
  buildDecisionNote(decision: ApprovalDecision, note?: string): string {
    const cleanNote = note?.trim();
    if (cleanNote) {
      return cleanNote;
    }

    return decision === 'approve' ? 'Task approved by supervisor' : 'Task rejected by supervisor';
  }
}
