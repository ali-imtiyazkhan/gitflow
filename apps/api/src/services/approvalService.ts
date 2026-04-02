import { v4 as uuidv4 } from 'uuid';
import type { ApprovalRequest } from '@gitflow/shared';

const store: Map<string, ApprovalRequest> = new Map();

export const approvalService = {
  create(params: Omit<ApprovalRequest, 'id' | 'status' | 'approvedBy' | 'createdAt' | 'updatedAt'>): ApprovalRequest {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const request: ApprovalRequest = {
      id,
      ...params,
      status: 'pending',
      approvedBy: [],
      createdAt: now,
      updatedAt: now,
    };
    
    store.set(id, request);
    return request;
  },

  forRepo(repoId: string): ApprovalRequest[] {
    return Array.from(store.values())
      .filter(a => a.repoId === repoId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getById(id: string): ApprovalRequest | undefined {
    return store.get(id);
  },

  approve(id: string, userId: string): ApprovalRequest | undefined {
    const request = store.get(id);
    if (!request || request.status !== 'pending') return undefined;

    if (!request.approvedBy.includes(userId)) {
      request.approvedBy.push(userId);
      request.updatedAt = new Date().toISOString();
      
      if (request.approvedBy.length >= request.requiredApprovals) {
        request.status = 'approved';
      }
    }
    
    return request;
  },

  reject(id: string, userId: string): ApprovalRequest | undefined {
    const request = store.get(id);
    if (!request || request.status !== 'pending') return undefined;

    request.status = 'rejected';
    request.updatedAt = new Date().toISOString();
    
    return request;
  },

  close(id: string): ApprovalRequest | undefined {
    const request = store.get(id);
    if (!request) return undefined;
    
    request.status = 'closed';
    request.updatedAt = new Date().toISOString();
    
    return request;
  }
};
