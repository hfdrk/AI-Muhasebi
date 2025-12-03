export type LegalType = "Şahıs" | "Limited" | "Anonim" | "Kollektif" | "Komandit";

export interface ClientCompany {
  id: string;
  tenantId: string;
  name: string;
  legalType: LegalType;
  taxNumber: string;
  tradeRegistryNumber: string | null;
  sector: string | null;
  contactPersonName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  startDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientCompanyInput {
  name: string;
  legalType: LegalType;
  taxNumber: string;
  tradeRegistryNumber?: string | null;
  sector?: string | null;
  contactPersonName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  startDate?: Date | null;
  isActive?: boolean;
}

export interface UpdateClientCompanyInput {
  name?: string;
  legalType?: LegalType;
  tradeRegistryNumber?: string | null;
  sector?: string | null;
  contactPersonName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  startDate?: Date | null;
  isActive?: boolean;
}

