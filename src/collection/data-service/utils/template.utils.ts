import { DataServiceSchema } from '../data-service-schema';

export function getServiceTestTemplate(serviceName: string, options: DataServiceSchema): string {
  const servicePathParts = options.dataService.split('/');
  const servicePath = './' + servicePathParts[servicePathParts.length - 1].slice(0, -3);

  return `
import { TestBed } from '@angular/core/testing';
import { ${serviceName} } from '${servicePath}';

describe('${serviceName}', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  test('is created', () => {
    const service: ${serviceName} = TestBed.inject(${serviceName});
    expect(service).toBeTruthy();
  });
});
  `;
}
