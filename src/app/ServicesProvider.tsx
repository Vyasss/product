import { useState, type ReactNode } from 'react';
import type { AppConfig } from '../config/env';
import { createCartStore, localCartStorage } from '../cart/cartStore';
import { createProductService } from '../data/createProductService';
import { templateProductContent } from '../data/productContent';
import { ServicesContext, type Services } from '../hooks/useServices';
import { createInMemorySearchEngine } from '../search/InMemorySearchEngine';
import { RuleBasedInterpreter } from '../smart-search/RuleBasedInterpreter';

/** The composition root: the one place that picks implementations for the UI's interfaces. */
export function createServices(config: AppConfig, locationSearch: string): Services {
  const { service, mockControls } = createProductService({
    apiBaseUrl: config.apiBaseUrl,
    mockFailRate: config.mockFailRate,
    locationSearch,
  });
  return {
    productService: service,
    cartStore: createCartStore(localCartStorage()),
    productContent: templateProductContent,
    createSearchEngine: createInMemorySearchEngine,
    queryInterpreter: config.smartSearch ? new RuleBasedInterpreter() : null,
    mockControls: config.enableMockControls ? mockControls : null,
  };
}

export interface ServicesProviderProps {
  config: AppConfig;
  /** Tests pass fakes; otherwise services are created once from `config`. */
  services?: Services;
  children: ReactNode;
}

export function ServicesProvider({ config, services, children }: ServicesProviderProps) {
  const [value] = useState(() => services ?? createServices(config, window.location.search));
  return <ServicesContext value={value}>{children}</ServicesContext>;
}
