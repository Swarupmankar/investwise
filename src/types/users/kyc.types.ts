export type KycDocType =
  | "PASSPORT_FRONT"
  | "PASSPORT_BACK"
  | "SELFIE_WITH_ID"
  | "UTILITY_BILL";

export type KycDocumentStatus = {
  uploaded?: boolean;
  status?: string;
  rejectionReason?: string | null;
};

export type KycDocumentsShape = {
  passportFront?: KycDocumentStatus;
  passportBack?: KycDocumentStatus;
  selfieWithId?: KycDocumentStatus;
  utilityBill?: KycDocumentStatus;
  address?: {
    submitted?: boolean;
    address?: any | null;
  };
};

export type KycStatusResponse = {
  data: {
    status: string; 
    documents: KycDocumentsShape;
  };
};
