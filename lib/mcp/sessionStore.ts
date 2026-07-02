import Octane, { Params } from '../root/octane';
import { McpSessionError } from './errors';
import { OctaneClient, SessionDescriptor } from './types';

interface SessionEntry {
  descriptor: SessionDescriptor;
  client: OctaneClient;
}

export class OctaneSessionStore {
  private readonly sessions: Map<string, SessionEntry>;
  private readonly octaneFactory: (params: Params) => OctaneClient;

  constructor(octaneFactory?: (params: Params) => OctaneClient) {
    this.sessions = new Map<string, SessionEntry>();
    this.octaneFactory =
      octaneFactory !== undefined
        ? octaneFactory
        : (params: Params): OctaneClient => new Octane(params);
  }

  connect(sessionId: string, params: Params): SessionDescriptor {
    const client = this.octaneFactory(params);
    const descriptor: SessionDescriptor = {
      sessionId,
      server: params.server,
      sharedSpace: params.sharedSpace,
      workspace: params.workspace,
      authMode: params.token ? 'token' : 'credentials',
    };

    this.sessions.set(sessionId, { descriptor, client });
    return descriptor;
  }

  getClient(sessionId: string): OctaneClient {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new McpSessionError(`Session "${sessionId}" was not found`);
    }

    return session.client;
  }

  getDescriptor(sessionId: string): SessionDescriptor {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new McpSessionError(`Session "${sessionId}" was not found`);
    }

    return session.descriptor;
  }

  disconnect(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  list(): SessionDescriptor[] {
    return Array.from(this.sessions.values()).map((entry) => entry.descriptor);
  }
}
