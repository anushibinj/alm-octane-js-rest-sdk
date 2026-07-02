import { Params } from '../root/octane';

export interface QueryOptions {
  at?: number;
  limit?: number;
  offset?: number;
  fields?: string[];
  orderBy?: string[];
  query?: string;
  script?: boolean;
}

export interface OctaneClient {
  at(id: number): OctaneClient;
  limit(limit: number): OctaneClient;
  offset(offset: number): OctaneClient;
  fields(...fieldNames: string[]): OctaneClient;
  orderBy(...fieldNames: string[]): OctaneClient;
  query(query: string): OctaneClient;
  script(): OctaneClient;
  get(entityName: string): OctaneClient;
  create(entityName: string, body: object): OctaneClient;
  update(entityName: string, body: object): OctaneClient;
  updateBulk(entityName: string, body: object): OctaneClient;
  delete(entityName: string): OctaneClient;
  getAttachmentContent(): OctaneClient;
  uploadAttachment(
    attachmentName: string,
    attachmentData: object | string,
    ownerName: string,
    ownerReference: object
  ): OctaneClient;
  authenticate(): Promise<unknown>;
  signOut(): Promise<unknown>;
  executeCustomRequest(
    customUrl: string,
    operation: string,
    body?: object | string,
    headers?: object
  ): Promise<unknown>;
  execute(): Promise<unknown>;
}

export interface SessionDescriptor {
  sessionId: string;
  server: string;
  sharedSpace: number;
  workspace: number;
  authMode: 'token' | 'credentials';
}

export interface ConnectInput extends Params {
  sessionId: string;
}

export interface SessionStatusInput {
  sessionId: string;
}

export interface DisconnectInput {
  sessionId: string;
}

export interface GetInput {
  sessionId: string;
  entityName: string;
  options?: QueryOptions;
}

export interface CreateInput {
  sessionId: string;
  entityName: string;
  body: object;
  options?: QueryOptions;
}

export interface UpdateInput {
  sessionId: string;
  entityName: string;
  body: object;
  options?: QueryOptions;
}

export interface UpdateBulkInput {
  sessionId: string;
  entityName: string;
  body: object;
  options?: QueryOptions;
}

export interface DeleteInput {
  sessionId: string;
  entityName: string;
  options?: QueryOptions;
}

export interface GetAttachmentContentInput {
  sessionId: string;
  options: QueryOptions;
}

export interface UploadAttachmentInput {
  sessionId: string;
  attachmentName: string;
  attachmentDataBase64: string;
  ownerName: string;
  ownerReference: object;
}

export interface CustomRequestInput {
  sessionId: string;
  customUrl: string;
  operation: string;
  body?: object | string;
  headers?: object;
}
