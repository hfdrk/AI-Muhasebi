"use client";

import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";

interface InvoiceLine {
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  vatRate: number;
  vatAmount: number;
}

interface InvoiceForm {
  lines: InvoiceLine[];
  totalAmount: number;
  taxAmount: number;
  netAmount?: number;
}

/**
 * Custom hook for invoice line and total calculations
 */
export function useInvoiceCalculations(form: UseFormReturn<InvoiceForm>) {
  const { watch, getValues, setValue } = form;
  const watchedLines = watch("lines");

  // Calculate totals when lines change
  const calculateTotals = () => {
    const currentLines = getValues("lines");
    let totalAmount = 0;
    let taxAmount = 0;

    currentLines.forEach((line) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      const vatRate = Number(line.vatRate) || 0;

      const lineTotal = quantity * unitPrice;
      const lineVat = lineTotal * vatRate;

      totalAmount += lineTotal + lineVat;
      taxAmount += lineVat;
    });

    setValue("totalAmount", totalAmount, { shouldValidate: false, shouldDirty: false });
    setValue("taxAmount", taxAmount, { shouldValidate: false, shouldDirty: false });
    setValue("netAmount", totalAmount - taxAmount, { shouldValidate: false, shouldDirty: false });
  };

  // Recalculate totals whenever lines change
  useEffect(() => {
    calculateTotals();
  }, [watchedLines]);

  const updateLineTotal = (index: number) => {
    const currentLines = getValues("lines");
    const line = currentLines[index];

    const quantity = Number(line?.quantity) || 0;
    const unitPrice = Number(line?.unitPrice) || 0;
    const vatRate = Number(line?.vatRate) || 0;

    const lineTotal = quantity * unitPrice;
    const vatAmount = lineTotal * vatRate;

    setValue(`lines.${index}.lineTotal`, lineTotal, { shouldValidate: false, shouldDirty: false });
    setValue(`lines.${index}.vatAmount`, vatAmount, { shouldValidate: false, shouldDirty: false });

    setTimeout(() => calculateTotals(), 10);
  };

  const updateFromRowTotal = (index: number, rowTotal: number) => {
    const currentLines = getValues("lines");
    const line = currentLines[index];

    const quantity = Number(line?.quantity) || 1;
    const vatRate = Number(line?.vatRate) || 0;

    const unitPrice = quantity > 0 ? rowTotal / quantity : 0;
    const vatAmount = rowTotal * vatRate;

    setValue(`lines.${index}.unitPrice`, unitPrice, { shouldValidate: false, shouldDirty: false });
    setValue(`lines.${index}.lineTotal`, rowTotal, { shouldValidate: false, shouldDirty: false });
    setValue(`lines.${index}.vatAmount`, vatAmount, { shouldValidate: false, shouldDirty: false });

    setTimeout(() => calculateTotals(), 10);
  };

  return {
    calculateTotals,
    updateLineTotal,
    updateFromRowTotal,
  };
}





