import { McpValidationError } from './errors';
import { QueryOptions } from './types';

export function asObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new McpValidationError(`${path} must be an object`);
  }

  return value as Record<string, unknown>;
}

export function asString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new McpValidationError(`${path} must be a non-empty string`);
  }

  return value.trim();
}

export function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new McpValidationError(`${path} must be a number`);
  }

  return value;
}

export function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new McpValidationError(`${path} must be a boolean`);
  }

  return value;
}

export function asStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new McpValidationError(`${path} must be a non-empty array`);
  }

  return value.map((item, index) => asString(item, `${path}[${index}]`));
}

export function asOptionalStringArray(
  value: unknown,
  path: string
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return asStringArray(value, path);
}

export function asOptionalNumber(
  value: unknown,
  path: string
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return asNumber(value, path);
}

export function asOptionalString(
  value: unknown,
  path: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return asString(value, path);
}

export function asOptionalBoolean(
  value: unknown,
  path: string
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return asBoolean(value, path);
}

export function asQueryOptions(
  value: unknown,
  path: string,
  isRequired = false
): QueryOptions | undefined {
  if (value === undefined && !isRequired) {
    return undefined;
  }

  const source = asObject(value, path);
  const at = asOptionalNumber(source.at, `${path}.at`);
  const limit = asOptionalNumber(source.limit, `${path}.limit`);
  const offset = asOptionalNumber(source.offset, `${path}.offset`);
  const fields = asOptionalStringArray(source.fields, `${path}.fields`);
  const orderBy = asOptionalStringArray(source.orderBy, `${path}.orderBy`);
  const query = asOptionalString(source.query, `${path}.query`);
  const script = asOptionalBoolean(source.script, `${path}.script`);

  if (at !== undefined && at < 0) {
    throw new McpValidationError(`${path}.at must be >= 0`);
  }
  if (limit !== undefined && limit < 1) {
    throw new McpValidationError(`${path}.limit must be >= 1`);
  }
  if (offset !== undefined && offset < 0) {
    throw new McpValidationError(`${path}.offset must be >= 0`);
  }

  return { at, limit, offset, fields, orderBy, query, script };
}
