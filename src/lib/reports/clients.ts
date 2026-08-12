// Mapa entre o slug usado nas URLs do brain-marketing e o tenant
// correspondente no BrokerApps. Adicionar um novo cliente com integração
// Meta conectada é só uma linha nova aqui — nenhuma lógica nova.
export type ReportClientConfig = {
  tenantSlug: string;
  displayName: string;
};

export const REPORT_CLIENTS: Record<string, ReportClientConfig> = {
  "mv-imoveis": { tenantSlug: "mv-imoveis", displayName: "MV Imóveis" },
};
