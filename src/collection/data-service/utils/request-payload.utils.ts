import { normalize } from '@angular-devkit/core';
import { toClassName, toFileName } from '../../../utils/name.utils';

export function getRequestPayloadClass(name: string): string {
  return toClassName(name) + 'RequestPayload';
}

export function getRequestPayloadFileName(requestPayload: string): string {
  return toFileName(requestPayload.slice(0, -14)) + '.request-payload.ts';
}

export function getRequestPayloadPath(dataService: string, requestPayload: string): string {
  const requestPayloadFile = getRequestPayloadFileName(requestPayload);
  const dataServiceParts = dataService.split('/').slice(0, -2);

  return normalize(
    `${dataServiceParts.join('/')}/resources/request-payloads/${requestPayloadFile}`
  );
}
